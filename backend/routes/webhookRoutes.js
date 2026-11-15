import express from 'express';
import { ingestSaasWebhook } from '../controllers/webhookController.js';

const router = express.Router();

router.post('/saas/:slug', ingestSaasWebhook);

export default router;
