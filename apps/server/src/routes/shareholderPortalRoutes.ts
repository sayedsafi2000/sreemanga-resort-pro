import { Router } from 'express';
import {
  getMyProfile,
  getMyProfitShares,
  getMySummary,
} from '../controllers/shareholderPortalController';

const router = Router();

// All routes require SHAREHOLDER (gated at mount in index.ts).
router.get('/me', getMyProfile);
router.get('/profit-shares', getMyProfitShares);
router.get('/summary', getMySummary);

export default router;
