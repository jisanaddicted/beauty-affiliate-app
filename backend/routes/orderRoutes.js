import express from 'express';
import { createOrder } from '../controllers/orderController.js';

const router = express.Router();

/**
 * @route   POST /api/orders
 * @desc    Route to capture and process a checkout order sale
 */
router.post('/', createOrder);

export default router;
import Product from '../models/Product.js';
// Temporary endpoint to create products for testing
router.post('/test-product', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    return res.status(201).json(product);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});