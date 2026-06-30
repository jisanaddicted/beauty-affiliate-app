import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import affiliateRoutes from './routes/affiliateRoutes.js';
import orderRoutes from './routes/orderRoutes.js'; 
import productRoutes from './routes/productRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import payoutRoutes from './routes/payout.js'; // 📥 Imported the payout route module

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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is awake and listening on port ${PORT}`);
});