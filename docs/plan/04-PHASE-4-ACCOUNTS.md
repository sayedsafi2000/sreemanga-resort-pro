# Phase 4: Accounts System (Simplified Signed Cashbook)

**Goal:** Track all money movement across Cash, Bank, Mobile Banking accounts. Provide Receivable/Payable management, revenue segmentation by business line, and a computed Balance Sheet estimate.

**Depends on:** Phase 0 (Chart of Accounts model), Phase 1 (Day Long revenue), Phase 2 (Restaurant revenue), Phase 3 (Inventory → cost of goods).

**Accounting model (decided):** **Simplified signed cashbook** — NOT strict double-entry. Every account keeps a running balance; every transaction is `IN` (+amount) or `OUT` (−amount) relative to one account. **One uniform rule everywhere** — no per-account-type sign branching. This deliberately trades accountant-grade guarantees (trial balance must net to zero) for simplicity. The Balance Sheet is an **estimate** built from account balances + opening balances.

**Effort:** ~5-6 days

---

## Why not double-entry

The earlier draft mixed two contradictory conventions (`DEBIT = money in` vs the standard `DEBIT increases assets, decreases income`) and applied a single `DEBIT? +1 : −1` factor to every account type. Under that logic income accounts drift negative and the balance-sheet equation never holds. The signed cashbook below drops DEBIT/CREDIT vocabulary entirely and uses ONE rule, so the bug cannot recur.

---

## Architecture

```
                   ┌─────────────────────────┐
                   │    CHART OF ACCOUNTS     │
                   │  (Hierarchical tree)     │
                   ├─────────────────────────┤
                   │ Assets: Cash, Bank,      │
                   │   Mobile Banking,        │
                   │   Receivables, Fixed     │
                   │ Liabilities: Payables    │
                   │ Equity: Capital,         │
                   │   Retained Earnings      │
                   │ Income: Room, Restaurant,│
                   │   Day Long               │
                   │ Expenses: Utilities,     │
                   │   Salary, Maintenance,   │
                   │   Food/Inventory COGS    │
                   └───────────┬─────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
   │  TRANSACTIONS │   │  RECEIVABLES │   │   PAYABLES   │
   │  (IN / OUT)   │   │  (unpaid due)│   │  (bills due) │
   │              │   │              │   │              │
   │ Cash In/Out  │   │ Booking due  │   │ Pending      │
   │ Bank Deposit │   │ Day Long due │   │   Payments   │
   │ Transfer     │   │ Restaurant   │   │ Supplier     │
   │ Revenue tally│   │   tab        │   │   Bills      │
   │ Expense tally│   │              │   │ Accrued      │
   └──────────────┘   └──────────────┘   └──────────────┘
```

---

## Schema Additions

```prisma
enum TxnDirection {
  IN    // money into this account   → balance += amount
  OUT   // money out of this account  → balance -= amount
}

model AccountTransaction {
  id              String          @id @default(uuid())
  accountId       String
  account         Account         @relation(fields: [accountId], references: [id])
  direction       TxnDirection    // IN or OUT, relative to THIS account
  amount          Float           // always positive
  description     String?
  businessLine    BusinessLine?   // ROOM | RESTAURANT | DAY_LONG (revenue segmentation)
  referenceType   String?         // "BOOKING" | "RESTAURANT_ORDER" | "DAY_LONG_BOOKING" | "EXPENSE" | "TRANSFER" | "INVOICE" | "DISTRIBUTION"
  referenceId     String?         // UUID of referenced entity
  transactionDate DateTime        @default(now())
  createdById     String?
  createdBy       User?           @relation(fields: [createdById], references: [id])
  createdAt       DateTime        @default(now())

  @@index([accountId])
  @@index([transactionDate])
  @@index([businessLine])
  @@index([referenceType, referenceId])
}
```

### The ONE rule

```
balance change = (direction === IN) ? +amount : -amount
Account.currentBalance = openingBalance + SUM(IN) - SUM(OUT)
```

Applied identically to every account type. Interpretation by type:

| Account type | IN means | OUT means | Balance reads as |
|--------------|----------|-----------|------------------|
| CASH / BANK / MOBILE_BANKING | money received | money paid | cash on hand |
| RECEIVABLE | new amount owed to us | collected | outstanding due to us |
| PAYABLE | new bill owed by us | bill paid | outstanding due by us |
| INCOME (Room/Restaurant/Day Long) | revenue earned | refund/reversal | cumulative revenue |
| EXPENSE | expense incurred | reversal | cumulative expense |
| ASSET (fixed) | asset acquired | disposed | book value |
| EQUITY | capital in / retained | draw / loss | equity balance |

No branching — every write uses the same `+/-` from `direction`.

---

## Money movement = paired transactions (two tallies, not double-entry)

