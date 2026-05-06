import { Router } from 'express';
import {
  getAllGuests,
  getGuest,
  createGuest,
  updateGuest,
  deleteGuest,
} from '../controllers/guestController';
import { roleCheck } from '../middleware/roleCheck';

const RG = ['SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST'] as const;

const router = Router();

router.get('/', roleCheck([...RG]), getAllGuests);
router.get('/:id', roleCheck([...RG]), getGuest);
router.post('/', roleCheck([...RG]), createGuest);
router.put('/:id', roleCheck([...RG]), updateGuest);
router.delete('/:id', roleCheck([...RG]), deleteGuest);

export default router;