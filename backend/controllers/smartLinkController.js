import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import Affiliate from '../models/Affiliate.js';
import AffiliateClick from '../models/AffiliateClick.js';
import SaasProduct from '../models/SaasProduct.js';
import SmartLink from '../models/SmartLink.js';
import TeamMember from '../models/TeamMember.js';

const badRequest = (message) => Object.assign(new Error(message), { status: 400 });
const makeCode = () => randomBytes(6).toString('base64url').slice(0, 8).toLowerCase();
const createUniqueSmartCode = async () => {
  let code;
  do { code = makeCode(); } while (await SmartLink.exists({ code }));
  return code;
};
const isObjectId = (value) => mongoose.isValidObjectId(value);
const ownerId = (user) => user.managerAffiliateId || user._id;
const ownSmartlinksOnly = (user) => user.role === 'team_member' && user.permissions?.canViewOwnSmartlinksOnly === true;
const sanitizeSmartLink = (item, user) => {
  const result = item?.toObject ? item.toObject() : { ...item };
  if (user.permissions?.canViewEarnings === false && result.stats) result.stats.revenue = '0';
  return result;
};

export const listSmartLinks = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    if (req.user.role === 'team_member' && !req.user.permissions?.canViewOverview && !req.user.permissions?.canCreateSmartlinks) {
      return res.status(403).json({ message: 'You do not have permission to view smartlinks.' });
    }
    const filter = { affiliateId: ownerId(req.user) };
    if (ownSmartlinksOnly(req.user)) filter.assignedTeamMemberId = req.user._id;
    const search = String(req.query.search || '').trim().slice(0, 100);
    if (search) filter.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const [items, total] = await Promise.all([
      SmartLink.find(filter).populate('saasProductId', 'name slug').populate('assignedTeamMemberId', 'name email subAffiliateCode status').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      SmartLink.countDocuments(filter),
    ]);
    return res.json({ items: items.map((item) => sanitizeSmartLink(item, req.user)), page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Smartlink list error:', error.message);
    return res.status(500).json({ message: 'Failed to load smartlinks.' });
  }
};

export const createSmartLink = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const { saasProductId } = req.body;
    if (!name || name.length > 100) throw badRequest('Campaign name is required and must be under 100 characters.');
    if (!isObjectId(saasProductId)) throw badRequest('A valid SaaS product is required.');
    const product = await SaasProduct.findOne({ _id: saasProductId, status: 'active' }).select('destinationUrl');
    if (!product) throw badRequest('Select an active SaaS product.');
    const managerAffiliateId = ownerId(req.user);
    if (req.user.role === 'affiliate' && !req.body.teamMemberId) throw badRequest('Choose a team member for this smartlink. Standalone smartlinks are not allowed.');
    if (req.user.role === 'team_member' && req.body.teamMemberId && String(req.body.teamMemberId) !== String(req.user._id)) throw badRequest('Team members can only create smartlinks assigned to themselves.');
    const assignedId = req.user.role === 'team_member' ? req.user._id : req.body.teamMemberId;
    if (!isObjectId(assignedId)) throw badRequest('A valid team member is required.');
    const member = await TeamMember.findOne({ _id: assignedId, managerAffiliateId, status: 'active' });
    if (!member) throw badRequest('Select an active team member from your team.');
    const assignedTeamMemberId = member._id;
    const item = await SmartLink.create({ affiliateId: managerAffiliateId, name, code: await createUniqueSmartCode(), saasProductId, assignedTeamMemberId });
    await item.populate([{ path: 'saasProductId', select: 'name slug' }, { path: 'assignedTeamMemberId', select: 'name email subAffiliateCode status' }]);
    return res.status(201).json(sanitizeSmartLink(item, req.user));
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ message: error.message });
    if (error.code === 11000) return res.status(409).json({ message: 'Please retry; a generated code conflicted.' });
    console.error('Smartlink create error:', error.message);
    return res.status(500).json({ message: 'Failed to create smartlink.' });
  }
};

