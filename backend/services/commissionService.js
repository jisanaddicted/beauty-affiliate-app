import mongoose from 'mongoose';
import CommissionLedger from '../models/CommissionLedger.js';
import Withdrawal from '../models/Withdrawal.js';
import SaasProduct from '../models/SaasProduct.js';

export const decimalFrom = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) throw new Error('A valid monetary amount is required.');
  return mongoose.Types.Decimal128.fromString((Math.round((numericValue + Number.EPSILON) * 100) / 100).toFixed(2));
};

const amountAsNumber = (value) => Number(value?.toString?.() ?? value ?? 0);

export const processMaturedCommissions = async (session) => {
  const now = new Date();
  const query = CommissionLedger.updateMany(
    { status: 'pending_maturation', unlocksAt: { $lte: now } },
    { $set: { status: 'available' } }
  );
  if (session) query.session(session);
  const maturationResult = await query;

  let productsQuery = SaasProduct.find({ requirePurchaseToUnlock: false }).select('_id');
  if (session) productsQuery = productsQuery.session(session);
  const products = await productsQuery;
  if (!products.length) return maturationResult;

  const optionalUnlockQuery = CommissionLedger.updateMany(
    { saasProductId: { $in: products.map((product) => product._id) }, status: 'locked', unlocksAt: { $lte: now } },
    { $set: { status: 'available' } }
  );
  if (session) optionalUnlockQuery.session(session);
  await optionalUnlockQuery;
  return maturationResult;
};

const sumByStatus = async (affiliateId, session) => {
  let aggregate = CommissionLedger.aggregate([
    { $match: { affiliateId: new mongoose.Types.ObjectId(affiliateId) } },
    { $group: { _id: '$status', amount: { $sum: { $toDouble: '$amount' } } } },
  ]);
  if (session) aggregate = aggregate.session(session);
  const rows = await aggregate;
  return Object.fromEntries(rows.map((row) => [row._id, Number(row.amount) || 0]));
};

export const getAffiliateCommissionSummary = async (affiliateId, session) => {
  await processMaturedCommissions(session);
  const amounts = await sumByStatus(affiliateId, session);

  let withdrawalsQuery = Withdrawal.find({
    affiliateId: new mongoose.Types.ObjectId(affiliateId),
    status: { $in: ['Pending', 'Approved'] },
  }).select('amount status commissionLedgerIds');
  if (session) withdrawalsQuery = withdrawalsQuery.session(session);
  const withdrawals = await withdrawalsQuery;
  const approvedLedgerIds = withdrawals
    .filter((withdrawal) => withdrawal.status === 'Approved')
    .flatMap((withdrawal) => withdrawal.commissionLedgerIds || []);

  let unpaidApprovedEntries = [];
  if (approvedLedgerIds.length) {
    let query = CommissionLedger.find({ _id: { $in: approvedLedgerIds }, status: 'available' }).select('_id amount');
    if (session) query = query.session(session);
    unpaidApprovedEntries = await query;
  }
  const unpaidApprovedAmounts = new Map(unpaidApprovedEntries.map((entry) => [String(entry._id), amountAsNumber(entry.amount)]));
  const reservedWithdrawalAmount = withdrawals.reduce((sum, withdrawal) => {
    const amount = amountAsNumber(withdrawal.amount);
    if (withdrawal.status === 'Pending') return sum + amount;
    const ids = withdrawal.commissionLedgerIds || [];
    if (!ids.length) return sum + amount;
    const stillAvailable = ids.reduce((entrySum, id) => entrySum + (unpaidApprovedAmounts.get(String(id)) || 0), 0);
    return sum + Math.min(amount, stillAvailable);
  }, 0);

  const availableBalance = Math.max(0, (amounts.available || 0) - reservedWithdrawalAmount);

  return {
    lockedBalance: amounts.locked || 0,
    pendingClearance: amounts.pending_maturation || 0,
    availableBalance,
    totalPaid: amounts.paid || 0,
    totalEarned: (amounts.locked || 0) + (amounts.pending_maturation || 0) + (amounts.available || 0) + (amounts.paid || 0),
  };
};

export const commissionUnlockTime = (holdingPeriodDays, start = new Date()) => {
  if (!holdingPeriodDays) return null;
  return new Date(start.getTime() + holdingPeriodDays * 24 * 60 * 60 * 1000);
};