A single real event writes exactly TWO transactions so both the cash position AND the revenue/expense tally update. Bookkeeping convenience, not enforced debit=credit.

**Revenue (a Payment is recorded):**
1. Cash/Bank/Mobile account ← `IN` amount   (cash position up)
2. Income account (by business line) ← `IN` amount  (revenue tally up), `businessLine` set

**Expense (an Expense is recorded):**
1. Expense account (by category) ← `IN` amount  (expense tally up)
2. Cash/Bank/Mobile account ← `OUT` amount  (cash position down)

**Transfer (Cash → Bank):**
1. From account ← `OUT` amount
2. To account ← `IN` amount

**Pending / receivable (POS with pay-later — per decision):**
- On booking/order create with unpaid balance → Receivable account ← `IN` (amount owed). NO cash movement yet.
- On later collection → Receivable ← `OUT`, Cash/Bank ← `IN`, Income ← `IN`.

---

## Auto-Ledger Utility (uniform, no sign branching)

```typescript
// utils/accountLedger.ts
import { Prisma } from '@prisma/client';

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

// The ONLY place balance is mutated. One rule.
async function writeEntry(tx: Prisma.TransactionClient, e: Entry): Promise<void> {
  await tx.accountTransaction.create({ data: { ...e } as any });
  const delta = e.direction === 'IN' ? e.amount : -e.amount;
  await tx.account.update({
    where: { id: e.accountId },
    data: { currentBalance: { increment: delta } },
  });
}

export async function recordRevenue(
  tx: Prisma.TransactionClient,
  p: { amount: number; method: string; businessLine: string; referenceType: string; referenceId: string; createdById?: string }
): Promise<void> {
  const cash = await getAccountForPaymentMethod(tx, p.method);
  const income = await getIncomeAccount(tx, p.businessLine);
  await writeEntry(tx, { accountId: cash.id,   direction: 'IN', amount: p.amount, businessLine: p.businessLine, referenceType: p.referenceType, referenceId: p.referenceId, description: `Payment received - ${p.referenceType}`, createdById: p.createdById });
  await writeEntry(tx, { accountId: income.id, direction: 'IN', amount: p.amount, businessLine: p.businessLine, referenceType: p.referenceType, referenceId: p.referenceId, description: `Revenue - ${p.businessLine}`, createdById: p.createdById });
}

export async function recordExpense(
  tx: Prisma.TransactionClient,
  e: { amount: number; method: string; expenseAccountId: string; title: string; expenseId: string; createdById?: string }
): Promise<void> {
  const cash = await getAccountForPaymentMethod(tx, e.method);
  await writeEntry(tx, { accountId: e.expenseAccountId, direction: 'IN',  amount: e.amount, referenceType: 'EXPENSE', referenceId: e.expenseId, description: e.title, createdById: e.createdById });
  await writeEntry(tx, { accountId: cash.id,            direction: 'OUT', amount: e.amount, referenceType: 'EXPENSE', referenceId: e.expenseId, description: `Paid - ${e.title}`, createdById: e.createdById });
}

export async function recordTransfer(
  tx: Prisma.TransactionClient,
  t: { fromAccountId: string; toAccountId: string; amount: number; description?: string; createdById?: string }
): Promise<void> {
  await writeEntry(tx, { accountId: t.fromAccountId, direction: 'OUT', amount: t.amount, referenceType: 'TRANSFER', description: t.description, createdById: t.createdById });
  await writeEntry(tx, { accountId: t.toAccountId,   direction: 'IN',  amount: t.amount, referenceType: 'TRANSFER', description: t.description, createdById: t.createdById });
}

async function getAccountForPaymentMethod(tx: Prisma.TransactionClient, method: string) {
  const mapping: Record<string, string> = {
    CASH: '1001', BKASH: '1003', NAGAD: '1003', MOBILE_BANKING: '1003',
    CARD: '1002', BANK_TRANSFER: '1002', STRIPE: '1002',
  };
  return tx.account.findUnique({ where: { code: mapping[method] || '1001' } });
}

async function getIncomeAccount(tx: Prisma.TransactionClient, businessLine: string) {
  const mapping: Record<string, string> = { ROOM: '4001', RESTAURANT: '4002', DAY_LONG: '4003' };
  return tx.account.findUnique({ where: { code: mapping[businessLine] || '4001' } });
}
```

> **All ledger writes run inside the same `prisma.$transaction` as the Payment/Expense create.** If a ledger write throws, the whole thing rolls back — no orphan payment without its cash entry.

---

## API Endpoints

