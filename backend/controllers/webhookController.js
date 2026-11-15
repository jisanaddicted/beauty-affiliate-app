import mongoose from 'mongoose';
import { createHash, timingSafeEqual } from 'node:crypto';
import Affiliate from '../models/Affiliate.js';
import CommissionLedger from '../models/CommissionLedger.js';
import Referral from '../models/Referral.js';
import SaasProduct from '../models/SaasProduct.js';
import SmartLink from '../models/SmartLink.js';
import TeamMember from '../models/TeamMember.js';
import { commissionUnlockTime, decimalFrom } from '../services/commissionService.js';

const secureEquals = (left, right) => {
  const leftHash = createHash('sha256').update(String(left)).digest();
  const rightHash = createHash('sha256').update(String(right)).digest();
  return timingSafeEqual(leftHash, rightHash);
};

const webhookError = (status, message) => Object.assign(new Error(message), { status });

const verifyWebhook = (req, product) => {
  const providedSecret = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  return Boolean(providedSecret && product.webhookSecret && secureEquals(providedSecret, product.webhookSecret));
};

const resolveAttribution = async (product, payload, session) => {
  const rawCode = String(payload.ref_code || '').trim().toUpperCase();
  const [affiliateCode, ...suffixParts] = rawCode.split('.');
  const subAffiliateCode = suffixParts.join('.');
  if (!affiliateCode) throw webhookError(400, 'ref_code is required.');
  const affiliate = await Affiliate.findOne({ affiliateCode }).session(session).lean();
  if (!affiliate) throw webhookError(404, 'Affiliate referral code was not found.');
  if ((affiliate.status || 'approved') !== 'approved') throw webhookError(403, 'This affiliate account is not approved to receive referrals.');

  let teamMember = null;
  if (subAffiliateCode) {
    teamMember = await TeamMember.findOne({ managerAffiliateId: affiliate._id, subAffiliateCode }).session(session);
    if (!teamMember) throw webhookError(404, 'Team member tracking code was not found.');
  }

  let smartLink = null;
  const smartLinkCode = String(payload.smartlink_code || '').trim().toLowerCase();
  if (smartLinkCode) {
    smartLink = await SmartLink.findOne({ code: smartLinkCode, affiliateId: affiliate._id, saasProductId: product._id }).session(session);
    if (!smartLink) throw webhookError(404, 'Smartlink attribution code was not found for this product.');
    if (smartLink.assignedTeamMemberId) {
      const assignedMember = await TeamMember.findOne({ _id: smartLink.assignedTeamMemberId, managerAffiliateId: affiliate._id }).session(session);
      if (!assignedMember) throw webhookError(409, 'The smartlink team assignment is no longer active.');
      if (teamMember && String(teamMember._id) !== String(assignedMember._id)) throw webhookError(400, 'Referral code does not match the smartlink team assignment.');
      teamMember = assignedMember;
    }
  }
  return { affiliate, teamMember, smartLink };
};

const handleSignup = async (product, payload) => {
  const refCode = String(payload.ref_code || '').trim();
  const referredUserId = String(payload.referred_user_id || '').trim();
  if (!refCode || !referredUserId) throw webhookError(400, 'ref_code and referred_user_id are required.');
  if (referredUserId.length > 200) throw webhookError(400, 'referred_user_id is too long.');

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const existing = await Referral.findOne({ saasProductId: product._id, referredUserId }).session(session);
      if (existing) {
        result = { duplicate: true, referralId: existing._id };
        return;
      }

      const { affiliate, teamMember, smartLink } = await resolveAttribution(product, payload, session);

      const [referral] = await Referral.create([{
        affiliateId: affiliate._id,
        saasProductId: product._id,
        smartLinkId: smartLink?._id || null,
        teamMemberId: teamMember?._id || null,
        referredUserId,
        status: 'signed_up',
      }], { session });

      const holdingPeriodDays = product.holdingPeriodDays || 0;
      const unlocksAt = product.requirePurchaseToUnlock === false
        ? (commissionUnlockTime(holdingPeriodDays) || new Date())
        : null;
      const bountyStatus = 'locked';

      await CommissionLedger.create([{
        affiliateId: affiliate._id,
        saasProductId: product._id,
        teamMemberId: teamMember?._id || null,
        referralId: referral._id,
        referredUserId,
        type: 'signup_bounty',
        amount: decimalFrom(product.signupBountyAmount?.toString?.() || 0),
        status: bountyStatus,
        unlocksAt,
        idempotencyKey: `signup:${product._id}:${referredUserId}`,
      }], { session });

      if (smartLink) await SmartLink.updateOne({ _id: smartLink._id }, { $inc: { 'stats.signups': 1 } }, { session });

      result = { duplicate: false, referralId: referral._id, status: bountyStatus };
    });
    return result;
  } finally {
    await session.endSession();
  }
};

