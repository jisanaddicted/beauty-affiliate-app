import express from 'express';
import Admin from '../models/Admin.js';
import Product from '../models/Product.js';

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

export default router;