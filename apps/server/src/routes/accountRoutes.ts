import { Router } from 'express';
import {
  listAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountTransactions,
  addManualTransaction,
  transfer,
  listReceivables,
  createReceivable,
  collectReceivable,
} from '../controllers/accountController';
import { roleCheck } from '../middleware/roleCheck';

const WRITE = ['SUPER_ADMIN', 'MANAGER'] as const;
const TXN = ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'] as const;

const router = Router();

// Receivables (before /:id so it isn't captured as an account id)
router.get('/receivables', listReceivables);
router.post('/receivables', roleCheck([...TXN]), createReceivable);
router.patch('/receivables/:id/collect', roleCheck([...TXN]), collectReceivable);

// Transfers
router.post('/transfer', roleCheck([...TXN]), transfer);

// Accounts
router.get('/', listAccounts);
router.post('/', roleCheck([...WRITE]), createAccount);
router.get('/:id', getAccount);
router.patch('/:id', roleCheck([...WRITE]), updateAccount);
router.delete('/:id', roleCheck(['SUPER_ADMIN']), deleteAccount);

// Account transactions
router.get('/:id/transactions', getAccountTransactions);
router.post('/:id/transactions', roleCheck([...TXN]), addManualTransaction);

export default router;
