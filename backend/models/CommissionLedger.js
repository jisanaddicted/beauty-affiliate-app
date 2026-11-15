import mongoose from 'mongoose';

const commissionLedgerSchema = new mongoose.Schema({
  affiliateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Affiliate', required: true, index: true },
  saasProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'SaasProduct', required: true, index: true },
  referralId: { type: mongoose.Schema.Types.ObjectId, ref: 'Referral', required: true, index: true },
  referredUserId: { type: String, required: true, trim: true, index: true },
  type: { type: String, enum: ['signup_bounty', 'plan_purchase'], required: true },
  planId: { type: String, default: null, trim: true },
  amount: { type: mongoose.Schema.Types.Decimal128, required: true },
  status: {
    type: String,
    enum: ['locked', 'pending_maturation', 'available', 'paid', 'refunded'],
    required: true,
    index: true,
  },
  unlocksAt: { type: Date, default: null, index: true },
  idempotencyKey: { type: String, required: true, unique: true },
  splitFromLedgerId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommissionLedger', default: null },
}, { timestamps: true, collection: 'commission_ledger' });

commissionLedgerSchema.index({ affiliateId: 1, status: 1, createdAt: -1 });

export default mongoose.model('CommissionLedger', commissionLedgerSchema);
