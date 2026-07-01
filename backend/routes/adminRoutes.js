import express from 'express';
import Admin from '../models/Admin.js';
import Product from '../models/Product.js';
import Withdrawal from '../models/Withdrawal.js';
import Affiliate from '../models/Affiliate.js';

const router = express.Router();

// 🔐 ADMIN LOGIN (Manual Match)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin || admin.password !== password) {
      return res.status(401).json({ message: 'Invalid Admin Credentials' });
    }

    res.json({
      message: 'Admin Authentication Success',
      admin: { name: admin.name, email: admin.email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server authentication error', error: error.message });
  }
});

// ➕ ADD NEW PRODUCT RECORD
router.post('/products', async (req, res) => {
  try {
    const { name, price, commissionRate, sku, productUrl, description, category, stock, highlights, image } = req.body;

    const newProduct = new Product({
      name,
      price,
      commissionRate,
      sku,
      productUrl,
      description,
      category,
      stock,
      highlights: highlights.split(',').map(tag => tag.trim()), // Splits comma separated strings into an array
      image
    });

    await newProduct.save();
    res.status(201).json({ message: 'Product added successfully!', product: newProduct });
  } catch (error) {
    res.status(400).json({ message: 'Failed creating product', error: error.message });
  }
});

// 💰 GET ALL PENDING WITHDRAWAL REQUESTS
router.get('/withdrawals', async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : { status: 'Pending' };
    
    const withdrawals = await Withdrawal.find(query)
      .populate('affiliateId', 'name email phone')
      .sort({ createdAt: -1 });
    
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching withdrawals', error: error.message });
  }
});

// ✅ APPROVE WITHDRAWAL
router.put('/withdrawals/:id/approve', async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id).populate('affiliateId');
    
    if (!withdrawal) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }
    
    if (withdrawal.status !== 'Pending') {
      return res.status(400).json({ message: 'This withdrawal has already been processed' });
    }
    
    // Update withdrawal status
    withdrawal.status = 'Approved';
    withdrawal.approvedAt = Date.now();
    await withdrawal.save();
    
    // Move funds from pendingBalance to totalEarned (already withdrawn)
    const affiliate = await Affiliate.findById(withdrawal.affiliateId._id);
    if (affiliate) {
      affiliate.balance.pendingBalance -= withdrawal.amount;
      affiliate.balance.totalEarned -= withdrawal.amount;
      await affiliate.save();
    }
    
    res.json({ 
      message: 'Withdrawal approved successfully!',
      withdrawal 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error approving withdrawal', error: error.message });
  }
});

// ❌ REJECT WITHDRAWAL
router.put('/withdrawals/:id/reject', async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id).populate('affiliateId');
    
    if (!withdrawal) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }
    
    if (withdrawal.status !== 'Pending') {
      return res.status(400).json({ message: 'This withdrawal has already been processed' });
    }
    
    // Update withdrawal status
    withdrawal.status = 'Rejected';
    withdrawal.rejectedAt = Date.now();
    await withdrawal.save();
    
    // Return funds to withdrawable balance
    const affiliate = await Affiliate.findById(withdrawal.affiliateId._id);
    if (affiliate) {
      affiliate.balance.withdrawableBalance += withdrawal.amount;
      affiliate.balance.pendingBalance -= withdrawal.amount;
      await affiliate.save();
    }
    
    res.json({ 
      message: 'Withdrawal rejected. Funds returned to affiliate balance.',
      withdrawal 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting withdrawal', error: error.message });
  }
});

export default router;
