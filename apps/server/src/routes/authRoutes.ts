import { Router } from 'express';
import { login, register, getProfile } from '../controllers/authController';
import { requestPasswordReset, resetPassword, verifyResetToken } from '../controllers/passwordResetController';
import { authenticateToken } from '../middleware/auth';
import { roleCheck } from '../middleware/roleCheck';

const router = Router();

router.post('/login', login);
router.post('/register', authenticateToken, roleCheck(['SUPER_ADMIN']), register);
router.get('/profile', authenticateToken, getProfile);

// Password reset routes
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.get('/verify-reset-token', verifyResetToken);

export default router;