import { Router } from 'express';
import {
  getPendingPayments,
  createPendingPayment,
  updatePendingPayment,
  deletePendingPayment,
  payNow,
} from '../controllers/pendingPaymentController';

const router = Router();

router.get('/', getPendingPayments);
router.post('/', createPendingPayment);
router.patch('/:id', updatePendingPayment);
router.delete('/:id', deletePendingPayment);
router.post('/:id/pay', payNow);

export default router;
