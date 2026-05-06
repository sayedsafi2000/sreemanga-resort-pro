import { Router } from 'express';
import {
  getRevenueReport,
  getOccupancyReport,
  getBookingStats,
} from '../controllers/reportController';

const router = Router();

router.get('/revenue', getRevenueReport);
router.get('/occupancy', getOccupancyReport);
router.get('/bookings', getBookingStats);

export default router;