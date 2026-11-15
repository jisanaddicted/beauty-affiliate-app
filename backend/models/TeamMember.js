import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const defaultTeamPermissions = Object.freeze({
  canViewOverview: true,
  canViewAnalytics: true,
  canCreateSmartlinks: false,
  canViewOwnSmartlinksOnly: true,
  canViewEarnings: false,
  canManageTeam: false,
  canRequestPayouts: false,
});

const permissionsSchema = new mongoose.Schema({
  canViewOverview: { type: Boolean, default: true },
  canViewAnalytics: { type: Boolean, default: true },
  canCreateSmartlinks: { type: Boolean, default: false },
  canViewOwnSmartlinksOnly: { type: Boolean, default: true },
  canViewEarnings: { type: Boolean, default: false },
  canManageTeam: { type: Boolean, default: false },
  canRequestPayouts: { type: Boolean, default: false },
}, { _id: false });

const teamMemberSchema = new mongoose.Schema({
  managerAffiliateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Affiliate', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  permissions: { type: permissionsSchema, default: () => ({}) },
  subAffiliateCode: { type: String, required: true, unique: true, index: true, uppercase: true, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
}, { timestamps: true, collection: 'team_members' });

teamMemberSchema.index({ managerAffiliateId: 1, email: 1 });

teamMemberSchema.pre('save', async function hashTeamMemberPassword() {
  if (!this.isModified('passwordHash')) return;
  if (typeof this.passwordHash !== 'string' || this.passwordHash.length < 8 || this.passwordHash.length > 128) {
    throw new Error('Password must be between 8 and 128 characters.');
  }
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
});

export default mongoose.model('TeamMember', teamMemberSchema);
