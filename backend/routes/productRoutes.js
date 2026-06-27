import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

// Fetch all products for the affiliate marketplace
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching products', error: error.message });
  }
});

export default router;

// Fetch a single target product record by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Target product profile not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving product document', error: error.message });
  }
});