import express from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/authMiddleware.js';
import Affiliate from '../models/Affiliate.js';
import CommissionLedger from '../models/CommissionLedger.js';
import Withdrawal from '../models/Withdrawal.js';
import { decimalFrom, getAffiliateCommissionSummary, processMaturedCommissions } from '../services/commissionService.js';
import { serializeWithdrawal } from '../utils/serializers.js';

const router = express.Router();

router.post('/withdraw', protect, async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount < 10) {
    return res.status(400).json({ message: 'Minimum withdrawal request amount is 10.' });
  }

  const roundedAmount = Math.round((amount + Number.EPSILON) * 100) / 100;
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const affiliate = await Affiliate.findByIdAndUpdate(
        req.user._id,
        { $inc: { payoutLockVersion: 1 } },
        { new: true, session }
      );
      if (!affiliate) throw Object.assign(new Error('Affiliate account not found.'), { status: 404 });

      await processMaturedCommissions(session);
      const summary = await getAffiliateCommissionSummary(affiliate._id, session);
      if (roundedAmount > summary.availableBalance + 0.000001) {
        throw Object.assign(new Error('Requested amount exceeds the available commission balance.'), { status: 400 });
      }

      const pendingWithdrawals = await Withdrawal.find({ affiliateId: affiliate._id, status: 'Pending' })
        .select('commissionLedgerIds')
        .session(session);
      const reservedIds = new Set(pendingWithdrawals.flatMap((withdrawal) => withdrawal.commissionLedgerIds.map(String)));
      const availableEntries = await CommissionLedger.find({ affiliateId: affiliate._id, status: 'available' })
        .sort({ createdAt: 1 })
        .session(session);

      const withdrawalId = new mongoose.Types.ObjectId();
      const commissionLedgerIds = [];
      let remaining = roundedAmount;

      for (const entry of availableEntries) {
        if (remaining <= 0.000001) break;
        if (reservedIds.has(String(entry._id))) continue;

        const entryAmount = Number(entry.amount.toString());
        if (entryAmount <= remaining + 0.000001) {
          commissionLedgerIds.push(entry._id);
          remaining = Math.round((remaining - entryAmount + Number.EPSILON) * 100) / 100;
          continue;
        }

        const splitAmount = remaining;
        entry.amount = decimalFrom(entryAmount - splitAmount);
        await entry.save({ session });
        const [splitEntry] = await CommissionLedger.create([{
          affiliateId: entry.affiliateId,
          saasProductId: entry.saasProductId,
          referralId: entry.referralId,
          referredUserId: entry.referredUserId,
          type: entry.type,
          planId: entry.planId,
          amount: decimalFrom(splitAmount),
          status: 'available',
          unlocksAt: entry.unlocksAt,
          idempotencyKey: `withdrawal-split:${withdrawalId}:${entry._id}`,
          splitFromLedgerId: entry._id,
        }], { session });
        commissionLedgerIds.push(splitEntry._id);
        remaining = 0;
      }

      if (remaining > 0.000001) {
        throw Object.assign(new Error('Available commission entries could not be reserved for this withdrawal.'), { status: 409 });
      }

      const [withdrawal] = await Withdrawal.create([{
        _id: withdrawalId,
        affiliateId: affiliate._id,
        commissionLedgerIds,
        amount: decimalFrom(roundedAmount),
        method: req.body.method,
        accountType: req.body.accountType,
        accountNumber: req.body.accountNumber,
      }], { session });

      result = {
        message: 'Withdrawal request submitted successfully.',
        withdrawal: serializeWithdrawal(withdrawal),
        summary: await getAffiliateCommissionSummary(affiliate._id, session),
      };
    });

    return res.status(201).json(result);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(error.errors)[0]?.message || 'Withdrawal validation failed.' });
    }
    return res.status(error.status || 400).json({ message: error.message || 'Failed to submit withdrawal.' });
  } finally {
    await session.endSession();
  }
});

router.get('/history', protect, async (req, res) => {
  try {
    const logs = await Withdrawal.find({ affiliateId: req.user._id }).sort({ createdAt: -1 });
    return res.json(logs.map(serializeWithdrawal));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to retrieve withdrawal history.' });
  }
});

export default router;
