import { Router } from 'express';
import {
  getAllStaffSalaries,
  getStaffSalaryByUser,
  getAllStaffWithSalaries,
  createSalaryPayment,
  markSalaryPaid,
  bulkPaySalaries,
  deleteSalary,
  getSalaryStats,
} from '../controllers/salaryController';
import { authenticateToken } from '../middleware/auth';
import { roleCheck } from '../middleware/roleCheck';

const router = Router();

router.use(authenticateToken);
router.use(roleCheck(['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT']));

router.get('/stats', getSalaryStats);
router.get('/staff', getAllStaffWithSalaries);
router.get('/', getAllStaffSalaries);
router.get('/user/:userId', getStaffSalaryByUser);
router.post('/bulk-pay', bulkPaySalaries);
router.post('/', createSalaryPayment);
router.patch('/:id/mark-paid', markSalaryPaid);
router.delete('/:id', deleteSalary);

export default router;
