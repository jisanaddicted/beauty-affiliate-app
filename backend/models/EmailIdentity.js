import mongoose from 'mongoose';

const emailIdentitySchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
  role: { type: String, enum: ['affiliate', 'team_member'], required: true },
}, { timestamps: true, collection: 'email_identities' });

export default mongoose.model('EmailIdentity', emailIdentitySchema);
