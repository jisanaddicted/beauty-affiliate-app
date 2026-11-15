import express from 'express';
import { getAffiliateDashboard, getAffiliateSummary, getAffiliateActivity } from '../controllers/affiliateController.js';
import { exportAffiliateAnalyticsCsv, getAffiliateAnalytics } from '../controllers/analyticsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// We inject the "protect" middleware function right BEFORE our controller execution
router.get('/dashboard', protect, getAffiliateDashboard);
router.get('/summary', protect, getAffiliateSummary);
router.get('/activity', protect, getAffiliateActivity);
router.get('/analytics/export', protect, exportAffiliateAnalyticsCsv);
router.get('/analytics', protect, getAffiliateAnalytics);

export default router;
