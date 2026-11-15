import express from 'express';
import SaasProduct from '../models/SaasProduct.js';
import { serializeSaasProduct } from '../utils/serializers.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const products = await SaasProduct.find({ status: 'active' })
      .select('-webhookSecret')
      .sort({ name: 1 });
    const serialized = products.map(serializeSaasProduct);
    if (req.user.permissions?.canViewEarnings === false) {
      for (const product of serialized) {
        product.signupBountyAmount = '0';
        product.planTiers = product.planTiers.map((tier) => ({ ...tier, commissionValue: '0' }));
      }
    }
    return res.json(serialized);
  } catch {
    return res.status(500).json({ message: 'Failed to load SaaS marketplace.' });
  }
});

export default router;
