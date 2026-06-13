import { Router } from 'express';
import { getBrandingSettings, updateBrandingSettings } from '../controllers/brandingController';
import { authenticateToken } from '../middleware/auth';
import { roleCheck } from '../middleware/roleCheck';

const router = Router();

// Get branding settings (authenticated users)
router.get('/', authenticateToken, getBrandingSettings);

// Update branding settings (Super Admin only)
router.put('/', authenticateToken, roleCheck(['SUPER_ADMIN', 'MANAGER']), updateBrandingSettings);

export default router;