export const updateSmartLink = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) throw badRequest('Invalid smartlink ID.');
    const filter = { _id: req.params.id, affiliateId: ownerId(req.user) };
    if (ownSmartlinksOnly(req.user)) filter.assignedTeamMemberId = req.user._id;
    const link = await SmartLink.findOne(filter);
    if (!link) return res.status(404).json({ message: 'Smartlink not found.' });
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name || name.length > 100) throw badRequest('Campaign name is required and must be under 100 characters.');
      link.name = name;
    }
    if (req.body.status !== undefined) {
      if (!['active', 'paused'].includes(req.body.status)) throw badRequest('Status must be active or paused.');
      link.status = req.body.status;
    }
    if (req.body.destinationUrl !== undefined) {
      const destinationUrl = String(req.body.destinationUrl).trim();
      let parsed;
      try { parsed = new URL(destinationUrl); } catch { throw badRequest('Enter a valid HTTP or HTTPS destination URL.'); }
      if (!['http:', 'https:'].includes(parsed.protocol)) throw badRequest('Destination URL must use HTTP or HTTPS.');
      link.destinationUrl = destinationUrl;
    }
    if (req.body.teamMemberId !== undefined) {
      if (!req.body.teamMemberId || !isObjectId(req.body.teamMemberId)) throw badRequest('A team member assignment is required.');
      if (req.user.role === 'team_member' && String(req.body.teamMemberId) !== String(req.user._id)) throw badRequest('Team members can only assign smartlinks to themselves.');
      const member = await TeamMember.findOne({ _id: req.body.teamMemberId, managerAffiliateId: ownerId(req.user), status: 'active' });
      if (!member) throw badRequest('Select an active team member from your team.');
      link.assignedTeamMemberId = member._id;
    }
    await link.save();
    await link.populate([{ path: 'saasProductId', select: 'name slug' }, { path: 'assignedTeamMemberId', select: 'name email subAffiliateCode status' }]);
    return res.json(sanitizeSmartLink(link, req.user));
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ message: error.message });
    console.error('Smartlink update error:', error.message);
    return res.status(500).json({ message: 'Failed to update smartlink.' });
  }
};

export const deleteSmartLink = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) throw badRequest('Invalid smartlink ID.');
    const filter = { _id: req.params.id, affiliateId: ownerId(req.user) };
    if (ownSmartlinksOnly(req.user)) filter.assignedTeamMemberId = req.user._id;
    const result = await SmartLink.deleteOne(filter);
    return result.deletedCount ? res.status(204).end() : res.status(404).json({ message: 'Smartlink not found.' });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: 'Failed to delete smartlink.' });
  }
};

export const redirectSmartLink = async (req, res) => {
  try {
    const link = await SmartLink.findOne({ code: String(req.params.code).toLowerCase(), status: 'active' }).populate('saasProductId').populate('assignedTeamMemberId');
    const product = link?.saasProductId;
    const member = link?.assignedTeamMemberId?.status === 'active' ? link.assignedTeamMemberId : null;
    if (!link || !product || product.status !== 'active') return res.status(404).send('Smartlink not found or inactive.');
    const affiliate = await Affiliate.findById(link.affiliateId).select('affiliateCode');
    if (!affiliate) return res.status(404).send('Smartlink not found.');
    const refCode = member ? `${affiliate.affiliateCode}.${member.subAffiliateCode}` : affiliate.affiliateCode;
    const destination = new URL(link.destinationUrl || product.destinationUrl);
    destination.searchParams.set(product.refParamKey || 'ref', refCode);
    destination.searchParams.set('sl', link.code);
    const results = await Promise.allSettled([
      SmartLink.updateOne({ _id: link._id }, { $inc: { 'stats.clicks': 1 } }),
      Affiliate.updateOne({ _id: affiliate._id }, { $inc: { totalClicks: 1 } }),
      AffiliateClick.create({ affiliateId: affiliate._id, saasProductId: product._id, smartLinkId: link._id, teamMemberId: member?._id || null, ipAddress: req.ip || '', userAgent: req.get('user-agent') || '', referer: req.get('referer') || '', timestamp: new Date() }),
    ]);
    for (const result of results) if (result.status === 'rejected') console.error('Smartlink click logging failed:', result.reason?.message);
    return res.redirect(302, destination.toString());
  } catch (error) {
    console.error('Smartlink redirect error:', error.message);
    return res.status(503).send('Smartlink is temporarily unavailable.');
  }
};
