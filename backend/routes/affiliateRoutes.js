import express from 'express';
import { getAffiliateDashboard, getAffiliateSummary, getAffiliateActivity } from '../controllers/affiliateController.js';
import { exportAffiliateAnalyticsCsv, getAffiliateAnalytics } from '../controllers/analyticsController.js';
import { createSmartLink, deleteSmartLink, listSmartLinks, updateSmartLink } from '../controllers/smartLinkController.js';
import { createTeamMember, deleteTeamMember, listTeamMembers, updateTeamMember } from '../controllers/teamController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// We inject the "protect" middleware function right BEFORE our controller execution
router.get('/dashboard', protect, getAffiliateDashboard);
router.get('/summary', protect, getAffiliateSummary);
router.get('/activity', protect, getAffiliateActivity);
router.get('/analytics/export', protect, exportAffiliateAnalyticsCsv);
router.get('/analytics', protect, getAffiliateAnalytics);
router.get('/smartlinks', protect, listSmartLinks);
router.post('/smartlinks', protect, createSmartLink);
router.put('/smartlinks/:id', protect, updateSmartLink);
router.delete('/smartlinks/:id', protect, deleteSmartLink);
router.get('/team', protect, listTeamMembers);
router.post('/team', protect, createTeamMember);
router.put('/team/:id', protect, updateTeamMember);
router.delete('/team/:id', protect, deleteTeamMember);

export default router;
