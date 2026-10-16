import { Router } from 'express';
import {
  getAllPayments,
  getPayment,
  createPayment,
  updatePayment,
  backfillPayments,
  refundPayment,
  listRefunds,
  deleteRefund,
} from '../controllers/paymentController';
import { roleCheck } from '../middleware/roleCheck';

const PAYMENT_VIEW_CREATE = ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'RECEPTIONIST'] as const;
const PAYMENT_UPDATE = ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'] as const;

const router = Router();

router.get('/', roleCheck([...PAYMENT_VIEW_CREATE]), getAllPayments);
// Static paths must be registered before `/:id` or Express treats "refunds" as a payment id.
router.get('/refunds', roleCheck([...PAYMENT_VIEW_CREATE]), listRefunds);
router.delete('/refunds/:id', roleCheck(['SUPER_ADMIN']), deleteRefund);
router.post('/backfill', roleCheck([...PAYMENT_UPDATE]), backfillPayments);
router.get('/:id', roleCheck([...PAYMENT_VIEW_CREATE]), getPayment);
router.post('/', roleCheck([...PAYMENT_VIEW_CREATE]), createPayment);
router.put('/:id', roleCheck([...PAYMENT_UPDATE]), updatePayment);
router.post('/:id/refund', roleCheck([...PAYMENT_UPDATE]), refundPayment);

export default router;
