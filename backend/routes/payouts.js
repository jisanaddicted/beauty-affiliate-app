const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Your JWT check middleware
const Affiliate = require('../models/Affiliate');
const Withdrawal = require('../models/Withdrawal');

// 💳 1. Submit a withdrawal request
router.post('/withdraw', authMiddleware, async (req, res) => {
  try {
    const { amount, method, accountType, accountNumber } = req.body;
    const numericAmount = parseFloat(amount);

    // Route Layer Guard Validation Check
    if (!numericAmount || numericAmount < 10) {
      return res.status(400).json({ message: 'Minimum withdrawal amount is $10.' });
    }

    // Fetch matching Affiliate document record profile
    const affiliate = await Affiliate.findById(req.user.id);
    if (!affiliate) {
      return res.status(404).json({ message: 'Affiliate account record profile not found.' });
    }

    // Verify account balance pool clearance
    if (affiliate.balance.withdrawableBalance < numericAmount) {
      return res.status(400).json({ message: 'Insufficient withdrawable balance allocations.' });
    }

    // Deduct from withdrawable allocations, shift amount assets to pending pipeline systems
    affiliate.balance.withdrawableBalance -= numericAmount;
    affiliate.balance.pendingBalance += numericAmount;
    await affiliate.save();

    // Create log entry directly mapping your Mongoose constraints setup
    const withdrawal = new Withdrawal({
      affiliateId: req.user.id,
      amount: numericAmount,
      method,
      accountType,
      accountNumber
    });
    await withdrawal.save();

    return res.status(201).json({ 
      message: 'Withdrawal request submitted successfully!',
      updatedBalance: affiliate.balance 
    });

  } catch (err) {
    // Gracefully catch internal error loops or Mongoose Validation Match rejections
    return res.status(400).json({ 
      message: err.errors?.accountNumber?.message || err.message || 'Server error tracking transaction request.' 
    });
  }
});

// 📋 2. Fetch withdrawal history for the logged-in creator affiliate
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const logs = await Withdrawal.find({ affiliateId: req.user.id }).sort({ createdAt: -1 });
    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ message: 'Server error retrieving financial log trace layers.' });
  }
});

module.exports = router;