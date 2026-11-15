import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import CommissionLedger from '../models/CommissionLedger.js';
import Referral from '../models/Referral.js';
import SmartLink from '../models/SmartLink.js';
import TeamMember from '../models/TeamMember.js';

const createSubCode = async () => {
  let code;
  do { code = `TEAM${randomBytes(4).toString('hex').toUpperCase()}`; } while (await TeamMember.exists({ subAffiliateCode: code }));
  return code;
};

export const listTeamMembers = async (req, res) => {
  try {
    const members = await TeamMember.find({ managerAffiliateId: req.user._id }).sort({ createdAt: -1 }).lean();
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
    return res.json({ items: members.map((member) => ({
      ...member,
      stats: {
        signups: referralsById.get(String(member._id))?.signups || 0,
        conversions: referralsById.get(String(member._id))?.conversions || 0,
        revenue: Math.round(((revenueById.get(String(member._id)) || 0) + Number.EPSILON) * 100) / 100,
      },
    })) });
  } catch (error) {
    console.error('Team list error:', error.message);
    return res.status(500).json({ message: 'Failed to load team members.' });
  }
};

export const createTeamMember = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!name || name.length > 100) return res.status(400).json({ message: 'Name is required and must be under 100 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ message: 'Enter a valid email address.' });
    const member = await TeamMember.create({ managerAffiliateId: req.user._id, name, email, subAffiliateCode: await createSubCode() });
    return res.status(201).json({ ...member.toObject(), stats: { signups: 0, conversions: 0, revenue: 0 } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A team member with this email already exists.' });
    console.error('Team create error:', error.message);
    return res.status(500).json({ message: 'Failed to add team member.' });
  }
};

export const updateTeamMember = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid team member ID.' });
    if (!['active', 'inactive'].includes(req.body.status)) return res.status(400).json({ message: 'Status must be active or inactive.' });
    const member = await TeamMember.findOneAndUpdate(
      { _id: req.params.id, managerAffiliateId: req.user._id },
      { $set: { status: req.body.status } },
      { new: true, runValidators: true }
    );
    if (!member) return res.status(404).json({ message: 'Team member not found.' });
    if (member.status === 'inactive') {
      await SmartLink.updateMany({ affiliateId: req.user._id, assignedTeamMemberId: member._id }, { $set: { assignedTeamMemberId: null } });
    }
    return res.json(member);
  } catch (error) {
    console.error('Team update error:', error.message);
    return res.status(500).json({ message: 'Failed to update team member.' });
  }
};

export const deleteTeamMember = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid team member ID.' });
    const member = await TeamMember.findOneAndUpdate(
      { _id: req.params.id, managerAffiliateId: req.user._id },
      { $set: { status: 'inactive' } },
      { new: true }
    );
    if (!member) return res.status(404).json({ message: 'Team member not found.' });
    await SmartLink.updateMany({ affiliateId: req.user._id, assignedTeamMemberId: member._id }, { $set: { assignedTeamMemberId: null } });
    return res.status(204).end();
  } catch (error) {
    console.error('Team delete error:', error.message);
    return res.status(500).json({ message: 'Failed to remove team member.' });
  }
};
