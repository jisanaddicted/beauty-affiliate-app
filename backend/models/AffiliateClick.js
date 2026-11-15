import mongoose from 'mongoose';

const affiliateClickSchema = new mongoose.Schema(
  {
    affiliateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Affiliate',
      required: true,
      index: true,
    },
    saasProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SaasProduct',
      required: true,
      index: true,
    },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    referer: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now, required: true },
  },
  { collection: 'affiliate_clicks' }
);

affiliateClickSchema.index({ affiliateId: 1, timestamp: -1, saasProductId: 1 });

export default mongoose.model('AffiliateClick', affiliateClickSchema);
