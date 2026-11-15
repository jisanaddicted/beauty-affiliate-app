import mongoose from 'mongoose';
import AffiliateClick from '../models/AffiliateClick.js';
import CommissionLedger from '../models/CommissionLedger.js';
import Referral from '../models/Referral.js';
import SaasProduct from '../models/SaasProduct.js';

const allowedStatuses = new Set(['all', 'locked', 'pending_maturation', 'available', 'paid']);
const allowedSorts = {
  timestamp: 'createdAt',
  amount: 'amount',
  status: 'status',
  event: 'type',
};

const badRequest = (message) => Object.assign(new Error(message), { status: 400 });

const parseDate = (raw, isEnd) => {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw badRequest('startDate and endDate must be valid ISO dates.');
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    if (isEnd) date.setUTCHours(23, 59, 59, 999);
    else date.setUTCHours(0, 0, 0, 0);
  }
  return date;
};

const parseFilters = (query) => {
  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setUTCHours(0, 0, 0, 0);
  defaultStart.setUTCDate(defaultStart.getUTCDate() - 29);
  const startDate = parseDate(query.startDate, false) || defaultStart;
  const endDate = parseDate(query.endDate, true) || now;
  if (startDate > endDate) throw badRequest('startDate must be earlier than or equal to endDate.');

  const requestedProduct = String(query.saasProductId || 'all');
  let saasProductId = null;
  if (requestedProduct !== 'all') {
    if (!mongoose.isValidObjectId(requestedProduct)) throw badRequest('saasProductId must be a valid product ID or all.');
    saasProductId = new mongoose.Types.ObjectId(requestedProduct);
  }

  const status = String(query.status || 'all');
  if (!allowedStatuses.has(status)) throw badRequest('status must be locked, pending_maturation, available, paid, or all.');

  const sortBy = allowedSorts[String(query.sortBy || 'timestamp')] || 'createdAt';
  const sortOrder = String(query.sortOrder || 'desc').toLowerCase() === 'asc' ? 1 : -1;
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 10));
  const interval = endDate.getTime() - startDate.getTime() > 90 * 24 * 60 * 60 * 1000 ? 'week' : 'day';

  return { startDate, endDate, saasProductId, status, sortBy, sortOrder, page, limit, interval };
};

const dateRange = (field, filters) => ({ [field]: { $gte: filters.startDate, $lte: filters.endDate } });
const productMatch = (filters) => filters.saasProductId ? { saasProductId: filters.saasProductId } : {};
const ledgerStatusMatch = (filters) => filters.status === 'all' ? { status: { $ne: 'refunded' } } : { status: filters.status };
const dateBucket = (field, interval) => ({
  $dateTrunc: { date: field, unit: interval, ...(interval === 'week' ? { startOfWeek: 'monday' } : {}) },
});

const referralStatusStages = (status) => status === 'all' ? [] : [
  { $lookup: { from: 'commission_ledger', localField: '_id', foreignField: 'referralId', as: 'matchingCommissions' } },
  { $match: { 'matchingCommissions.status': status } },
];

const activityPipeline = (affiliateId, filters, { page, limit, facet = false } = {}) => {
  const pipeline = [
    { $match: { affiliateId, ...dateRange('createdAt', filters), ...productMatch(filters), ...ledgerStatusMatch(filters) } },
    { $sort: { [filters.sortBy]: filters.sortOrder, _id: filters.sortOrder } },
  ];
  const rowStages = [
    { $lookup: { from: 'saas_products', localField: 'saasProductId', foreignField: '_id', as: 'saasProduct' } },
    { $unwind: { path: '$saasProduct', preserveNullAndEmptyArrays: true } },
    { $project: {
      _id: 1,
      referredUserId: {
        $cond: [
          { $lte: [{ $strLenCP: '$referredUserId' }, 8] },
          { $concat: [{ $substrCP: ['$referredUserId', 0, 2] }, '…'] },
          { $concat: [
            { $substrCP: ['$referredUserId', 0, 4] },
            '…',
            { $substrCP: ['$referredUserId', { $subtract: [{ $strLenCP: '$referredUserId' }, 4] }, 4] },
          ] },
        ],
      },
      saasProduct: { $ifNull: ['$saasProduct.name', 'SaaS product'] },
      type: 1,
      status: 1,
      amount: { $toDouble: '$amount' },
      timestamp: '$createdAt',
      unlocksAt: 1,
    } },
  ];

  if (!facet) return [...pipeline, ...rowStages];
  return [
    ...pipeline,
    { $facet: {
      items: [{ $skip: (page - 1) * limit }, { $limit: limit }, ...rowStages],
      total: [{ $count: 'count' }],
    } },
  ];
};

const periodKey = (value) => new Date(value).toISOString().slice(0, 10);

