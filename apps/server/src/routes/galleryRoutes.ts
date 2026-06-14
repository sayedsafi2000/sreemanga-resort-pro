import { Router } from 'express';
import {
  listGalleryAdmin,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  listGalleryCategories,
} from '../controllers/galleryController';
import { authenticateToken } from '../middleware/auth';
import { roleCheck } from '../middleware/roleCheck';

const router = Router();
const superOnly = ['SUPER_ADMIN'] as const;

router.use(authenticateToken);

router.get('/', roleCheck([...superOnly]), listGalleryAdmin);
router.get('/categories', roleCheck([...superOnly]), listGalleryCategories);
router.post('/', roleCheck([...superOnly]), createGalleryItem);
router.put('/:id', roleCheck([...superOnly]), updateGalleryItem);
router.delete('/:id', roleCheck([...superOnly]), deleteGalleryItem);

export default router;
