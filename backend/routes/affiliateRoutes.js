import express from 'express';
import { getAffiliateDashboard, getAffiliateSummary, getAffiliateActivity } from '../controllers/affiliateController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// We inject the "protect" middleware function right BEFORE our controller execution
router.get('/dashboard', protect, getAffiliateDashboard);
router.get('/summary', protect, getAffiliateSummary);
router.get('/activity', protect, getAffiliateActivity);

export default router;
