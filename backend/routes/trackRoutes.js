import express from 'express';
import { trackAffiliateClick } from '../controllers/clickController.js';

const router = express.Router();

router.get('/', trackAffiliateClick);

export default router;
