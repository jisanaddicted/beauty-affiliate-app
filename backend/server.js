import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import affiliateRoutes from './routes/affiliateRoutes.js';
import orderRoutes from './routes/orderRoutes.js'; 
import productRoutes from './routes/productRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import payoutRoutes from './routes/payouts.js'; // 📥 Imported the payout route module

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// 🛣️ Mounted API Routing Layers
app.use('/api/auth', authRoutes);           
app.use('/api/affiliates', affiliateRoutes); 
app.use('/api/orders', orderRoutes); 
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payouts', payoutRoutes); // 🚀 Activated the payouts subsystem layer

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('🏁 Connected to MongoDB successfully.');
  })
  .catch((error) => {
    console.error('❌ MongoDB database connection error:', error.message);
  });

// 💓 Health Check Endpoint - Keeps the server alive and monitors status
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.status(200).json({
    status: 'ok',
    message: 'Beauty Affiliate Backend is running',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    uptime: process.uptime()
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is awake and listening on port ${PORT}`);
  console.log(`💓 Health check available at http://localhost:${PORT}/api/health`);
});
