import express from 'express';
import jwt from 'jsonwebtoken';
import { createHash, timingSafeEqual } from 'node:crypto';
import Product from '../models/Product.js';
import Withdrawal from '../models/Withdrawal.js';
import Affiliate from '../models/Affiliate.js';

const router = express.Router();

const securelyMatches = (provided, expected) => {
  const providedHash = createHash('sha256').update(provided).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
};

const requireAdmin = (req, res, next) => {
  const token = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ message: 'Admin authentication required.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required.' });
    }
    req.admin = { email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ message: 'Admin session is invalid or expired.' });
  }
};

// 🔐 ADMIN LOGIN (Manual Match)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminEmail || !adminPassword || !jwtSecret) {
      return res.status(503).json({ message: 'Admin login is not configured on the server.' });
    }

    const emailMatches = securelyMatches(String(email || '').trim().toLowerCase(), adminEmail);
    const passwordMatches = securelyMatches(String(password || ''), adminPassword);
    if (!emailMatches || !passwordMatches) {
      return res.status(401).json({ message: 'Invalid Admin Credentials' });
    }

    const token = jwt.sign(
      { role: 'admin', email: adminEmail },
      jwtSecret,
      { expiresIn: '8h' }
    );

    return res.json({
      message: 'Admin Authentication Success',
      token,
      admin: { name: process.env.ADMIN_NAME || 'Administrator', email: adminEmail }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server authentication error' });
  }
});

router.use(requireAdmin);

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
      highlights: highlights ? highlights.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [], // Splits comma separated strings into an array, filters out empty strings
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
    
    // Clear from pendingBalance (funds already deducted from withdrawableBalance when requested)
    const affiliate = await Affiliate.findById(withdrawal.affiliateId._id);
    if (affiliate) {
      affiliate.balance.pendingBalance -= withdrawal.amount;
      // Note: totalEarned stays the same (it represents lifetime earnings)
      // Note: withdrawableBalance was already reduced when withdrawal was requested
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
