import { Router } from 'express';
import {
  getAllRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  checkAvailability,
} from '../controllers/roomController';
import { getAvailabilityCalendar } from '../controllers/publicController';
import { roleCheck } from '../middleware/roleCheck';

const R_READ = ['SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING', 'RESTAURANT_STAFF'] as const;
const R_WRITE = ['SUPER_ADMIN', 'MANAGER'] as const;
const R_STATUS = ['SUPER_ADMIN', 'MANAGER', 'HOUSEKEEPING'] as const;

const router = Router();

router.get('/', roleCheck([...R_READ]), getAllRooms);
router.get('/availability', roleCheck([...R_READ]), checkAvailability);
router.get('/availability-calendar', roleCheck([...R_READ]), getAvailabilityCalendar);
router.get('/:id', roleCheck([...R_READ]), getRoom);
router.post('/', roleCheck([...R_WRITE]), createRoom);
router.put('/:id', roleCheck([...R_STATUS]), updateRoom);
router.delete('/:id', roleCheck([...R_WRITE]), deleteRoom);

export default router;