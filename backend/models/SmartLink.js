import mongoose from 'mongoose';

const smartLinkSchema = new mongoose.Schema({
  affiliateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Affiliate', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  code: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  saasProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'SaasProduct', required: true, index: true },
  assignedTeamMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember', default: null, index: true },
  destinationUrl: {
    type: String,
    default: '',
    trim: true,
    validate: { validator: (value) => !value || /^https?:\/\//i.test(value), message: 'Destination URL must use HTTP or HTTPS.' },
  },
  status: { type: String, enum: ['active', 'paused'], default: 'active', index: true },
  stats: {
    clicks: { type: Number, default: 0, min: 0 },
    signups: { type: Number, default: 0, min: 0 },
    conversions: { type: Number, default: 0, min: 0 },
    revenue: { type: mongoose.Schema.Types.Decimal128, default: '0' },
  },
}, { timestamps: true, collection: 'smart_links' });

smartLinkSchema.index({ affiliateId: 1, createdAt: -1 });

export default mongoose.model('SmartLink', smartLinkSchema);
