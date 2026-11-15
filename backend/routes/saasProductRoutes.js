import express from 'express';
import SaasProduct from '../models/SaasProduct.js';
import { serializeSaasProduct } from '../utils/serializers.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const products = await SaasProduct.find({ status: 'active' })
      .select('-webhookSecret')
      .sort({ name: 1 });
    return res.json(products.map(serializeSaasProduct));
  } catch {
    return res.status(500).json({ message: 'Failed to load SaaS marketplace.' });
  }
});

export default router;
