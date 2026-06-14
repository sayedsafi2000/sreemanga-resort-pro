import { Router } from 'express';
import {
  listNearbySpotsAdmin,
  createNearbySpot,
  updateNearbySpot,
  deleteNearbySpot,
} from '../controllers/nearbySpotsController';
import { authenticateToken } from '../middleware/auth';
import { roleCheck } from '../middleware/roleCheck';

const router = Router();
const superOnly = ['SUPER_ADMIN'] as const;

router.use(authenticateToken);

router.get('/', roleCheck([...superOnly]), listNearbySpotsAdmin);
router.post('/', roleCheck([...superOnly]), createNearbySpot);
router.put('/:id', roleCheck([...superOnly]), updateNearbySpot);
router.delete('/:id', roleCheck([...superOnly]), deleteNearbySpot);

export default router;
