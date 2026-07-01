import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    shippingAddress: { type: String, required: true },
    referralCode: { type: String, default: null }, // Tracked incoming credit tag
    commissionEarned: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' }
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);