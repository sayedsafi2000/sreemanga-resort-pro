import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import roomRoutes from './routes/roomRoutes';
import bookingRoutes from './routes/bookingRoutes';
import guestRoutes from './routes/guestRoutes';
import paymentRoutes from './routes/paymentRoutes';
import restaurantRoutes from './routes/restaurantRoutes';
import settingsRoutes from './routes/settingsRoutes';
import reportRoutes from './routes/reportRoutes';
import publicRoutes from './routes/publicRoutes';
import galleryRoutes from './routes/galleryRoutes';
import nearbySpotsRoutes from './routes/nearbySpotsRoutes';
import blogRoutes from './routes/blogRoutes';
import expenditureRoutes from './routes/expenditureRoutes';
import salaryRoutes from './routes/salaryRoutes';
import pendingPaymentRoutes from './routes/pendingPaymentRoutes';
import brandingRoutes from './routes/brandingRoutes';
import { authenticateToken } from './middleware/auth';
import { roleCheck } from './middleware/roleCheck';

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet());
app.use(cors({
  origin:
    process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) ||
    [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:8000',
      'http://localhost:8001',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3003',
      'http://127.0.0.1:8000',
      'http://127.0.0.1:8001',
    ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Public routes (no auth required)
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);

// Protected routes
app.use('/api/users', authenticateToken, roleCheck(['SUPER_ADMIN']), userRoutes);
app.use('/api/rooms', authenticateToken, roomRoutes);
app.use('/api/bookings', authenticateToken, bookingRoutes);
app.use('/api/guests', authenticateToken, guestRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/restaurant', authenticateToken, restaurantRoutes);
app.use('/api/settings', authenticateToken, roleCheck(['SUPER_ADMIN', 'MANAGER']), settingsRoutes);
app.use('/api/gallery', authenticateToken, galleryRoutes);
app.use('/api/nearby-spots', authenticateToken, nearbySpotsRoutes);
app.use('/api/blogs', authenticateToken, blogRoutes);
app.use('/api/reports', authenticateToken, roleCheck(['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT']), reportRoutes);
app.use('/api/expenditures', authenticateToken, roleCheck(['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT']), expenditureRoutes);
app.use('/api/salaries', authenticateToken, roleCheck(['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT']), salaryRoutes);
app.use('/api/pending-payments', authenticateToken, roleCheck(['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT']), pendingPaymentRoutes);
app.use('/api/branding', brandingRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

export default app;