import express from 'express';
const router = express.Router();

// 💡 FIX: Destructure the named "protect" function instead of using a default import
import { protect } from '../middleware/auth.js'; 

import Affiliate from '../models/Affiliate.js';      
import Withdrawal from '../models/Withdrawal.js';    

// 💳 1. Submit a withdrawal request
// 💡 FIX: Change "authMiddleware" to "protect"
router.post('/withdraw', protect, async (req, res) => {
  try {
    const { amount, method, accountType, accountNumber } = req.body;
    const numericAmount = parseFloat(amount);

    if (!numericAmount || numericAmount < 10) {
      return res.status(400).json({ message: 'Minimum withdrawal amount is 10.' });
    }

    const affiliate = await Affiliate.findById(req.user.id);
    if (!affiliate) {
      return res.status(404).json({ message: 'Affiliate account not found.' });
    }

    if (affiliate.balance.withdrawableBalance < numericAmount) {
      return res.status(400).json({ message: 'Insufficient withdrawable balance allocations.' });
    }

    affiliate.balance.withdrawableBalance -= numericAmount;
    affiliate.balance.pendingBalance += numericAmount;
    await affiliate.save();

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
    console.error("🔥 Error processing payout:", err);
    return res.status(400).json({ 
      message: err.errors?.accountNumber?.message || err.message || 'Server error tracking transaction request.' 
    });
  }
});

// 📋 2. Fetch withdrawal history
// 💡 FIX: Change "authMiddleware" to "protect"
router.get('/history', protect, async (req, res) => {
  try {
    const logs = await Withdrawal.find({ affiliateId: req.user.id }).sort({ createdAt: -1 });
    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ message: 'Server error retrieving log layers.' });
  }
});

export default router;