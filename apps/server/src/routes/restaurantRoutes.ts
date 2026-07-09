import { Router } from 'express';
import {
  getAllMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createOrder,
  getOrders,
  updateOrder,
  recordOrderPayment,
  getOrderPayments,
} from '../controllers/restaurantController';
import { roleCheck } from '../middleware/roleCheck';

const R_ALL = ['SUPER_ADMIN', 'MANAGER', 'RESTAURANT_STAFF'] as const;
const R_MENU_WRITE = ['SUPER_ADMIN', 'MANAGER'] as const;
const R_PAY = ['SUPER_ADMIN', 'MANAGER', 'RESTAURANT_STAFF', 'RECEPTIONIST'] as const;

const router = Router();

router.get('/menu', roleCheck([...R_ALL]), getAllMenuItems);
router.get('/menu/:id', roleCheck([...R_ALL]), getMenuItem);
router.post('/menu', roleCheck([...R_MENU_WRITE]), createMenuItem);
router.put('/menu/:id', roleCheck([...R_MENU_WRITE]), updateMenuItem);
router.delete('/menu/:id', roleCheck([...R_MENU_WRITE]), deleteMenuItem);

router.post('/orders', roleCheck([...R_ALL]), createOrder);
router.get('/orders', roleCheck([...R_ALL]), getOrders);
router.put('/orders/:id', roleCheck([...R_ALL]), updateOrder);
router.get('/orders/:id/payments', roleCheck([...R_PAY]), getOrderPayments);
router.post('/orders/:id/payments', roleCheck([...R_PAY]), recordOrderPayment);

export default router;