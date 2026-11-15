import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/authRoutes.js';
import affiliateRoutes from './routes/affiliateRoutes.js';
import saasProductRoutes from './routes/saasProductRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import trackRoutes from './routes/trackRoutes.js';
import { redirectSmartLink } from './controllers/smartLinkController.js';
import payoutRoutes from './routes/payouts.js'; // 📥 Imported the payout route module

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDistPath = path.resolve(currentDir, '../frontend/dist');

app.use(cors());
app.use(express.json());

// 🛣️ Mounted API Routing Layers
app.use('/api/auth', authRoutes);           
app.use('/api/affiliates', affiliateRoutes); 
app.use('/api/saas-products', saasProductRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/track', trackRoutes);
app.use('/api/payouts', payoutRoutes); // 🚀 Activated the payouts subsystem layer

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('🏁 Connected to MongoDB successfully.');
  })
  .catch((error) => {
    console.error('❌ MongoDB database connection error:', error.message);
  });

// Render health checks and external schedulers can use these lightweight endpoints.
app.get(['/api/health', '/api/keep-alive'], (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(200).json({ status: 'ok' });
});

// Serve the Vite production build from this same Render web service.
app.get('/s/:code', redirectSmartLink);
app.use(express.static(frontendDistPath));

// Support client-side routes such as /admin and /product/:id.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is awake and listening on port ${PORT}`);
  console.log(`💓 Health check available at http://localhost:${PORT}/api/health`);
});
