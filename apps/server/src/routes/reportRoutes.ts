import { Router } from 'express';
import {
  getRevenueReport,
  getOccupancyReport,
  getBookingStats,
  getExpenseReport,
} from '../controllers/reportController';

const router = Router();

router.get('/revenue', getRevenueReport);
router.get('/occupancy', getOccupancyReport);
router.get('/bookings', getBookingStats);
router.get('/expenses', getExpenseReport);

export default router;