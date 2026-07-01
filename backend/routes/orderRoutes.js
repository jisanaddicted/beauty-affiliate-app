import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Affiliate from '../models/Affiliate.js'; // Make sure your user model file path matches this file name

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { productId, customerName, customerPhone, shippingAddress, referralCode } = req.body;

    // 1. Locate the item to verify price metrics
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Target product not found.' });

    // 2. Compute commission percentage payouts
    let commissionEarned = 0;
    if (referralCode) {
      commissionEarned = (product.price * product.commissionRate) / 100;
    }

    // 3. Create the order record entry
    const newOrder = new Order({
      product: productId,
      customerName,
      customerPhone,
      shippingAddress,
      referralCode,
      commissionEarned
    });
    await newOrder.save();

    // 4. Update the Affiliate's pending tracking dashboard values if tracking exists
    if (referralCode) {
      const creatorProfile = await Affiliate.findOne({ affiliateCode: referralCode });
      if (creatorProfile) {
        creatorProfile.balance.pendingBalance += commissionEarned;
        creatorProfile.balance.totalEarned += commissionEarned;
        await creatorProfile.save();
      }
    }

    res.status(201).json({ message: 'Order submitted and affiliate commission credited.', order: newOrder });
  } catch (error) {
    res.status(500).json({ message: 'Internal processing error', error: error.message });
  }
});

export default router;