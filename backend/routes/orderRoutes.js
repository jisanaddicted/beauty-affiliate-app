import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Affiliate from '../models/Affiliate.js'; // Make sure your user model file path matches this file name
import axios from 'axios';

const router = express.Router();

// Google Apps Script URL for sending order data to Google Sheets
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxj-tcfupCwXvdb4Mj26pzPmr51vyNMfUQnlSLHQZMU-tqeqYvn_0Fun0IrB-H7KxvLig/exec';

router.post('/', async (req, res) => {
  try {
    const { productId, customerName, customerPhone, shippingAddress, quantity, referralCode } = req.body;

    // 1. Locate the item to verify price metrics
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Target product not found.' });

    // 2. Calculate total amount based on quantity
    const totalAmount = product.price * quantity;

    // 3. Compute commission percentage payouts based on total amount
    let commissionEarned = 0;
    if (referralCode) {
      commissionEarned = (totalAmount * product.commissionRate) / 100;
    }

    // 4. Create the order record entry
    const newOrder = new Order({
      product: productId,
      customerName,
      customerPhone,
      shippingAddress,
      quantity,
      totalAmount,
      referralCode,
      commissionEarned
    });
    await newOrder.save();

    // 5. Send order data to Google Sheets
    try {
      const sheetData = {
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        shippingAddress: shippingAddress || '',
        productId: productId || '',
        productName: product.name || '',
        price: product.price || 0,
        quantity: quantity || 1,
        totalPrice: totalAmount || product.price,
        commissionRate: product.commissionRate || 10,
        referralCode: referralCode || 'DIRECT',
        date: new Date().toISOString(),
        deliveryStatus: 'On Way'
      };

      // Send to Google Sheets (fire and forget - don't wait for response)
      axios.post(GOOGLE_SHEET_URL, JSON.stringify(sheetData), {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      }).catch(err => {
        console.error('Failed to sync to Google Sheets:', err.message);
        // Don't fail the order if Google Sheets sync fails
      });
    } catch (sheetError) {
      console.error('Google Sheets sync error:', sheetError);
      // Continue with the order even if Google Sheets sync fails
    }

    // 6. Update the Affiliate's pending tracking dashboard values if tracking exists
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