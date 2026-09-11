import { Router } from 'express';
import {
  listTiers,
  updateTier,
  listShareholders,
  getShareholder,
  createShareholder,
  updateShareholder,
  deleteShareholder,
  addHolding,
  addHoldingPayment,
  cancelHolding,
  deleteHolding,
} from '../controllers/shareholderController';
import {
  listDistributions,
  getDistribution,
  createDistribution,
  recalcDistribution,
  setShareOverrides,
  approveDistribution,
  distributeDistribution,
  cancelDistribution,
} from '../controllers/profitDistributionController';
import { roleCheck } from '../middleware/roleCheck';

const VIEW = ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'] as const;
const ADMIN = ['SUPER_ADMIN'] as const;
const DIST_WRITE = ['SUPER_ADMIN', 'MANAGER'] as const;

const router = Router();

// Share tiers (Gold / Platinum): prices, caps, sold/available, capital totals.
router.get('/tiers', roleCheck([...VIEW]), listTiers);
router.patch('/tiers/:id', roleCheck([...ADMIN]), updateTier);

// Profit distributions.
router.get('/distributions', roleCheck([...VIEW]), listDistributions);
router.get('/distributions/:id', roleCheck([...VIEW]), getDistribution);
router.post('/distributions', roleCheck([...DIST_WRITE]), createDistribution);
router.post('/distributions/:id/recalculate', roleCheck([...DIST_WRITE]), recalcDistribution);
router.post('/distributions/:id/overrides', roleCheck([...DIST_WRITE]), setShareOverrides);
router.post('/distributions/:id/approve', roleCheck([...ADMIN]), approveDistribution);
router.post('/distributions/:id/distribute', roleCheck([...ADMIN]), distributeDistribution);
router.post('/distributions/:id/cancel', roleCheck([...ADMIN]), cancelDistribution);

// Holdings (units bought by a shareholder) — instalments, cancel/refund, delete.
router.post('/holdings/:holdingId/payments', roleCheck([...ADMIN]), addHoldingPayment);
router.post('/holdings/:holdingId/cancel', roleCheck([...ADMIN]), cancelHolding);
router.delete('/holdings/:holdingId', roleCheck([...ADMIN]), deleteHolding);
router.post('/:id/holdings', roleCheck([...ADMIN]), addHolding);

// Shareholders.
router.get('/', roleCheck(['SUPER_ADMIN', 'MANAGER']), listShareholders);
router.get('/:id', roleCheck(['SUPER_ADMIN', 'MANAGER']), getShareholder);
router.post('/', roleCheck([...ADMIN]), createShareholder);
router.patch('/:id', roleCheck([...ADMIN]), updateShareholder);
router.delete('/:id', roleCheck([...ADMIN]), deleteShareholder);

export default router;
