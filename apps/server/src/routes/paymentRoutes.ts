import { Router } from 'express';
import {
  getAllPayments,
  getPayment,
  createPayment,
  updatePayment,
} from '../controllers/paymentController';
import { roleCheck } from '../middleware/roleCheck';

const PAYMENT_VIEW_CREATE = ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'RECEPTIONIST'] as const;
const PAYMENT_UPDATE = ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'] as const;

const router = Router();

router.get('/', roleCheck([...PAYMENT_VIEW_CREATE]), getAllPayments);
router.get('/:id', roleCheck([...PAYMENT_VIEW_CREATE]), getPayment);
router.post('/', roleCheck([...PAYMENT_VIEW_CREATE]), createPayment);
router.put('/:id', roleCheck([...PAYMENT_UPDATE]), updatePayment);

export default router;