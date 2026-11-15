import Referral from '../models/Referral.js';
import CommissionLedger from '../models/CommissionLedger.js';
import { getAffiliateCommissionSummary, processMaturedCommissions } from '../services/commissionService.js';
import Affiliate from '../models/Affiliate.js';
import AffiliateClick from '../models/AffiliateClick.js';

export const getAffiliateDashboard = async (req, res) => {
  try {
    const managerAffiliateId = req.user.managerAffiliateId || req.user._id;
    const isTeamMember = req.user.role === 'team_member';
    const manager = isTeamMember ? await Affiliate.findById(managerAffiliateId).select('affiliateCode').lean() : null;
    const stats = isTeamMember && req.user.permissions?.canViewOverview !== false ? await Promise.all([
      AffiliateClick.countDocuments({ affiliateId: managerAffiliateId, teamMemberId: req.user._id }),
      Referral.aggregate([
        { $match: { affiliateId: managerAffiliateId, teamMemberId: req.user._id } },
        { $group: { _id: null, signups: { $sum: 1 }, conversions: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } } } },
      ]),
    ]) : null;
    const referralStats = stats?.[1]?.[0] || { signups: 0, conversions: 0 };
    return res.json({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      affiliateCode: isTeamMember ? manager?.affiliateCode : req.user.affiliateCode,
      totalClicks: isTeamMember ? (stats?.[0] || 0) : req.user.totalClicks || 0,
      subAffiliateCode: isTeamMember ? req.user.subAffiliateCode : undefined,
      stats: req.user.permissions?.canViewOverview === false ? { signups: 0, conversions: 0 } : { signups: referralStats.signups, conversions: referralStats.conversions },
      role: req.user.role,
      managerAffiliateId: req.user.managerAffiliateId,
      permissions: req.user.permissions,
      createdAt: req.user.createdAt,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load affiliate profile.' });
  }
};

export const getAffiliateSummary = async (req, res) => {
  try {
    const summary = await getAffiliateCommissionSummary(req.user.managerAffiliateId || req.user._id, null, { teamMemberId: req.user.role === 'team_member' ? req.user._id : undefined });
    return res.json(summary);
  } catch (error) {
    console.error('Affiliate summary error:', error.message);
    return res.status(500).json({ message: 'Failed to calculate affiliate summary.' });
  }
};

const maskUserId = (value) => {
  if (value.length <= 8) return `${value.slice(0, 2)}…`;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
};

export const getAffiliateActivity = async (req, res) => {
  try {
    await processMaturedCommissions();
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const affiliateId = req.user.managerAffiliateId || req.user._id;
    const scope = req.user.role === 'team_member' && req.user.permissions?.canViewOwnSmartlinksOnly ? { teamMemberId: req.user._id } : {};
    const filter = { affiliateId, ...scope };

    const [referrals, total] = await Promise.all([
      Referral.find(filter)
        .populate('saasProductId', 'name slug')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Referral.countDocuments(filter),
    ]);

    const referralIds = referrals.map((referral) => referral._id);
    const commissions = referralIds.length
      ? await CommissionLedger.find({ affiliateId, ...scope, referralId: { $in: referralIds } }).sort({ createdAt: 1 })
      : [];
    const commissionMap = new Map();
    for (const commission of commissions) {
      const list = commissionMap.get(String(commission.referralId)) || [];
      list.push(commission);
      commissionMap.set(String(commission.referralId), list);
    }

    const items = referrals.map((referral) => {
      const entries = commissionMap.get(String(referral._id)) || [];
      const visibleEntries = entries.filter((entry) => entry.status !== 'refunded');
      let status = 'Signed Up - Locked';
      if (entries.some((entry) => entry.status === 'paid')) status = 'Paid';
      else if (entries.some((entry) => entry.status === 'available')) status = 'Available';
      else if (entries.some((entry) => entry.status === 'pending_maturation')) status = 'Subscribed - Pending Clearance';

      const unlocksAt = entries
        .filter((entry) => entry.unlocksAt)
        .map((entry) => entry.unlocksAt)
        .sort((a, b) => a - b)[0] || null;
      const earnedAmount = visibleEntries.reduce((sum, entry) => sum + Number(entry.amount.toString()), 0);

      return {
        id: referral._id,
        referredUserId: maskUserId(referral.referredUserId),
        saasProduct: referral.saasProductId?.name || 'SaaS product',
        status,
        earnedAmount: req.user.permissions?.canViewEarnings === false ? 0 : Math.round((earnedAmount + Number.EPSILON) * 100) / 100,
        createdAt: referral.createdAt,
        unlocksAt,
      };
    });

    return res.json({ items, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Affiliate activity error:', error.message);
    return res.status(500).json({ message: 'Failed to load referral activity.' });
  }
};
