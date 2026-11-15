import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import CommissionLedger from '../models/CommissionLedger.js';
import Affiliate from '../models/Affiliate.js';
import EmailIdentity from '../models/EmailIdentity.js';
import Referral from '../models/Referral.js';
import SmartLink from '../models/SmartLink.js';
import TeamMember, { defaultTeamPermissions } from '../models/TeamMember.js';

const createSubCode = async () => {
  let code;
  do { code = `TEAM${randomBytes(4).toString('hex').toUpperCase()}`; } while (await TeamMember.exists({ subAffiliateCode: code }));
  return code;
};

const normalizePermissions = (input, actor, fallback = defaultTeamPermissions, existing = null) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Object.assign(new Error('Permissions must be an object.'), { status: 400 });
  const permissions = { ...fallback };
  if (actor.role === 'team_member') {
    for (const key of Object.keys(defaultTeamPermissions)) {
      if (key === 'canViewOwnSmartlinksOnly') permissions[key] = true;
      else if (actor.permissions?.[key] !== true && existing?.[key] !== true) permissions[key] = false;
    }
  }
  for (const key of Object.keys(defaultTeamPermissions)) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'boolean') throw Object.assign(new Error(`Permission ${key} must be true or false.`), { status: 400 });
    if (key === 'canViewOwnSmartlinksOnly' && input[key] === false && actor.role === 'team_member' && actor.permissions?.canViewOwnSmartlinksOnly === true) {
      throw Object.assign(new Error('You cannot grant access to all team smartlinks.'), { status: 403 });
    }
    if (actor.role === 'team_member' && input[key] && actor.permissions?.[key] !== true && existing?.[key] !== true) {
      throw Object.assign(new Error(`You cannot grant ${key} because you do not have it.`), { status: 403 });
    }
    permissions[key] = input[key];
  }
  if (permissions.canRequestPayouts && !permissions.canViewEarnings) {
    if (actor.role === 'team_member' && actor.permissions?.canViewEarnings !== true) throw Object.assign(new Error('You cannot grant payouts without earnings access.'), { status: 403 });
    permissions.canViewEarnings = true;
  }
  return permissions;
};

export const listTeamMembers = async (req, res) => {
  try {
    const managerAffiliateId = req.user.managerAffiliateId || req.user._id;
    const members = await TeamMember.find({ managerAffiliateId }).select('+passwordHash').sort({ createdAt: -1 }).lean();
    const ids = members.map((member) => member._id);
    if (!ids.length) return res.json({ items: [] });
    const [referralStats, commissionStats] = await Promise.all([
      Referral.aggregate([
        { $match: { teamMemberId: { $in: ids } } },
        { $group: { _id: '$teamMemberId', signups: { $sum: 1 }, conversions: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } } } },
      ]),
      CommissionLedger.aggregate([
        { $match: { teamMemberId: { $in: ids }, status: { $ne: 'refunded' } } },
        { $group: { _id: '$teamMemberId', revenue: { $sum: { $toDouble: '$amount' } } } },
      ]),
    ]);
    const referralsById = new Map(referralStats.map((row) => [String(row._id), row]));
    const revenueById = new Map(commissionStats.map((row) => [String(row._id), Number(row.revenue) || 0]));
    return res.json({ items: members.map((member) => {
      const result = { ...member, hasPassword: Boolean(member.passwordHash), permissions: { ...defaultTeamPermissions, ...(member.permissions || {}) } };
      delete result.passwordHash;
      result.stats = {
        signups: referralsById.get(String(member._id))?.signups || 0,
        conversions: referralsById.get(String(member._id))?.conversions || 0,
        revenue: req.user.permissions?.canViewEarnings === false ? 0 : Math.round(((revenueById.get(String(member._id)) || 0) + Number.EPSILON) * 100) / 100,
      };
      return result;
    }) });
  } catch (error) {
    console.error('Team list error:', error.message);
    return res.status(500).json({ message: 'Failed to load team members.' });
  }
};

