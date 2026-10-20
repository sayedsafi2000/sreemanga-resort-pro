import { Router } from 'express';
import {
  listAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountTransactions,
  addManualTransaction,
  updateTransaction,
  deleteTransaction,
  transfer,
  listReceivables,
  createReceivable,
  updateReceivable,
  deleteReceivable,
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
router.patch('/receivables/:id', roleCheck([...TXN]), updateReceivable);
router.delete('/receivables/:id', roleCheck([...WRITE]), deleteReceivable);

// Transfers
router.post('/transfer', roleCheck([...TXN]), transfer);

// Ledger rows by id (user-made MANUAL / TRANSFER only) — before /:id for the same reason.
router.patch('/transactions/:id', roleCheck([...TXN]), updateTransaction);
router.delete('/transactions/:id', roleCheck([...WRITE]), deleteTransaction);

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
