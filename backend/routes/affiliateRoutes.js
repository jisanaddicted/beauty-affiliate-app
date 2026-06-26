import express from 'express';
import { getAffiliateDashboard } from '../controllers/affiliateController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// We inject the "protect" middleware function right BEFORE our controller execution
router.get('/dashboard', protect, getAffiliateDashboard);

export default router;