### Account Management (`/api/accounts`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/accounts` | SUPER_ADMIN, MANAGER, ACCOUNTANT | List all accounts (tree) |
| GET | `/api/accounts/:id` | Same | Account detail with balance |
| POST | `/api/accounts` | SUPER_ADMIN, MANAGER | Create account |
| PATCH | `/api/accounts/:id` | SUPER_ADMIN, MANAGER | Update account |
| DELETE | `/api/accounts/:id` | SUPER_ADMIN | Deactivate account |

### Transactions
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/accounts/:id/transactions` | SUPER_ADMIN, MANAGER, ACCOUNTANT | Transaction history (date filter) |
| POST | `/api/accounts/:id/transactions` | SUPER_ADMIN, MANAGER, ACCOUNTANT | Manual IN/OUT entry |
| POST | `/api/accounts/transfer` | SUPER_ADMIN, MANAGER, ACCOUNTANT | Transfer between accounts |

### Receivables (`/api/receivables`) & Payables (`/api/payables`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/receivables` | SUPER_ADMIN, MANAGER, ACCOUNTANT | List receivables (aging) |
| POST | `/api/receivables` | Same | Create receivable |
| PATCH | `/api/receivables/:id` | Same | Record collection (partial ok) |
| GET | `/api/payables` | Same | List payables (reuses PendingPayment) |
| PATCH | `/api/payables/:id` | Same | Record bill payment |

> Payables are largely the existing `PendingPayment` model — extend it, don't duplicate. Receivables cover booking/day-long/restaurant unpaid balances (POS pay-later, per decision).

---

## Opening Balances

Add `openingBalance Float @default(0)` to `Account`. Needed so the Balance Sheet reflects existing cash/assets/capital that predate the system. Admin enters these once at setup via the Chart of Accounts UI. `currentBalance` starts equal to `openingBalance`.

---

## Admin UI Pages

### ChartOfAccounts.tsx
- Tree view by type, expand/collapse, current balance per node
- Add/edit account dialog (code, name, type, parent, opening balance)

### AccountDetail.tsx
- Account info card + running balance
- Transaction table: date, IN/OUT badge, amount, description, reference, businessLine
- Date range filter, CSV export, manual entry

### Transfer.tsx
- From / To account dropdowns (Cash/Bank/Mobile), amount, description, date, confirm

### Receivables.tsx
- Table: source, customer, amount, collected, balance, due date, aging bracket
- Record collection dialog, link to originating booking/order

---

## Revenue Integration (wired in the owning phases)

| Source | Owning phase | Ledger call |
|--------|--------------|-------------|
| Room Booking payment | existing / Phase 0 | `recordRevenue(businessLine: ROOM)` |
| Restaurant Order payment | Phase 2 | `recordRevenue(businessLine: RESTAURANT)` |
| Day Long Booking payment | Phase 1 | `recordRevenue(businessLine: DAY_LONG)` |
| Expense (manual + salary sync) | this phase | `recordExpense` |
| Inventory purchase / COGS | Phase 3 | `recordExpense` (Food Supplies / Inventory account) |
| Manual entry / transfer | this phase | `writeEntry` / `recordTransfer` |

---

## Files to Create

| File | Purpose |
|------|---------|
| `apps/server/src/utils/accountLedger.ts` | Uniform signed ledger (writeEntry, recordRevenue, recordExpense, recordTransfer) |
| `apps/server/src/controllers/accountController.ts` | Account CRUD + transactions + transfer |
| `apps/server/src/controllers/receivableController.ts` | Receivable management |
| `apps/server/src/routes/accountRoutes.ts` | Account routes |
| `apps/server/src/routes/receivableRoutes.ts` | Receivable routes |
| `apps/server/src/validators/accountValidator.ts` | Zod schemas |
| `apps/admin/src/pages/Accounts/ChartOfAccounts.tsx` | Account tree view |
| `apps/admin/src/pages/Accounts/AccountDetail.tsx` | Account detail |
| `apps/admin/src/pages/Accounts/Transfer.tsx` | Transfer form |
| `apps/admin/src/pages/Accounts/Receivables.tsx` | Receivables list |

## Files to Modify

| File | Change |
|------|--------|
| `apps/server/prisma/schema.prisma` | Add AccountTransaction, TxnDirection, `openingBalance` on Account, Payment reference/businessLine fields |
| `apps/server/src/index.ts` | Mount account + receivable routes |
| `apps/server/src/controllers/paymentController.ts` | Call `recordRevenue` inside the payment transaction |
| `apps/server/src/controllers/expenditureController.ts` | Call `recordExpense` inside the expense transaction |
| `apps/server/src/controllers/pendingPaymentController.ts` | On pay-now → `recordExpense`; treat as Payable |
| `apps/server/src/utils/bookingPayment.ts` | Pass businessLine; trigger ledger on booking payment |
| `apps/admin/src/config/rbac.ts` | Add Accounts sidebar items |
| `apps/admin/src/App.tsx` | Add accounts routes |
