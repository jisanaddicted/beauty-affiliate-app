import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { protectAdmin } from '../middleware/authMiddleware.js';
import SaasProduct from '../models/SaasProduct.js';
import Affiliate from '../models/Affiliate.js';
import CommissionLedger from '../models/CommissionLedger.js';
import Withdrawal from '../models/Withdrawal.js';
import { getAffiliateCommissionSummary, processMaturedCommissions } from '../services/commissionService.js';
import { serializeSaasProduct, serializeWithdrawal } from '../utils/serializers.js';

const router = express.Router();

const secureEquals = (left, right) => {
  const leftHash = createHash('sha256').update(String(left)).digest();
  const rightHash = createHash('sha256').update(String(right)).digest();
  return timingSafeEqual(leftHash, rightHash);
};

router.post('/login', async (req, res) => {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;
  if (!adminEmail || !adminPassword || !jwtSecret) {
    return res.status(503).json({ message: 'Admin login is not configured on the server.' });
  }

  const emailMatches = secureEquals(String(req.body?.email || '').trim().toLowerCase(), adminEmail);
  const passwordMatches = secureEquals(String(req.body?.password || ''), adminPassword);
  if (!emailMatches || !passwordMatches) {
    return res.status(401).json({ message: 'Invalid admin credentials.' });
  }

  const token = jwt.sign({ role: 'admin', email: adminEmail }, jwtSecret, { expiresIn: '8h' });
  return res.json({ token, admin: { name: process.env.ADMIN_NAME || 'Administrator', email: adminEmail } });
});

router.use(protectAdmin);

