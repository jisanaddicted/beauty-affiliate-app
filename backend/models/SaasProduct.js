import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';

const planTierSchema = new mongoose.Schema({
  planId: { type: String, required: true, trim: true },
  planName: { type: String, required: true, trim: true },
  commissionType: { type: String, enum: ['fixed', 'percentage'], required: true },
  commissionValue: { type: mongoose.Schema.Types.Decimal128, required: true },
}, { _id: false });

const saasProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  tagline: { type: String, default: '', trim: true },
  description: { type: String, default: '', trim: true },
  logoUrl: { type: String, default: '', trim: true },
  bannerUrl: { type: String, default: '', trim: true },
  destinationUrl: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (value) => /^https?:\/\//i.test(value),
      message: 'Destination URL must use HTTP or HTTPS.',
    },
  },
  refParamKey: { type: String, default: 'ref', trim: true },
  cookieWindowDays: { type: Number, default: 30, min: 0, validate: Number.isInteger },
  signupBountyAmount: { type: mongoose.Schema.Types.Decimal128, required: true, default: '0' },
  requirePurchaseToUnlock: { type: Boolean, default: true },
  planTiers: {
    type: [planTierSchema],
    default: [],
    validate: {
      validator: (tiers) => new Set(tiers.map((tier) => tier.planId)).size === tiers.length,
      message: 'Plan IDs must be unique within a SaaS product.',
    },
  },
  holdingPeriodDays: { type: Number, default: 14, min: 0, validate: Number.isInteger },
  webhookSecret: { type: String, required: true, select: false },
  promoResources: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  status: { type: String, enum: ['active', 'paused', 'private'], default: 'active', index: true },
}, { timestamps: true, collection: 'saas_products' });

saasProductSchema.pre('validate', function ensureWebhookSecret() {
  if (!this.webhookSecret) {
    this.webhookSecret = `whsec_${randomBytes(32).toString('hex')}`;
  }
});

export default mongoose.model('SaasProduct', saasProductSchema);
