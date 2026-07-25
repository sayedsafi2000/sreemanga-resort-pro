import { Router } from 'express';
import { roleCheck } from '../middleware/roleCheck';
import {
  listVouchers,
  getVoucher,
  createVoucher,
  updateVoucher,
  deactivateVoucher,
  validateVoucher,
  listRedemptions,
  listMyVouchers,
  lookupVouchersByEmail,
} from '../controllers/voucherController';

const MANAGE = ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'] as const;
const APPLY = ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'RECEPTIONIST', 'RESTAURANT_STAFF'] as const;
// Any authenticated role mounted under /api/vouchers (including SHAREHOLDER) can list mine.
const ALL_AUTH = [
  'SUPER_ADMIN',
  'MANAGER',
  'ACCOUNTANT',
  'RECEPTIONIST',
  'RESTAURANT_STAFF',
  'HOUSEKEEPING',
  'SHAREHOLDER',
] as const;

const router = Router();

router.get('/mine', roleCheck([...ALL_AUTH]), listMyVouchers);
router.get('/lookup', roleCheck([...APPLY]), lookupVouchersByEmail);
router.get('/', roleCheck([...MANAGE]), listVouchers);
router.post('/validate', roleCheck([...APPLY]), validateVoucher);
router.get('/:id', roleCheck([...MANAGE]), getVoucher);
router.get('/:id/redemptions', roleCheck([...MANAGE]), listRedemptions);
router.post('/', roleCheck([...MANAGE]), createVoucher);
router.patch('/:id', roleCheck([...MANAGE]), updateVoucher);
router.delete('/:id', roleCheck([...MANAGE]), deactivateVoucher);

export default router;
