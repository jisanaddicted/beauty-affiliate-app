import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Affiliate from '../models/Affiliate.js';

/**
 * @desc    Simulate or capture a new customer checkout order
 * @route   POST /api/orders
 * @access  Public (Simulating an external webhook from Shopify/WooCommerce)
 */
export const createOrder = async (req, res) => {
  try {
    const { orderNumber, productId, quantity, affiliateCode } = req.body;

    // 1. Verify the order number is unique
    const orderExists = await Order.findOne({ orderNumber: orderNumber.toUpperCase() });
    if (orderExists) {
      return res.status(400).json({ message: `Order number ${orderNumber} has already been processed.` });
    }

    // 2. Fetch the target product to get its current price and commission rate
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Target product not found.' });
    }

    // 3. Calculate total product cost
    const totalAmount = product.price * quantity;
    let commissionEarned = 0;
    let validAffiliate = null;

    // 4. If an affiliate code was used, look up the creator and run the math
    if (affiliateCode) {
      validAffiliate = await Affiliate.findOne({ affiliateCode: affiliateCode.toUpperCase() });
      
      if (validAffiliate) {
        // Commission Math: (Total Price * Commission Percentage Rate) / 100
        commissionEarned = (totalAmount * product.commissionRate) / 100;
      }
    }

    // 5. Create the new order entry in MongoDB
    const newOrder = await Order.create({
      orderNumber,
      product: productId,
      quantity,
      totalAmount,
      affiliateCode: validAffiliate ? affiliateCode.toUpperCase() : null,
      commissionEarned,
      commissionStatus: validAffiliate ? 'pending' : 'cancelled' // 'cancelled' or 'none' if no affiliate attached
    });

    // 6. If a valid affiliate tracked this sale, update their pending balance metrics
    if (validAffiliate) {
      await Affiliate.findByIdAndUpdate(
        validAffiliate._id,
        {
          // $inc is a MongoDB operator that atomically increments/adds to a number field safely
          $inc: { 'balance.pendingBalance': commissionEarned }
        }
      );
    }

    // 7. Respond back with order tracking details
    return res.status(201).json({
      message: 'Order processed successfully.',
      order: newOrder
    });

  } catch (error) {
    return res.status(500).json({ message: 'Server order processing error', error: error.message });
  }
};