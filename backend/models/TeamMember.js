import mongoose from 'mongoose';

const teamMemberSchema = new mongoose.Schema({
  managerAffiliateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Affiliate', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  subAffiliateCode: { type: String, required: true, unique: true, index: true, uppercase: true, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
}, { timestamps: true, collection: 'team_members' });

teamMemberSchema.index({ managerAffiliateId: 1, email: 1 }, { unique: true });

export default mongoose.model('TeamMember', teamMemberSchema);
