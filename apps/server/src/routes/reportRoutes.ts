import { Router } from 'express';
import {
  getRevenueReport,
  getOccupancyReport,
  getBookingStats,
  getExpenseReport,
} from '../controllers/reportController';
import { authenticateToken } from '../middleware/auth';
import { roleCheck } from '../middleware/roleCheck';

const router = Router();

router.use(authenticateToken);
router.use(roleCheck(['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT']));

router.get('/revenue', getRevenueReport);
router.get('/occupancy', getOccupancyReport);
router.get('/bookings', getBookingStats);
router.get('/expenses', getExpenseReport);

export default router;
