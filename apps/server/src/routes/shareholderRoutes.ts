import { Router } from 'express';
import {
  listShareholders,
  getShareholder,
  createShareholder,
  updateShareholder,
  deleteShareholder,
} from '../controllers/shareholderController';
import {
  listDistributions,
  getDistribution,
  createDistribution,
  recalcDistribution,
  setCustomShares,
  approveDistribution,
  distributeDistribution,
  cancelDistribution,
} from '../controllers/profitDistributionController';
import { roleCheck } from '../middleware/roleCheck';

const VIEW = ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'] as const;
const ADMIN = ['SUPER_ADMIN'] as const;
const DIST_WRITE = ['SUPER_ADMIN', 'MANAGER'] as const;

const router = Router();

// Distributions (before /:id capture on shareholders is not an issue — separate paths)
router.get('/distributions', roleCheck([...VIEW]), listDistributions);
router.get('/distributions/:id', roleCheck([...VIEW]), getDistribution);
router.post('/distributions', roleCheck([...DIST_WRITE]), createDistribution);
router.post('/distributions/:id/recalculate', roleCheck([...DIST_WRITE]), recalcDistribution);
router.post('/distributions/:id/custom-shares', roleCheck([...DIST_WRITE]), setCustomShares);
router.post('/distributions/:id/approve', roleCheck([...ADMIN]), approveDistribution);
router.post('/distributions/:id/distribute', roleCheck([...ADMIN]), distributeDistribution);
router.post('/distributions/:id/cancel', roleCheck([...ADMIN]), cancelDistribution);

// Shareholders
router.get('/', roleCheck(['SUPER_ADMIN', 'MANAGER']), listShareholders);
router.get('/:id', roleCheck(['SUPER_ADMIN', 'MANAGER']), getShareholder);
router.post('/', roleCheck([...ADMIN]), createShareholder);
router.patch('/:id', roleCheck([...ADMIN]), updateShareholder);
router.delete('/:id', roleCheck([...ADMIN]), deleteShareholder);

export default router;
