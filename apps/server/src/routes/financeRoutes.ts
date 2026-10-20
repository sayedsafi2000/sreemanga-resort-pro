import { Router } from 'express';
import { roleCheck } from '../middleware/roleCheck';
import {
  getStatement,
  listFinanceEntries,
  createFinanceEntry,
  updateFinanceEntry,
  deleteFinanceEntry,
} from '../controllers/financeController';

// Mounted in index.ts for SUPER_ADMIN / MANAGER / ACCOUNTANT (+ audit('Finance')).
const router = Router();

router.get('/statement', getStatement);
router.get('/entries', listFinanceEntries);
router.post('/entries', createFinanceEntry);
router.patch('/entries/:id', updateFinanceEntry);
router.delete('/entries/:id', roleCheck(['SUPER_ADMIN', 'MANAGER']), deleteFinanceEntry);

export default router;
