import { Router } from 'express';
import {
  getPendingPayments,
  createPendingPayment,
  updatePendingPayment,
  deletePendingPayment,
  payNow,
} from '../controllers/pendingPaymentController';
import { authenticateToken } from '../middleware/auth';
import { roleCheck } from '../middleware/roleCheck';

const router = Router();

router.use(authenticateToken);
router.use(roleCheck(['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT']));

router.get('/', getPendingPayments);
router.post('/', createPendingPayment);
router.patch('/:id', updatePendingPayment);
router.delete('/:id', deletePendingPayment);
router.post('/:id/pay', payNow);

export default router;
