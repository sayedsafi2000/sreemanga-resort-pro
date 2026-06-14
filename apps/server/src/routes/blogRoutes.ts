import { Router } from 'express';
import {
  listBlogsAdmin,
  createBlog,
  updateBlog,
  deleteBlog,
} from '../controllers/blogController';
import { roleCheck } from '../middleware/roleCheck';

const router = Router();
const superOnly = ['SUPER_ADMIN', 'MANAGER'] as const;

router.get('/', roleCheck([...superOnly]), listBlogsAdmin);
router.post('/', roleCheck([...superOnly]), createBlog);
router.put('/:id', roleCheck([...superOnly]), updateBlog);
router.delete('/:id', roleCheck([...superOnly]), deleteBlog);

export default router;
