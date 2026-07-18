import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import bankRoutes from './routes/bank';
import transactionRoutes from './routes/transaction';
import { requireAuth } from './middleware/auth';

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ipay_simulation';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// /api/auth mixes public (send-otp, verify-otp) and protected routes, so it
// guards each protected route internally. Bank and transaction are all protected.
app.use('/api/auth', authRoutes);
app.use('/api/bank', requireAuth, bankRoutes);
app.use('/api/transaction', requireAuth, transactionRoutes);
