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

const sumByStatus = async (affiliateId, session, teamMemberId) => {
  let aggregate = CommissionLedger.aggregate([
    { $match: { affiliateId: new mongoose.Types.ObjectId(affiliateId), ...(teamMemberId ? { teamMemberId: new mongoose.Types.ObjectId(teamMemberId) } : {}) } },
    { $group: { _id: '$status', amount: { $sum: { $toDouble: '$amount' } } } },
  ]);
  if (session) aggregate = aggregate.session(session);
  const rows = await aggregate;
  return Object.fromEntries(rows.map((row) => [row._id, Number(row.amount) || 0]));
};

export const getAffiliateCommissionSummary = async (affiliateId, session, { teamMemberId } = {}) => {
  await processMaturedCommissions(session);
  const amounts = await sumByStatus(affiliateId, session, teamMemberId);

  let withdrawalsQuery = Withdrawal.find({
    affiliateId: new mongoose.Types.ObjectId(affiliateId),
    status: { $in: ['Pending', 'Approved'] },
  }).select('amount status commissionLedgerIds');
  if (session) withdrawalsQuery = withdrawalsQuery.session(session);
  const withdrawals = await withdrawalsQuery;
  const ledgerFilter = { affiliateId: new mongoose.Types.ObjectId(affiliateId), status: 'available', ...(teamMemberId ? { teamMemberId: new mongoose.Types.ObjectId(teamMemberId) } : {}) };
  let availableQuery = CommissionLedger.find(ledgerFilter).select('_id amount');
  if (session) availableQuery = availableQuery.session(session);
  const availableEntries = await availableQuery;
  const availableAmounts = new Map(availableEntries.map((entry) => [String(entry._id), amountAsNumber(entry.amount)]));
  const reservedWithdrawalAmount = withdrawals.reduce((sum, withdrawal) => {
    const ids = withdrawal.commissionLedgerIds || [];
    if (!ids.length) return sum + (teamMemberId ? 0 : amountAsNumber(withdrawal.amount));
    const stillAvailable = ids.reduce((entrySum, id) => entrySum + (availableAmounts.get(String(id)) || 0), 0);
    return sum + stillAvailable;
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
