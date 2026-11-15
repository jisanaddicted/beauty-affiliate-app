import mongoose from 'mongoose';
import AffiliateClick from '../models/AffiliateClick.js';
import CommissionLedger from '../models/CommissionLedger.js';
import Referral from '../models/Referral.js';
import SaasProduct from '../models/SaasProduct.js';
import SmartLink from '../models/SmartLink.js';
import TeamMember from '../models/TeamMember.js';

const badRequest = (message) => Object.assign(new Error(message), { status: 400 });
const dateValue = (raw, isEnd) => {
  if (!raw) return null;
  const input = String(raw);
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) throw badRequest('Dates must be valid ISO dates.');
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    if (isEnd) date.setUTCHours(23, 59, 59, 999);
    else date.setUTCHours(0, 0, 0, 0);
  }
  return date;
};

const sortFields = new Set(['name', 'clicks', 'uniqueVisitors', 'signups', 'conversions', 'conversionRate', 'totalEarnings']);
const ownerId = (user) => user.managerAffiliateId || user._id;

export const getSmartlinkPerformance = async (req, res) => {
  try {
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setUTCHours(0, 0, 0, 0);
    defaultStart.setUTCDate(defaultStart.getUTCDate() - 29);
    const startDate = dateValue(req.query.startDate, false) || defaultStart;
    const endDate = dateValue(req.query.endDate, true) || now;
    if (startDate > endDate) throw badRequest('startDate must be earlier than or equal to endDate.');

    const managerAffiliateId = new mongoose.Types.ObjectId(ownerId(req.user));
    let teamMemberId = null;
    if (req.user.role === 'team_member' && req.user.permissions?.canViewOwnSmartlinksOnly === true) {
      teamMemberId = new mongoose.Types.ObjectId(req.user._id);
      if (req.query.teamMemberId && req.query.teamMemberId !== 'all' && String(req.query.teamMemberId) !== String(teamMemberId)) {
        throw Object.assign(new Error('You can only view your own smartlink performance.'), { status: 403 });
      }
    } else if (req.query.teamMemberId && req.query.teamMemberId !== 'all') {
      if (!mongoose.isValidObjectId(req.query.teamMemberId)) throw badRequest('teamMemberId must be a valid team member ID or all.');
      const member = await TeamMember.exists({ _id: req.query.teamMemberId, managerAffiliateId });
      if (!member) throw badRequest('Team member was not found under this affiliate.');
      teamMemberId = new mongoose.Types.ObjectId(req.query.teamMemberId);
    }

    let saasProductId = null;
    if (req.query.saasProductId && req.query.saasProductId !== 'all') {
      if (!mongoose.isValidObjectId(req.query.saasProductId)) throw badRequest('saasProductId must be a valid product ID or all.');
      saasProductId = new mongoose.Types.ObjectId(req.query.saasProductId);
    }

    const filter = { affiliateId: managerAffiliateId };
    if (teamMemberId) filter.assignedTeamMemberId = teamMemberId;
    if (saasProductId) filter.saasProductId = saasProductId;
    const links = await SmartLink.find(filter)
      .populate('saasProductId', 'name slug')
      .populate('assignedTeamMemberId', 'name email subAffiliateCode status')
      .lean();
    const linkIds = links.map((link) => link._id);

    let clickRows = [];
    let signupRows = [];
    let conversionRows = [];
    let earningsRows = [];
    let uniqueVisitorRows = [];
    if (linkIds.length) {
      const eventBase = { affiliateId: managerAffiliateId, smartLinkId: { $in: linkIds } };
      const clickMatch = { ...eventBase, timestamp: { $gte: startDate, $lte: endDate } };
      if (saasProductId) clickMatch.saasProductId = saasProductId;
      if (teamMemberId) clickMatch.teamMemberId = teamMemberId;
      const referralMatch = { ...eventBase, createdAt: { $gte: startDate, $lte: endDate } };
      if (saasProductId) referralMatch.saasProductId = saasProductId;
      if (teamMemberId) referralMatch.teamMemberId = teamMemberId;

      const ledgerPipeline = (typeFilter = {}) => [
        { $match: { affiliateId: managerAffiliateId, createdAt: { $gte: startDate, $lte: endDate }, status: { $ne: 'refunded' }, ...typeFilter, ...(saasProductId ? { saasProductId } : {}), ...(teamMemberId ? { teamMemberId } : {}) } },
        { $lookup: { from: 'referrals', localField: 'referralId', foreignField: '_id', as: 'referral' } },
        { $unwind: '$referral' },
        { $match: { 'referral.affiliateId': managerAffiliateId, 'referral.smartLinkId': { $in: linkIds } } },
      ];

      const tasks = [
        AffiliateClick.aggregate([
          { $match: clickMatch },
          { $group: { _id: '$smartLinkId', clicks: { $sum: 1 }, visitors: { $addToSet: { $cond: [{ $ne: ['$ipAddress', ''] }, '$ipAddress', null] } } } },
          { $project: { clicks: 1, uniqueVisitors: { $size: { $setDifference: ['$visitors', [null]] } } } },
        ]),
        AffiliateClick.aggregate([
          { $match: { ...clickMatch, ipAddress: { $nin: ['', null] } } },
          { $group: { _id: '$ipAddress' } },
          { $count: 'total' },
        ]),
        Referral.aggregate([
          { $match: referralMatch },
          { $group: { _id: '$smartLinkId', signups: { $sum: 1 } } },
        ]),
        CommissionLedger.aggregate([
          ...ledgerPipeline({ type: 'plan_purchase' }),
          { $group: { _id: '$referral.smartLinkId', referrals: { $addToSet: '$referralId' } } },
          { $project: { conversions: { $size: '$referrals' } } },
        ]),
        req.user.permissions?.canViewEarnings === false ? Promise.resolve([]) : CommissionLedger.aggregate([
          ...ledgerPipeline(),
          { $group: { _id: '$referral.smartLinkId', totalEarnings: { $sum: { $toDouble: '$amount' } } } },
        ]),
      ];
      [clickRows, uniqueVisitorRows, signupRows, conversionRows, earningsRows] = await Promise.all(tasks);
    }

    const toMap = (rows, key) => new Map(rows.map((row) => [String(row._id), Number(row[key]) || 0]));
    const clicksByLink = toMap(clickRows, 'clicks');
    const visitorsByLink = toMap(clickRows, 'uniqueVisitors');
    const signupsByLink = toMap(signupRows, 'signups');
    const conversionsByLink = toMap(conversionRows, 'conversions');
    const earningsByLink = toMap(earningsRows, 'totalEarnings');

    const rows = links.map((link) => {
      const clicks = clicksByLink.get(String(link._id)) || 0;
      const signups = signupsByLink.get(String(link._id)) || 0;
      const conversions = conversionsByLink.get(String(link._id)) || 0;
      const earnings = earningsByLink.get(String(link._id)) || 0;
      return {
        _id: link._id,
        name: link.name,
        code: link.code,
        shortUrlPath: `/s/${link.code}`,
        status: link.status,
        saasProduct: link.saasProductId?.name || 'SaaS product',
        saasProductId: link.saasProductId?._id,
        teamMember: link.assignedTeamMemberId?.name || 'Team member unavailable',
        teamMemberId: link.assignedTeamMemberId?._id || null,
        clicks,
        uniqueVisitors: visitorsByLink.get(String(link._id)) || 0,
        signups,
        conversions,
        conversionRate: clicks ? Math.round((conversions / clicks) * 10000) / 100 : 0,
        totalEarnings: req.user.permissions?.canViewEarnings === false ? 0 : Math.round((earnings + Number.EPSILON) * 100) / 100,
      };
    });

    const sortBy = sortFields.has(String(req.query.sortBy)) ? String(req.query.sortBy) : 'clicks';
    const sortOrder = String(req.query.sortOrder || 'desc').toLowerCase() === 'asc' ? 1 : -1;
    rows.sort((left, right) => {
      const comparison = typeof left[sortBy] === 'string' ? left[sortBy].localeCompare(right[sortBy]) : left[sortBy] - right[sortBy];
      return (comparison * sortOrder) || String(left._id).localeCompare(String(right._id));
    });
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const total = rows.length;
    const items = rows.slice((page - 1) * limit, page * limit);

    const productOptionsFilter = { affiliateId: managerAffiliateId };
    if (teamMemberId) productOptionsFilter.assignedTeamMemberId = teamMemberId;
    const productIds = await SmartLink.distinct('saasProductId', productOptionsFilter);
    const products = productIds.length ? await SaasProduct.find({ _id: { $in: productIds } }).select('name slug').sort({ name: 1 }).lean() : [];
    const members = req.user.role === 'team_member' && req.user.permissions?.canViewOwnSmartlinksOnly === true
      ? [{ _id: req.user._id, name: req.user.name }]
      : await TeamMember.find({ managerAffiliateId }).select('name status').sort({ name: 1 }).lean();

    const summary = rows.reduce((totalMetrics, row) => ({
      totalClicks: totalMetrics.totalClicks + row.clicks,
      totalSignups: totalMetrics.totalSignups + row.signups,
      totalConversions: totalMetrics.totalConversions + row.conversions,
      totalEarnings: totalMetrics.totalEarnings + row.totalEarnings,
    }), { totalClicks: 0, uniqueVisitors: Number(uniqueVisitorRows[0]?.total || 0), totalSignups: 0, totalConversions: 0, totalEarnings: 0 });
    summary.conversionRate = summary.totalClicks ? Math.round((summary.totalConversions / summary.totalClicks) * 10000) / 100 : 0;
    summary.totalEarnings = Math.round((summary.totalEarnings + Number.EPSILON) * 100) / 100;

    return res.json({
      filters: { startDate, endDate, saasProductId: saasProductId?.toString() || 'all', teamMemberId: teamMemberId?.toString() || 'all', sortBy, sortOrder: sortOrder === 1 ? 'asc' : 'desc' },
      summary,
      items,
      products,
      teamMembers: members,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error('Smartlink performance error:', error.message);
    return res.status(500).json({ message: 'Failed to load smartlink performance.' });
  }
};
