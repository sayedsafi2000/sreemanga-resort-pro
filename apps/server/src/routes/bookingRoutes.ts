import { Router } from 'express';
import {
  getAllBookings,
  getBooking,
  createBooking,
  updateBooking,
  deleteBooking,
} from '../controllers/bookingController';
import { roleCheck } from '../middleware/roleCheck';

const RB = ['SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST'] as const;

const router = Router();

router.get('/', roleCheck([...RB]), getAllBookings);
router.get('/:id', roleCheck([...RB]), getBooking);
router.post('/', roleCheck([...RB]), createBooking);
router.put('/:id', roleCheck([...RB]), updateBooking);
router.delete('/:id', roleCheck([...RB]), deleteBooking);

export default router;