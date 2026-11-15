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

export const listSmartLinks = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const filter = { affiliateId: req.user._id };
    const search = String(req.query.search || '').trim().slice(0, 100);
    if (search) filter.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const [items, total] = await Promise.all([
      SmartLink.find(filter).populate('saasProductId', 'name slug').populate('assignedTeamMemberId', 'name email subAffiliateCode status').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      SmartLink.countDocuments(filter),
    ]);
    return res.json({ items, page, limit, total, totalPages: Math.ceil(total / limit) });
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
    let assignedTeamMemberId = null;
    if (req.body.teamMemberId) {
      if (!isObjectId(req.body.teamMemberId)) throw badRequest('Invalid team member.');
      const member = await TeamMember.findOne({ _id: req.body.teamMemberId, managerAffiliateId: req.user._id, status: 'active' });
      if (!member) throw badRequest('Select an active team member from your team.');
      assignedTeamMemberId = member._id;
    }
    const item = await SmartLink.create({ affiliateId: req.user._id, name, code: await createUniqueSmartCode(), saasProductId, assignedTeamMemberId });
    await item.populate([{ path: 'saasProductId', select: 'name slug' }, { path: 'assignedTeamMemberId', select: 'name email subAffiliateCode status' }]);
    return res.status(201).json(item);
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
    const link = await SmartLink.findOne({ _id: req.params.id, affiliateId: req.user._id });
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
      if (!req.body.teamMemberId) link.assignedTeamMemberId = null;
      else {
        if (!isObjectId(req.body.teamMemberId)) throw badRequest('Invalid team member.');
        const member = await TeamMember.findOne({ _id: req.body.teamMemberId, managerAffiliateId: req.user._id, status: 'active' });
        if (!member) throw badRequest('Select an active team member from your team.');
        link.assignedTeamMemberId = member._id;
      }
    }
    await link.save();
    await link.populate([{ path: 'saasProductId', select: 'name slug' }, { path: 'assignedTeamMemberId', select: 'name email subAffiliateCode status' }]);
    return res.json(link);
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ message: error.message });
    console.error('Smartlink update error:', error.message);
    return res.status(500).json({ message: 'Failed to update smartlink.' });
  }
};

export const deleteSmartLink = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) throw badRequest('Invalid smartlink ID.');
    const result = await SmartLink.deleteOne({ _id: req.params.id, affiliateId: req.user._id });
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
