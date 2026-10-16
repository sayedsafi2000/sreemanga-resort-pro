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

export interface RefundLedgerEntry {
  amount: number;
  method: string;
  businessLine?: string | null; // ROOM | RESTAURANT | DAY_LONG
  refundId: string;
  createdById?: string;
  /** true = undo a refund (cash IN + income IN, referenceType REFUND_REVERSAL). */
  reverse?: boolean;
}

// Refund: cash/bank OUT + income OUT — the mirror image of recordRevenue. Skips silently when
// the chart of accounts is missing, like every other helper here.
export async function recordRefund(
  tx: Prisma.TransactionClient,
  r: RefundLedgerEntry
): Promise<void> {
  const line = r.businessLine || 'ROOM';
  const cash = await accountByCode(tx, METHOD_ACCOUNT[r.method] || '1001');
  const income = await accountByCode(tx, LINE_INCOME[line] || '4001');
  if (!cash || !income) return;
  const direction = r.reverse ? 'IN' : 'OUT';
  const referenceType = r.reverse ? 'REFUND_REVERSAL' : 'REFUND';

  await writeEntry(tx, {
    accountId: cash.id,
    direction,
    amount: r.amount,
    businessLine: line,
    referenceType,
    referenceId: r.refundId,
    description: r.reverse ? `Refund reversed - ${line}` : `Refund paid - ${line}`,
    createdById: r.createdById,
  });
  await writeEntry(tx, {
    accountId: income.id,
    direction,
    amount: r.amount,
    businessLine: line,
    referenceType,
    referenceId: r.refundId,
    description: r.reverse ? `Revenue restored - ${line}` : `Revenue refunded - ${line}`,
    createdById: r.createdById,
  });
}

export interface FinanceEntryLike {
  id: string;
  type: string; // FinanceEntryType
  amount: number;
  method?: string | null;
  description?: string | null;
}

type Posting = { account: 'CASH' | string; direction: 'IN' | 'OUT' };

// Both sides of each FinanceEntry type. 'CASH' resolves through METHOD_ACCOUNT; codes are the
// seeded chart of accounts (1100 Fixed Assets, 2000 Current Liabilities, 3001 Owner's Capital).
const FINANCE_POSTINGS: Record<string, Posting[]> = {
  OPENING_CASH: [{ account: 'CASH', direction: 'IN' }, { account: '3001', direction: 'IN' }],
  OPENING_FIXED_ASSET: [{ account: '1100', direction: 'IN' }, { account: '3001', direction: 'IN' }],
  OPENING_LIABILITY: [{ account: '2000', direction: 'IN' }, { account: '3001', direction: 'OUT' }],
  LOAN_RECEIVED: [{ account: 'CASH', direction: 'IN' }, { account: '2000', direction: 'IN' }],
  LOAN_REPAID: [{ account: 'CASH', direction: 'OUT' }, { account: '2000', direction: 'OUT' }],
  CAPITAL_IN: [{ account: 'CASH', direction: 'IN' }, { account: '3001', direction: 'IN' }],
  CAPITAL_OUT: [{ account: 'CASH', direction: 'OUT' }, { account: '3001', direction: 'OUT' }],
};

const FINANCE_LABEL: Record<string, string> = {
  OPENING_CASH: 'Opening cash balance',
  OPENING_FIXED_ASSET: 'Opening fixed assets',
  OPENING_LIABILITY: 'Opening liability',
  LOAN_RECEIVED: 'Loan received',
  LOAN_REPAID: 'Loan repaid',
  CAPITAL_IN: 'Owner capital in',
  CAPITAL_OUT: 'Owner capital out',
};

// FinanceEntry (Financial Report → Other entries): posts both sides; `sign = -1` writes the exact
// reversal (used when an entry is deleted). Posts nothing unless every account exists.
export async function recordFinanceEntry(
  tx: Prisma.TransactionClient,
  e: FinanceEntryLike,
  sign: 1 | -1 = 1,
  createdById?: string
): Promise<void> {
  const postings = FINANCE_POSTINGS[e.type];
  if (!postings) return;
  const resolved: { accountId: string; direction: 'IN' | 'OUT' }[] = [];
  for (const p of postings) {
    const code = p.account === 'CASH' ? METHOD_ACCOUNT[e.method || 'CASH'] || '1001' : p.account;
    const acc = await accountByCode(tx, code);
    if (!acc) return;
    const direction = sign === 1 ? p.direction : p.direction === 'IN' ? 'OUT' : 'IN';
    resolved.push({ accountId: acc.id, direction });
  }
  const label = `${sign === -1 ? 'Reversed: ' : ''}${FINANCE_LABEL[e.type] || e.type}${e.description ? ` - ${e.description}` : ''}`;
  for (const r of resolved) {
    await writeEntry(tx, {
      accountId: r.accountId,
      direction: r.direction,
      amount: e.amount,
      referenceType: 'FINANCE_ENTRY',
      referenceId: e.id,
      description: label,
      createdById,
    });
  }
}

export { METHOD_ACCOUNT, LINE_INCOME };