const makePeriods = (startDate, endDate, interval) => {
  const cursor = new Date(startDate);
  cursor.setUTCHours(0, 0, 0, 0);
  if (interval === 'week') cursor.setUTCDate(cursor.getUTCDate() - ((cursor.getUTCDay() + 6) % 7));
  const periods = [];
  while (cursor <= endDate) {
    const value = new Date(cursor);
    periods.push({ key: periodKey(value), date: value, clicks: 0, signups: 0, earnings: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + (interval === 'week' ? 7 : 1));
  }
  return periods;
};

const mergeSeries = (periods, rows, property) => {
  const byDate = new Map(rows.map((row) => [periodKey(row._id), Number(row.value) || 0]));
  return periods.map((period) => ({ ...period, [property]: byDate.get(period.key) || 0 }));
};

export const getAffiliateAnalytics = async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const affiliateId = new mongoose.Types.ObjectId(req.user._id);
    const clickMatch = { affiliateId, ...dateRange('timestamp', filters), ...productMatch(filters) };
    const referralMatch = { affiliateId, ...dateRange('createdAt', filters), ...productMatch(filters) };
    const commissionMatch = { affiliateId, ...dateRange('createdAt', filters), ...productMatch(filters), ...ledgerStatusMatch(filters) };
    const bucket = dateBucket('$createdAt', filters.interval);
    const clickBucket = dateBucket('$timestamp', filters.interval);

    const signupStages = referralStatusStages(filters.status);
    const [clickStats, clickSeries, signupCount, signupSeries, conversionStats, earningStats, earningSeries, activityResult, clickProducts, referralProducts, ledgerProducts] = await Promise.all([
      AffiliateClick.aggregate([{ $match: clickMatch }, { $count: 'total' }]),
      AffiliateClick.aggregate([{ $match: clickMatch }, { $group: { _id: clickBucket, value: { $sum: 1 } } }]),
      Referral.aggregate([
        { $match: referralMatch }, ...signupStages,
        { $group: { _id: '$referredUserId' } }, { $count: 'total' },
      ]),
      Referral.aggregate([
        { $match: referralMatch }, ...signupStages,
        { $group: { _id: bucket, users: { $addToSet: '$referredUserId' } } },
        { $project: { _id: 1, value: { $size: '$users' } } },
      ]),
      CommissionLedger.aggregate([
        { $match: { ...commissionMatch, type: 'plan_purchase' } },
        { $lookup: { from: 'referrals', localField: 'referralId', foreignField: '_id', as: 'referral' } },
        { $unwind: '$referral' },
        { $match: { 'referral.affiliateId': affiliateId } },
        { $group: { _id: '$referralId', convertedAt: { $min: '$createdAt' } } },
        { $facet: {
          total: [{ $count: 'count' }],
          series: [{ $group: { _id: dateBucket('$convertedAt', filters.interval), value: { $sum: 1 } } }],
        } },
      ]),
      CommissionLedger.aggregate([
        { $match: commissionMatch },
        { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } } } },
      ]),
      CommissionLedger.aggregate([
        { $match: commissionMatch },
        { $group: { _id: bucket, value: { $sum: { $toDouble: '$amount' } } } },
      ]),
      CommissionLedger.aggregate(activityPipeline(affiliateId, filters, { page: filters.page, limit: filters.limit, facet: true })),
      AffiliateClick.distinct('saasProductId', { affiliateId }),
      Referral.distinct('saasProductId', { affiliateId }),
      CommissionLedger.distinct('saasProductId', { affiliateId }),
    ]);

    const conversionResult = conversionStats[0] || { total: [], series: [] };
    const totalSignups = Number(signupCount[0]?.total || 0);
    const totalConversions = Number(conversionResult.total?.[0]?.count || 0);
    const periods = makePeriods(filters.startDate, filters.endDate, filters.interval);
    const clicksByPeriod = mergeSeries(periods, clickSeries, 'clicks');
    const signupsByPeriod = mergeSeries(periods, signupSeries, 'signups');
    const earningsByPeriod = mergeSeries(periods, earningSeries, 'earnings');
    const series = periods.map((period, index) => ({
      date: period.key,
      clicks: clicksByPeriod[index].clicks,
      signups: signupsByPeriod[index].signups,
      earnings: Math.round((earningsByPeriod[index].earnings + Number.EPSILON) * 100) / 100,
    }));

    const allProductIds = [...new Set([...clickProducts, ...referralProducts, ...ledgerProducts].map(String))]
      .map((id) => new mongoose.Types.ObjectId(id));
    const products = allProductIds.length
      ? await SaasProduct.find({ _id: { $in: allProductIds } }).select('name slug').sort({ name: 1 }).lean()
      : [];
    const activityPage = activityResult[0] || { items: [], total: [] };
    const activityTotal = Number(activityPage.total?.[0]?.count || 0);

    return res.json({
      filters: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        saasProductId: filters.saasProductId?.toString() || 'all',
        status: filters.status,
        interval: filters.interval,
      },
      summary: {
        totalClicks: Number(clickStats[0]?.total || 0),
        totalSignups,
        totalConversions,
        conversionRate: totalSignups ? Math.round((totalConversions / totalSignups) * 10000) / 100 : 0,
        totalEarnings: Math.round((Number(earningStats[0]?.total || 0) + Number.EPSILON) * 100) / 100,
      },
      series,
      products,
      activity: {
        items: activityPage.items || [],
        page: filters.page,
        limit: filters.limit,
        total: activityTotal,
        totalPages: Math.ceil(activityTotal / filters.limit),
      },
    });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ message: error.message });
    console.error('Affiliate analytics error:', error.message);
    return res.status(500).json({ message: 'Failed to load affiliate analytics.' });
  }
};

const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export const exportAffiliateAnalyticsCsv = async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const affiliateId = new mongoose.Types.ObjectId(req.user._id);
    const rows = await CommissionLedger.aggregate(activityPipeline(affiliateId, filters, { facet: false })).allowDiskUse(true);
    const header = ['Referred User ID', 'SaaS Product', 'Event Type', 'Status', 'Amount', 'Timestamp', 'Unlocks At'];
    const csvRows = rows.map((row) => [
      row.referredUserId,
      row.saasProduct,
      row.type,
      row.status,
      Number(row.amount).toFixed(2),
      row.timestamp?.toISOString?.() || '',
      row.unlocksAt?.toISOString?.() || '',
    ]);
    const csv = [header, ...csvRows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="saas-analytics.csv"');
    return res.send(`\uFEFF${csv}`);
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ message: error.message });
    console.error('Affiliate analytics export error:', error.message);
    return res.status(500).json({ message: 'Failed to export affiliate analytics.' });
  }
};
