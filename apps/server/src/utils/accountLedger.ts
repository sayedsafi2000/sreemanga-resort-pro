import { Prisma } from '@prisma/client';

/**
 * Account ledger (simplified signed cashbook).
 *
 * STUB until Phase 4 (Accounts). The AccountTransaction model does not exist
 * yet, so these functions are intentionally no-ops. Callers already invoke them
 * inside their write transactions so that Phase 4 only has to fill in the body —
 * no call sites change.
 *
 * Phase 4 will implement: writeEntry (IN adds / OUT subtracts, one uniform rule),
 * recordRevenue (cash IN + income IN), recordExpense (expense IN + cash OUT),
 * recordTransfer (from OUT + to IN).
 */

export interface RevenueEntry {
  amount: number;
  method: string;
  businessLine: string; // ROOM | RESTAURANT | DAY_LONG
  referenceType: string;
  referenceId: string;
  createdById?: string;
}

export async function recordRevenue(
  _tx: Prisma.TransactionClient,
  _entry: RevenueEntry
): Promise<void> {
  // no-op until Phase 4
}

export interface ExpenseEntry {
  amount: number;
  method: string;
  expenseAccountId: string;
  title: string;
  expenseId: string;
  createdById?: string;
}

export async function recordExpense(
  _tx: Prisma.TransactionClient,
  _entry: ExpenseEntry
): Promise<void> {
  // no-op until Phase 4
}
