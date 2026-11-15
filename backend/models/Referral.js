import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema({
  affiliateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Affiliate', required: true, index: true },
  saasProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'SaasProduct', required: true, index: true },
  referredUserId: { type: String, required: true, trim: true },
  status: { type: String, enum: ['signed_up', 'converted'], default: 'signed_up', index: true },
}, { timestamps: true, collection: 'referrals' });

referralSchema.index({ saasProductId: 1, referredUserId: 1 }, { unique: true });

export default mongoose.model('Referral', referralSchema);
