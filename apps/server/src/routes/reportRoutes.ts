import { Router } from 'express';
import {
  getRevenueReport,
  getOccupancyReport,
  getBookingStats,
  getExpenseReport,
  getProfitLoss,
  getBalanceSheet,
  getRevenueByLine,
  getAccountBalances,
  getDailySummary,
} from '../controllers/reportController';

const router = Router();

router.get('/revenue', getRevenueReport);
router.get('/occupancy', getOccupancyReport);
router.get('/bookings', getBookingStats);
router.get('/expenses', getExpenseReport);
router.get('/profit-loss', getProfitLoss);
router.get('/balance-sheet', getBalanceSheet);
router.get('/revenue-by-line', getRevenueByLine);
router.get('/account-balances', getAccountBalances);
router.get('/daily-summary', getDailySummary);

export default router;
