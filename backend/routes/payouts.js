const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Your JWT check middleware
const Affiliate = require('../models/Affiliate');
const Withdrawal = require('../models/Withdrawal');

// 1. Submit a withdrawal request
router.post('/withdraw', authMiddleware, async (req, res) => {
  try {
    const { amount, method, accountType, accountNumber } = req.body;
    const numericAmount = parseFloat(amount);

    // Validations
    if (!numericAmount || numericAmount < 100) {
      return res.status(400).json({ message: 'Minimum withdrawal is 100 BDT.' });
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

    // Create log entry
    const withdrawal = new Withdrawal({
      affiliateId: req.user.id,
      amount: numericAmount,
      method,
      accountType,
      accountNumber
    });
    await withdrawal.save();

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