router.get('/affiliates', async (req, res) => {
  try {
    const allowedStatuses = ['pending', 'approved', 'rejected', 'suspended', 'all'];
    const status = String(req.query.status || 'pending').toLowerCase();
    if (!allowedStatuses.includes(status)) return res.status(400).json({ message: 'Invalid affiliate status filter.' });
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const query = String(req.query.search || '').trim().slice(0, 100);
    const filters = [];
    if (status === 'approved') filters.push({ $or: [{ status: 'approved' }, { status: { $exists: false } }, { status: null }] });
    else if (status !== 'all') filters.push({ status });
    if (query) {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filters.push({ $or: ['name', 'email', 'affiliateCode'].map((field) => ({ [field]: { $regex: escaped, $options: 'i' } })) });
    }
    const filter = filters.length ? { $and: filters } : {};
    const [items, total, groupedCounts] = await Promise.all([
      Affiliate.find(filter).select('name email affiliateCode status reviewedAt rejectionReason createdAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Affiliate.countDocuments(filter),
      Affiliate.aggregate([{ $group: { _id: { $ifNull: ['$status', 'approved'] }, count: { $sum: 1 } } }]),
    ]);
    const counts = { pending: 0, approved: 0, rejected: 0, suspended: 0 };
    for (const item of groupedCounts) if (Object.hasOwn(counts, item._id)) counts[item._id] = item.count;
    return res.json({ items: items.map((item) => ({ ...item, status: item.status || 'approved' })), counts, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Admin affiliate list error:', error.message);
    return res.status(500).json({ message: 'Failed to load affiliate applications.' });
  }
});

router.patch('/affiliates/:id/status', async (req, res) => {
  const { status } = req.body || {};
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid affiliate ID.' });
  if (!['pending', 'approved', 'rejected', 'suspended'].includes(status)) return res.status(400).json({ message: 'Status must be pending, approved, rejected, or suspended.' });
  const rejectionReason = String(req.body?.rejectionReason || '').trim();
  if (rejectionReason.length > 1000) return res.status(400).json({ message: 'The review note must be 1000 characters or fewer.' });
  try {
    const affiliate = await Affiliate.findByIdAndUpdate(req.params.id, {
      $set: {
        status,
        reviewedAt: status === 'pending' ? null : new Date(),
        rejectionReason: ['rejected', 'suspended'].includes(status) && rejectionReason ? rejectionReason : null,
      },
    }, { new: true, runValidators: true }).select('name email affiliateCode status reviewedAt rejectionReason createdAt').lean();
    if (!affiliate) return res.status(404).json({ message: 'Affiliate account not found.' });
    return res.json({ affiliate });
  } catch (error) {
    console.error('Admin affiliate status update error:', error.message);
    return res.status(500).json({ message: 'Failed to update affiliate status.' });
  }
});

router.get('/saas-products', async (_req, res) => {
  try {
    const products = await SaasProduct.find({}).select('+webhookSecret').sort({ createdAt: -1 });
    return res.json(products.map(serializeSaasProduct));
  } catch {
    return res.status(500).json({ message: 'Failed to load SaaS products.' });
  }
});

router.post('/saas-products', async (req, res) => {
  try {
    const product = await SaasProduct.create(req.body);
    return res.status(201).json(serializeSaasProduct(product));
  } catch (error) {
    return res.status(400).json({ message: 'Failed to create SaaS product.', error: error.message });
  }
});

router.put('/saas-products/:id', async (req, res) => {
  try {
    const { webhookSecret: _ignoredSecret, ...updates } = req.body;
    const product = await SaasProduct.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select('+webhookSecret');
    if (!product) return res.status(404).json({ message: 'SaaS product not found.' });
    return res.json(serializeSaasProduct(product));
  } catch (error) {
    return res.status(400).json({ message: 'Failed to update SaaS product.', error: error.message });
  }
});

router.post('/saas-products/:id/rotate-webhook-secret', async (req, res) => {
  try {
    const product = await SaasProduct.findByIdAndUpdate(
      req.params.id,
      { $set: { webhookSecret: `whsec_${randomBytes(32).toString('hex')}` } },
      { new: true, runValidators: true }
    ).select('+webhookSecret');
    if (!product) return res.status(404).json({ message: 'SaaS product not found.' });
    return res.json({ webhookSecret: product.webhookSecret });
  } catch {
    return res.status(500).json({ message: 'Failed to rotate webhook secret.' });
  }
});

router.get('/withdrawals', async (req, res) => {
  try {
    await processMaturedCommissions();
    const status = req.query.status || 'Pending';
    const withdrawals = await Withdrawal.find({ status })
      .populate('affiliateId', 'name email affiliateCode')
      .sort({ createdAt: -1 });
    const result = await Promise.all(withdrawals.map(async (withdrawal) => ({
      ...serializeWithdrawal(withdrawal),
      availableBalance: withdrawal.affiliateId
        ? (await getAffiliateCommissionSummary(withdrawal.affiliateId._id)).availableBalance
        : 0,
    })));
    return res.json(result);
  } catch (error) {
    console.error('Admin withdrawal list error:', error.message);
    return res.status(500).json({ message: 'Failed to load withdrawals.' });
  }
});

router.put('/withdrawals/:id/approve', async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const withdrawal = await Withdrawal.findById(req.params.id).session(session);
      if (!withdrawal) throw Object.assign(new Error('Withdrawal request not found.'), { status: 404 });
      if (withdrawal.status !== 'Pending') throw Object.assign(new Error('This withdrawal is already processed.'), { status: 409 });
      if (!withdrawal.commissionLedgerIds?.length) {
        throw Object.assign(new Error('This legacy request has no reserved commission entries.'), { status: 409 });
      }

      const affiliate = await Affiliate.findByIdAndUpdate(
        withdrawal.affiliateId,
        { $inc: { payoutLockVersion: 1 } },
        { new: true, session }
      );
      if (!affiliate) throw Object.assign(new Error('Affiliate account not found.'), { status: 404 });

      const entries = await CommissionLedger.find({
        _id: { $in: withdrawal.commissionLedgerIds },
        affiliateId: affiliate._id,
        status: 'available',
      }).session(session);
      const entryTotal = entries.reduce((sum, entry) => sum + Number(entry.amount.toString()), 0);
      if (entries.length !== withdrawal.commissionLedgerIds.length || Math.abs(entryTotal - Number(withdrawal.amount.toString())) > 0.01) {
        throw Object.assign(new Error('Reserved commissions are no longer available for payout.'), { status: 409 });
      }

      await CommissionLedger.updateMany(
        { _id: { $in: withdrawal.commissionLedgerIds }, status: 'available' },
        { $set: { status: 'paid' } },
        { session }
      );
      withdrawal.status = 'Approved';
      withdrawal.approvedAt = new Date();
      await withdrawal.save({ session });
      result = { message: 'Withdrawal approved and commissions marked paid.', withdrawal: serializeWithdrawal(withdrawal) };
    });
    return res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || 'Failed to approve withdrawal.' });
  } finally {
    await session.endSession();
  }
});

router.put('/withdrawals/:id/reject', async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let withdrawal;
    await session.withTransaction(async () => {
      withdrawal = await Withdrawal.findById(req.params.id).session(session);
      if (!withdrawal) throw Object.assign(new Error('Withdrawal request not found.'), { status: 404 });
      if (withdrawal.status !== 'Pending') throw Object.assign(new Error('This withdrawal is already processed.'), { status: 409 });

      await Affiliate.findByIdAndUpdate(withdrawal.affiliateId, { $inc: { payoutLockVersion: 1 } }, { session });
      withdrawal.status = 'Rejected';
      withdrawal.rejectedAt = new Date();
      await withdrawal.save({ session });
    });
    return res.json({ message: 'Withdrawal rejected. Reserved commissions are available again.', withdrawal: serializeWithdrawal(withdrawal) });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || 'Failed to reject withdrawal.' });
  } finally {
    await session.endSession();
  }
});

export default router;
