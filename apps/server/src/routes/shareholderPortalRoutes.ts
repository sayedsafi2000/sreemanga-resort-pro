import { Router } from 'express';
import {
  getMyProfile,
  getMyProfitShares,
  getMySummary,
  getMyVouchers,
} from '../controllers/shareholderPortalController';

const router = Router();

// All routes require SHAREHOLDER (gated at mount in index.ts).
router.get('/me', getMyProfile);
router.get('/profit-shares', getMyProfitShares);
router.get('/summary', getMySummary);
router.get('/vouchers', getMyVouchers);

export default router;
