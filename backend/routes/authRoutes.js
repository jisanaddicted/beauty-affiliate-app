import express from 'express';
import { registerAffiliate, loginAffiliate } from '../controllers/authController.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Route to register a brand new affiliate
 */
router.post('/register', registerAffiliate);

/**
 * @route   POST /api/auth/login
 * @desc    Route to authenticate an existing affiliate
 */
router.post('/login', loginAffiliate);

export default router;