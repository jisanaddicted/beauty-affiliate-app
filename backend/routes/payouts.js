const express = require('express');
const router = express.Router();
const axios = require('axios');
const authMiddleware = require('../middleware/auth'); // Your JWT check middleware
const Affiliate = require('../models/Affiliate');
const Withdrawal = require('../models/Withdrawal');

// 1. Submit a withdrawal request
router.post('/withdraw', authMiddleware, async (req, res) => {
  try {
    const { amount, method, accountType, accountNumber } = req.body;
    const numericAmount = parseFloat(amount);

    // 🛡️ Enforced minimum limit threshold to match frontend requirements ($10)
    if (!numericAmount || numericAmount < 10) {
      return res.status(400).json({ message: 'Minimum withdrawal is $10.' });
    }

    const affiliate = await Affiliate.findById(req.user.id);
    if (!affiliate) return res.status(404).json({ message: 'Affiliate account not found.' });

    // Check availability
    if (affiliate.balance.withdrawableBalance < numericAmount) {
      return res.status(400).json({ message: 'Insufficient withdrawable balance.' });
    }

    // Deduct from withdrawable, add to pending system
    affiliate.balance.withdrawableBalance -= numericAmount;
    affiliate.balance.pendingBalance += numericAmount;
    await affiliate.save();

    // Create log entry inside MongoDB database instance
    const withdrawal = new Withdrawal({
      affiliateId: req.user.id,
      amount: numericAmount,
      method,
      accountType,
      accountNumber
    });
    await withdrawal.save();

    // 🚀 Google Sheets Web App Synchronization Webhook
    // Replace this string with your live Apps Script Web App Deployment link
    const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxj-tcfupCwXvdb4Mj26pzPmr51vyNMfUQnlSLHQZMU-tqeqYvn_0Fun0IrB-H7KxvLig/exec';

    try {
      const sheetPayload = {
        action: "createPayout",
        email: affiliate.email,
        method: method,
        accountType: accountType,
        accountNumber: accountNumber,
        amount: numericAmount
      };

      // text/plain Content-Type handles server-to-macro payload writing efficiently
      await axios.post(GOOGLE_SHEET_URL, JSON.stringify(sheetPayload), {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
    } catch (sheetErr) {
      // Caught errors logged gracefully so it doesn't interrupt or revert database saves
      console.error("Google Sheets Sync Fallback Warning: ", sheetErr.message);
    }

    res.status(201).json({ 
      message: 'Withdrawal request submitted successfully!',
      updatedBalance: affiliate.balance 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error tracking request.', error: err.message });
  }
});

// 2. Fetch withdrawal history for the logged-in creator
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const logs = await Withdrawal.find({ affiliateId: req.user.id }).sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving log layers.' });
  }
});

module.exports = router;