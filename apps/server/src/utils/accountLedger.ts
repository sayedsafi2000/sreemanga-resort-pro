import { Prisma } from '@prisma/client';

/**
 * Account ledger — simplified signed cashbook (Phase 4).
 *
 * ONE uniform rule everywhere: IN adds to the account balance, OUT subtracts.
 * No per-account-type sign branching. A single real event (payment, expense,
 * transfer) writes TWO entries so both the cash position AND the revenue/expense
 * tally update — bookkeeping convenience, not enforced double-entry.
 *
 * All writes happen inside the caller's prisma.$transaction, so a ledger failure
 * rolls back the originating payment/expense.
 */

// Payment method → cash/bank/mobile account code.
const METHOD_ACCOUNT: Record<string, string> = {
  CASH: '1001',
  BKASH: '1003',
  NAGAD: '1003',
  MOBILE_BANKING: '1003',
  CARD: '1002',
  BANK_TRANSFER: '1002',
  STRIPE: '1002',
};

// Business line → income account code.
const LINE_INCOME: Record<string, string> = {
  ROOM: '4001',
  RESTAURANT: '4002',
  DAY_LONG: '4003',
};

interface Entry {
  accountId: string;
  direction: 'IN' | 'OUT';
  amount: number;
  description?: string;
  businessLine?: string;
  referenceType?: string;
  referenceId?: string;
  createdById?: string;
}

// The ONLY place an account balance is mutated. One rule.
async function writeEntry(tx: Prisma.TransactionClient, e: Entry): Promise<void> {
  if (e.amount <= 0) return; // ignore zero/negative — callers pass positive magnitudes
  await tx.accountTransaction.create({
    data: {
      accountId: e.accountId,
      direction: e.direction,
      amount: e.amount,
      description: e.description,
      businessLine: e.businessLine as any,
      referenceType: e.referenceType,
      referenceId: e.referenceId,
      createdById: e.createdById,
    },
  });
  const delta = e.direction === 'IN' ? e.amount : -e.amount;
  await tx.account.update({
    where: { id: e.accountId },
    data: { currentBalance: { increment: delta } },
  });
}

async function accountByCode(tx: Prisma.TransactionClient, code: string) {
  return tx.account.findUnique({ where: { code } });
}

export interface RevenueEntry {
  amount: number;
  method: string;
  businessLine: string; // ROOM | RESTAURANT | DAY_LONG
  referenceType: string;
  referenceId: string;
  createdById?: string;
}

// Revenue: cash/bank IN + income IN. Silently skips if accounts are missing
// (e.g. chart of accounts not seeded) so it never breaks the core payment write.
export async function recordRevenue(
  tx: Prisma.TransactionClient,
  p: RevenueEntry
): Promise<void> {
  const cash = await accountByCode(tx, METHOD_ACCOUNT[p.method] || '1001');
  const income = await accountByCode(tx, LINE_INCOME[p.businessLine] || '4001');
  if (!cash || !income) return;

  await writeEntry(tx, {
    accountId: cash.id,
    direction: 'IN',
    amount: p.amount,
    businessLine: p.businessLine,
    referenceType: p.referenceType,
    referenceId: p.referenceId,
    description: `Payment received - ${p.referenceType}`,
    createdById: p.createdById,
  });
  await writeEntry(tx, {
    accountId: income.id,
    direction: 'IN',
    amount: p.amount,
    businessLine: p.businessLine,
    referenceType: p.referenceType,
    referenceId: p.referenceId,
    description: `Revenue - ${p.businessLine}`,
    createdById: p.createdById,
  });
}

export interface ExpenseEntry {
  amount: number;
  method: string;
  expenseAccountId?: string; // resolved Account id (EXPENSE); optional
  expenseAccountCode?: string; // or a code to resolve
  title: string;
  expenseId: string;
  createdById?: string;
}

// Expense: expense account IN + cash/bank OUT.
export async function recordExpense(
  tx: Prisma.TransactionClient,
  e: ExpenseEntry
): Promise<void> {
  const cash = await accountByCode(tx, METHOD_ACCOUNT[e.method] || '1001');
  let expenseAccountId = e.expenseAccountId;
  if (!expenseAccountId && e.expenseAccountCode) {
    const acc = await accountByCode(tx, e.expenseAccountCode);
    expenseAccountId = acc?.id;
  }
  if (!expenseAccountId) {
    // Fall back to the generic Miscellaneous expense account.
    const misc = await accountByCode(tx, '5006');
    expenseAccountId = misc?.id;
  }
  if (!cash || !expenseAccountId) return;

  await writeEntry(tx, {
    accountId: expenseAccountId,
    direction: 'IN',
    amount: e.amount,
    referenceType: 'EXPENSE',
    referenceId: e.expenseId,
    description: e.title,
    createdById: e.createdById,
  });
  await writeEntry(tx, {
    accountId: cash.id,
    direction: 'OUT',
    amount: e.amount,
    referenceType: 'EXPENSE',
    referenceId: e.expenseId,
    description: `Paid - ${e.title}`,
    createdById: e.createdById,
  });
}

export interface TransferEntry {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  createdById?: string;
}

// Transfer: from OUT + to IN.
export async function recordTransfer(
  tx: Prisma.TransactionClient,
  t: TransferEntry
): Promise<void> {
  await writeEntry(tx, {
    accountId: t.fromAccountId,
    direction: 'OUT',
    amount: t.amount,
    referenceType: 'TRANSFER',
    description: t.description,
    createdById: t.createdById,
  });
  await writeEntry(tx, {
    accountId: t.toAccountId,
    direction: 'IN',
    amount: t.amount,
    referenceType: 'TRANSFER',
    description: t.description,
    createdById: t.createdById,
  });
}

// Manual single-sided entry (from the account detail UI).
export async function recordManualEntry(
  tx: Prisma.TransactionClient,
  m: { accountId: string; direction: 'IN' | 'OUT'; amount: number; description?: string; createdById?: string }
): Promise<void> {
  await writeEntry(tx, {
    accountId: m.accountId,
    direction: m.direction,
    amount: m.amount,
    referenceType: 'MANUAL',
    description: m.description,
    createdById: m.createdById,
  });
}

export { METHOD_ACCOUNT, LINE_INCOME };
