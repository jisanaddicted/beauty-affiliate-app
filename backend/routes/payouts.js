import express from 'express';
import mongoose from 'mongoose';
import { protect, requirePermission } from '../middleware/authMiddleware.js';
import Affiliate from '../models/Affiliate.js';
import CommissionLedger from '../models/CommissionLedger.js';
import Withdrawal from '../models/Withdrawal.js';
import { decimalFrom, getAffiliateCommissionSummary, processMaturedCommissions } from '../services/commissionService.js';
import { serializeWithdrawal } from '../utils/serializers.js';

const router = express.Router();

router.post('/withdraw', protect, requirePermission('canRequestPayouts'), requirePermission('canViewEarnings'), async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount < 10) {
    return res.status(400).json({ message: 'Minimum withdrawal request amount is 10.' });
  }

  const roundedAmount = Math.round((amount + Number.EPSILON) * 100) / 100;
  const managerAffiliateId = req.user.managerAffiliateId || req.user._id;
  const teamMemberId = req.user.role === 'team_member' ? req.user._id : null;
  const memberFilter = teamMemberId ? { teamMemberId } : {};
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const affiliate = await Affiliate.findByIdAndUpdate(
        managerAffiliateId,
        { $inc: { payoutLockVersion: 1 } },
        { new: true, session }
      );
      if (!affiliate) throw Object.assign(new Error('Affiliate account not found.'), { status: 404 });

      await processMaturedCommissions(session);
      const summary = await getAffiliateCommissionSummary(affiliate._id, session, { teamMemberId });
      if (roundedAmount > summary.availableBalance + 0.000001) {
        throw Object.assign(new Error('Requested amount exceeds the available commission balance.'), { status: 400 });
      }

      const pendingWithdrawals = await Withdrawal.find({ affiliateId: affiliate._id, status: { $in: ['Pending', 'Approved'] } })
        .select('commissionLedgerIds')
        .session(session);
      const reservedIds = new Set(pendingWithdrawals.flatMap((withdrawal) => withdrawal.commissionLedgerIds.map(String)));
      const availableEntries = await CommissionLedger.find({ affiliateId: affiliate._id, status: 'available', ...memberFilter })
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
          teamMemberId: entry.teamMemberId || null,
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
        requestedByTeamMemberId: teamMemberId,
        commissionLedgerIds,
        amount: decimalFrom(roundedAmount),
        method: req.body.method,
        accountType: req.body.accountType,
        accountNumber: req.body.accountNumber,
      }], { session });

      result = {
        message: 'Withdrawal request submitted successfully.',
        withdrawal: serializeWithdrawal(withdrawal),
        summary: await getAffiliateCommissionSummary(affiliate._id, session, { teamMemberId }),
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

router.get('/history', protect, requirePermission('canRequestPayouts'), requirePermission('canViewEarnings'), async (req, res) => {
  try {
    const filter = { affiliateId: req.user.managerAffiliateId || req.user._id };
    if (req.user.role === 'team_member') filter.requestedByTeamMemberId = req.user._id;
    const logs = await Withdrawal.find(filter).sort({ createdAt: -1 });
    return res.json(logs.map(serializeWithdrawal));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to retrieve withdrawal history.' });
  }
});

export default router;
