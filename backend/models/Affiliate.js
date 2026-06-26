
import mongoose from 'mongoose';

const affiliateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    affiliateCode: {
      type: String,
      required: [true, 'Affiliate tracking code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    balance: {
      pendingBalance: {
        type: Number,
        default: 0,
      },
      withdrawableBalance: {
        type: Number,
        default: 0,
      },
      totalEarned: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt values
  }
);

const Affiliate = mongoose.model('Affiliate', affiliateSchema);

export default Affiliate;