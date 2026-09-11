import { Router } from 'express';
import {
  getAllBookings,
  getBooking,
  getRoomAvailability,
  getMonthlyCalendar,
  createBooking,
  updateBooking,
  deleteBooking,
} from '../controllers/bookingController';
import { roleCheck } from '../middleware/roleCheck';

// Room bookings: front-desk roles write; accountants may read (payments reconcile against bookings).
const RB = ['SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST'] as const;
const RB_READ = [...RB, 'ACCOUNTANT'] as const;

const router = Router();

// Specific paths before the /:id capture.
router.get('/room-availability', roleCheck([...RB_READ]), getRoomAvailability);
router.get('/calendar', roleCheck([...RB_READ]), getMonthlyCalendar);
router.get('/', roleCheck([...RB_READ]), getAllBookings);
router.get('/:id', roleCheck([...RB_READ]), getBooking);
router.post('/', roleCheck([...RB]), createBooking);
router.put('/:id', roleCheck([...RB]), updateBooking);
router.delete('/:id', roleCheck([...RB]), deleteBooking);

export default router;
