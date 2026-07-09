import { Router } from 'express';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  checkAvailability,
  listBookings,
  getBooking,
  createBooking,
  updateBooking,
  deleteBooking,
} from '../controllers/dayLongController';
import { roleCheck } from '../middleware/roleCheck';

const MANAGE = ['SUPER_ADMIN', 'MANAGER'] as const;
const BOOK = ['SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST'] as const;

const router = Router();

// Products
router.get('/products', listProducts);
router.get('/products/:id', getProduct);
router.post('/products', roleCheck([...MANAGE]), createProduct);
router.patch('/products/:id', roleCheck([...MANAGE]), updateProduct);
router.delete('/products/:id', roleCheck(['SUPER_ADMIN']), deleteProduct);

// Availability
router.get('/availability', checkAvailability);

// Bookings
router.get('/bookings', listBookings);
router.get('/bookings/:id', getBooking);
router.post('/bookings', roleCheck([...BOOK]), createBooking);
router.patch('/bookings/:id', updateBooking);
router.delete('/bookings/:id', roleCheck(['SUPER_ADMIN']), deleteBooking);

export default router;
