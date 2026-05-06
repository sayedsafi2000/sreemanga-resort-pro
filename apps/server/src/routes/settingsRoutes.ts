import { Router } from 'express';
import {
  getAllSettings,
  getSetting,
  createSetting,
  updateSetting,
  bulkUpdateSettings,
} from '../controllers/settingsController';

const router = Router();

router.get('/', getAllSettings);
router.put('/bulk', bulkUpdateSettings);
router.get('/:key', getSetting);
router.post('/', createSetting);
router.put('/:key', updateSetting);

export default router;