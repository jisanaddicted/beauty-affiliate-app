import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product', // Links directly to your Product model collection
      required: [true, 'Product reference is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total order amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    affiliateCode: {
      type: String,
      uppercase: true,
      trim: true,
      default: null, // Can be null if a customer buys without an affiliate link
    },
    commissionEarned: {
      type: Number,
      required: [true, 'Commission earned math calculation is required'],
      min: [0, 'Commission cannot be negative'],
      default: 0,
    },
    commissionStatus: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'pending', // Holds earnings in pending until return policy window clears
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;