const handlePurchase = async (product, payload) => {
  const referredUserId = String(payload.referred_user_id || '').trim();
  const planId = String(payload.plan_id || '').trim();
  const amountPaid = Number(payload.amount_paid);
  if (!referredUserId || !planId || payload.amount_paid === undefined || !Number.isFinite(amountPaid) || amountPaid <= 0) {
    throw webhookError(400, 'referred_user_id, plan_id, and a positive amount_paid are required.');
  }
  if (referredUserId.length > 200) throw webhookError(400, 'referred_user_id is too long.');

  const plan = product.planTiers.find((tier) => tier.planId === planId);
  if (!plan) throw webhookError(400, 'The supplied plan_id is not configured for this SaaS product.');

  const eventIdentity = String(payload.event_id || payload.purchase_id || '').trim()
    || createHash('sha256').update(`${referredUserId}|${planId}|${amountPaid}`).digest('hex');
  const idempotencyKey = `purchase:${product._id}:${eventIdentity}`;
  const planValue = Number(plan.commissionValue.toString());
  const commissionAmount = plan.commissionType === 'percentage'
    ? (amountPaid * planValue) / 100
    : planValue;
  if (!Number.isFinite(commissionAmount) || commissionAmount < 0) {
    throw webhookError(400, 'Configured plan commission is invalid.');
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const existingCommission = await CommissionLedger.findOne({ idempotencyKey }).session(session);
      if (existingCommission) {
        result = { duplicate: true, commissionId: existingCommission._id };
        return;
      }

      const referral = await Referral.findOne({ saasProductId: product._id, referredUserId }).session(session);
      if (!referral) throw webhookError(404, 'No signup referral exists for this referred user.');
      const affiliate = await Affiliate.findById(referral.affiliateId).select('status').session(session).lean();
      if (!affiliate || (affiliate.status || 'approved') !== 'approved') throw webhookError(403, 'This affiliate account is not approved to receive commissions.');

      const now = new Date();
      const unlocksAt = commissionUnlockTime(product.holdingPeriodDays || 0, now);
      const commissionStatus = unlocksAt ? 'pending_maturation' : 'available';

      await CommissionLedger.updateMany(
        {
          saasProductId: product._id,
          referredUserId,
          type: 'signup_bounty',
          status: 'locked',
        },
        { $set: { status: unlocksAt ? 'pending_maturation' : 'available', unlocksAt } },
        { session }
      );

      referral.status = 'converted';
      await referral.save({ session });

      const [commission] = await CommissionLedger.create([{
        affiliateId: referral.affiliateId,
        saasProductId: product._id,
        teamMemberId: referral.teamMemberId || null,
        referralId: referral._id,
        referredUserId,
        type: 'plan_purchase',
        planId,
        amount: decimalFrom(commissionAmount),
        status: commissionStatus,
        unlocksAt,
        idempotencyKey,
      }], { session });

      if (referral.smartLinkId) {
        await SmartLink.updateOne({ _id: referral.smartLinkId }, { $inc: { 'stats.conversions': 1, 'stats.revenue': decimalFrom(amountPaid) } }, { session });
      }

      result = { duplicate: false, commissionId: commission._id, status: commissionStatus };
    });
    return result;
  } finally {
    await session.endSession();
  }
};

export const ingestSaasWebhook = async (req, res) => {
  let product;
  try {
    product = await SaasProduct.findOne({ slug: req.params.slug }).select('+webhookSecret');
  } catch (error) {
    console.error('SaaS webhook product lookup failed:', error.message);
    return res.status(500).json({ message: 'Webhook processing failed.' });
  }
  if (!product) return res.status(404).json({ message: 'SaaS product webhook was not found.' });
  if (!verifyWebhook(req, product)) return res.status(401).json({ message: 'Invalid webhook credentials.' });

  try {
    let result;
    if (req.body?.event === 'signup') {
      if (product.status !== 'active') throw webhookError(409, 'This SaaS product is not accepting new referrals.');
      result = await handleSignup(product, req.body);
    } else if (req.body?.event === 'purchase') {
      result = await handlePurchase(product, req.body);
    } else {
      throw webhookError(400, 'event must be either signup or purchase.');
    }

    return res.status(200).json({ received: true, ...result });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({ received: true, duplicate: true });
    }
    console.error('SaaS webhook processing failed:', error.message);
    return res.status(error.status || 500).json({ message: error.status ? error.message : 'Webhook processing failed.' });
  }
};