export const createTeamMember = async (req, res) => {
  try {
    const managerAffiliateId = req.user.managerAffiliateId || req.user._id;
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!name || name.length > 100) return res.status(400).json({ message: 'Name is required and must be under 100 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ message: 'Password must be between 8 and 128 characters.' });
    const [affiliateExists, memberExists, identityExists] = await Promise.all([
      Affiliate.exists({ email }), TeamMember.exists({ email }), EmailIdentity.exists({ email }),
    ]);
    if (affiliateExists || memberExists || identityExists) return res.status(409).json({ message: 'An account with this email already exists.' });
    let member;
    const session = await mongoose.startSession();
    try {
      const permissions = normalizePermissions(req.body.permissions || defaultTeamPermissions, req.user);
      const subAffiliateCode = await createSubCode();
      await session.withTransaction(async () => {
        await EmailIdentity.create([{ email, role: 'team_member' }], { session });
        [member] = await TeamMember.create([{ managerAffiliateId, name, email, passwordHash: password, permissions, subAffiliateCode }], { session });
      });
    } catch (error) {
      throw error;
    } finally {
      await session.endSession();
    }
    const result = member.toObject();
    delete result.passwordHash;
    return res.status(201).json({ ...result, stats: { signups: 0, conversions: 0, revenue: 0 } });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    console.error('Team create error:', error.message);
    return res.status(500).json({ message: 'Failed to add team member.' });
  }
};

export const updateTeamMember = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid team member ID.' });
    const managerAffiliateId = req.user.managerAffiliateId || req.user._id;
    const member = await TeamMember.findOne({ _id: req.params.id, managerAffiliateId }).select('+passwordHash');
    if (!member) return res.status(404).json({ message: 'Team member not found.' });
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name || name.length > 100) return res.status(400).json({ message: 'Name is required and must be under 100 characters.' });
      member.name = name;
    }
    if (req.body.status !== undefined) {
      if (!['active', 'inactive'].includes(req.body.status)) return res.status(400).json({ message: 'Status must be active or inactive.' });
      member.status = req.body.status;
    }
    if (req.body.password !== undefined && req.body.password !== '') {
      const password = String(req.body.password);
      if (password.length < 8 || password.length > 128) return res.status(400).json({ message: 'Password must be between 8 and 128 characters.' });
      member.passwordHash = password;
    }
    if (!member.passwordHash && !member.isModified('passwordHash')) return res.status(400).json({ message: 'Set a password before saving access for this account.' });
    if (req.body.permissions !== undefined) {
      const existingPermissions = { ...defaultTeamPermissions, ...(member.permissions?.toObject?.() || {}) };
      member.permissions = normalizePermissions(req.body.permissions, req.user, existingPermissions, existingPermissions);
    }
    await member.save();
    if (member.status === 'inactive') await SmartLink.updateMany({ affiliateId: managerAffiliateId, assignedTeamMemberId: member._id }, { $set: { assignedTeamMemberId: null } });
    const result = member.toObject();
    result.hasPassword = Boolean(member.passwordHash);
    delete result.passwordHash;
    return res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error('Team update error:', error.message);
    return res.status(500).json({ message: 'Failed to update team member.' });
  }
};

export const deleteTeamMember = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid team member ID.' });
    const managerAffiliateId = req.user.managerAffiliateId || req.user._id;
    const member = await TeamMember.findOneAndUpdate(
      { _id: req.params.id, managerAffiliateId },
      { $set: { status: 'inactive' } },
      { new: true }
    );
    if (!member) return res.status(404).json({ message: 'Team member not found.' });
    await SmartLink.updateMany({ affiliateId: managerAffiliateId, assignedTeamMemberId: member._id }, { $set: { assignedTeamMemberId: null } });
    return res.status(204).end();
  } catch (error) {
    console.error('Team delete error:', error.message);
    return res.status(500).json({ message: 'Failed to remove team member.' });
  }
};
