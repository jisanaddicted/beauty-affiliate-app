import express from 'express';
import { getAffiliateDashboard, getAffiliateSummary, getAffiliateActivity } from '../controllers/affiliateController.js';
import { exportAffiliateAnalyticsCsv, getAffiliateAnalytics } from '../controllers/analyticsController.js';
import { createSmartLink, deleteSmartLink, listSmartLinks, updateSmartLink } from '../controllers/smartLinkController.js';
import { createTeamMember, deleteTeamMember, listTeamMembers, updateTeamMember } from '../controllers/teamController.js';
import { getSmartlinkPerformance } from '../controllers/smartLinkPerformanceController.js';
import { protect, requirePermission } from '../middleware/authMiddleware.js';

const router = express.Router();

// We inject the "protect" middleware function right BEFORE our controller execution
router.get('/dashboard', protect, getAffiliateDashboard);
router.get('/summary', protect, requirePermission('canViewEarnings'), getAffiliateSummary);
router.get('/activity', protect, requirePermission('canViewAnalytics'), getAffiliateActivity);
router.get('/analytics/export', protect, requirePermission('canViewAnalytics'), exportAffiliateAnalyticsCsv);
router.get('/analytics', protect, requirePermission('canViewAnalytics'), getAffiliateAnalytics);
router.get('/smartlinks', protect, listSmartLinks);
router.get('/smartlinks/performance', protect, requirePermission('canViewAnalytics'), getSmartlinkPerformance);
router.post('/smartlinks', protect, requirePermission('canCreateSmartlinks'), createSmartLink);
router.put('/smartlinks/:id', protect, requirePermission('canCreateSmartlinks'), updateSmartLink);
router.delete('/smartlinks/:id', protect, requirePermission('canCreateSmartlinks'), deleteSmartLink);
router.get('/team', protect, requirePermission('canManageTeam'), listTeamMembers);
router.post('/team', protect, requirePermission('canManageTeam'), createTeamMember);
router.put('/team/:id', protect, requirePermission('canManageTeam'), updateTeamMember);
router.delete('/team/:id', protect, requirePermission('canManageTeam'), deleteTeamMember);

export default router;
