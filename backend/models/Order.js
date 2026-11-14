import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    shippingAddress: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    totalAmount: { type: Number, required: true, min: 0 },
    referralCode: { type: String, default: null }, // Tracked incoming credit tag
    commissionEarned: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' }
  },
  { timestamps: true, collection: 'orders' }
);

export default mongoose.model('Order', orderSchema);
