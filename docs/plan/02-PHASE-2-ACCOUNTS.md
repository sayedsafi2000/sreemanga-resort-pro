# Phase 2: Accounts System (Simplified Structured Accounting)

**Goal:** Track all financial transactions across Cash, Bank, Mobile Banking accounts. Provide Receivable/Payable management, revenue segmentation, and basic Balance Sheet.

**Depends on:** Phase 0 (Chart of Accounts model)

**Effort:** ~6-7 days

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
                   │   Salary, Maintenance    │
                   └───────────┬─────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
   │  TRANSACTIONS │   │  RECEIVABLES │   │   PAYABLES   │
   │  (Debit/Credit)│  │  (Invoices)  │   │   (Bills)    │
   │              │   │              │   │              │
   │ Cash In/Out  │   │ Room Booking │   │ Pending      │
   │ Bank Deposit │   │   Installment│   │   Payments   │
   │ Transfer     │   │ Day Long due │   │ Supplier     │
   │ Income Entry │   │ Other Debt   │   │   Bills      │
   │ Expense Entry│   │              │   │ Accrued      │
   └──────────────┘   └──────────────┘   └──────────────┘
```

---

## Schema Additions

```prisma
model AccountTransaction {
  id              String          @id @default(uuid())
  accountId       String
  account         Account         @relation(fields: [accountId], references: [id])
  type            TransactionType  // DEBIT or CREDIT
  amount          Float
  description     String?
  referenceType   String?  // "BOOKING" | "RESTAURANT" | "DAY_LONG" | "EXPENSE" | "TRANSFER" | "INVOICE"
  referenceId     String?  // UUID of referenced entity
  transactionDate DateTime        @default(now())
  createdById     String?
  createdBy       User?           @relation(fields: [createdById], references: [id])
  createdAt       DateTime        @default(now())

  @@index([accountId])
  @@index([transactionDate])
  @@index([referenceType, referenceId])
}

enum TransactionType {
  DEBIT    // Money IN (increases asset/expense, decreases liability/equity/income)
  CREDIT   // Money OUT (decreases asset/expense, increases liability/equity/income)
}
```

### Accounting Rules (Simplified)

| Account Type | Debit Meaning | Credit Meaning | Normal Balance |
|-------------|---------------|----------------|----------------|
| ASSET | Increase | Decrease | Debit |
| LIABILITY | Decrease | Increase | Credit |
| EQUITY | Decrease | Increase | Credit |
| INCOME | Decrease | Increase | Credit |
| EXPENSE | Increase | Decrease | Debit |

For the simplified system:

```
Cash Account (ASSET):
  DEBIT = Cash received (money in)
  CREDIT = Cash paid (money out)
  Balance = SUM(debits) - SUM(credits)

Income Accounts (INCOME):
  CREDIT = Revenue earned
  DEBIT = Revenue reversal/refund
  Balance = SUM(credits) - SUM(debits)

Expense Accounts (EXPENSE):
  DEBIT = Expense incurred
  CREDIT = Expense reversal
  Balance = SUM(debits) - SUM(credits)
```

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

### Transactions (`/api/accounts/:id/transactions`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/accounts/:id/transactions` | SUPER_ADMIN, MANAGER, ACCOUNTANT | Transaction history |
| POST | `/api/accounts/:id/transactions` | SUPER_ADMIN, MANAGER, ACCOUNTANT | Add manual transaction |

### Transfers (`/api/accounts/transfer`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/api/accounts/transfer` | SUPER_ADMIN, MANAGER, ACCOUNTANT | Transfer between accounts |

### Auto-Reconciliation
When a Payment is created:
1. DEBIT the Cash/Bank/Mobile account (money received)
2. CREDIT the appropriate INCOME account

When an Expense is created:
1. DEBIT the EXPENSE account
2. CREDIT the Cash/Bank/Mobile account

### Receivables (`/api/receivables`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/api/receivables` | SUPER_ADMIN, MANAGER, ACCOUNTANT | List all receivables |
| POST | `/api/receivables` | Same | Create receivable (invoice) |
| PATCH | `/api/receivables/:id` | Same | Update/partial payment |
| DELETE | `/api/receivables/:id` | SUPER_ADMIN | Remove |

---

## Auto-Ledger Utility

```typescript
// utils/accountLedger.ts

interface LedgerEntry {
  accountId: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  description: string;
  referenceType: string;
  referenceId: string;
}

async function createLedgerEntry(
  tx: Prisma.TransactionClient,
  entry: LedgerEntry
): Promise<void> {
  await tx.accountTransaction.create({ data: { ...entry } });
  const factor = entry.type === 'DEBIT' ? 1 : -1;
  await tx.account.update({
    where: { id: entry.accountId },
    data: { currentBalance: { increment: factor * entry.amount } },
  });
}

async function recordPayment(
  tx: Prisma.TransactionClient,
  payment: { amount: number; method: string; businessLine: string; referenceType: string; referenceId: string }
): Promise<void> {
  const cashAccount = await getAccountForPaymentMethod(payment.method);
  const incomeAccount = await getIncomeAccount(payment.businessLine);

  await createLedgerEntry(tx, {
    accountId: cashAccount.id,
    type: 'DEBIT',
    amount: payment.amount,
    description: `Payment received - ${payment.referenceType}`,
    referenceType: payment.referenceType,
    referenceId: payment.referenceId,
  });

  await createLedgerEntry(tx, {
    accountId: incomeAccount.id,
    type: 'CREDIT',
    amount: payment.amount,
    description: `Revenue - ${payment.referenceType}`,
    referenceType: payment.referenceType,
    referenceId: payment.referenceId,
  });
}

async function recordExpense(
  tx: Prisma.TransactionClient,
  expense: { amount: number; paymentMethod: string; categoryAccountId: string; title: string; expenseId: string }
): Promise<void> {
  const cashAccount = await getAccountForPaymentMethod(expense.paymentMethod);

  await createLedgerEntry(tx, {
    accountId: expense.categoryAccountId,
    type: 'DEBIT',
    amount: expense.amount,
    description: expense.title,
    referenceType: 'EXPENSE',
    referenceId: expense.expenseId,
  });

  await createLedgerEntry(tx, {
    accountId: cashAccount.id,
    type: 'CREDIT',
    amount: expense.amount,
    description: `Paid - ${expense.title}`,
    referenceType: 'EXPENSE',
    referenceId: expense.expenseId,
  });
}

async function getAccountForPaymentMethod(method: string): Promise<Account> {
  const mapping: Record<string, string> = {
    CASH: '1001',
    BKASH: '1003',
    NAGAD: '1003',
    CARD: '1002',
    BANK_TRANSFER: '1002',
    STRIPE: '1002',
    MOBILE_BANKING: '1003',
  };
  const code = mapping[method] || '1001';
  return prisma.account.findUnique({ where: { code } });
}

async function getIncomeAccount(businessLine: string): Promise<Account> {
  const mapping: Record<string, string> = {
    ROOM: '4001',
    RESTAURANT: '4002',
    DAY_LONG: '4003',
  };
  const code = mapping[businessLine] || '4001';
  return prisma.account.findUnique({ where: { code } });
}
```

---

## Admin UI Pages

### ChartOfAccounts.tsx
- Tree view of all accounts by type
- Expand/collapse per category
- Click account → detail view
- Add account dialog (code, name, type, parent)
- Current balance display
- Filters by type

### AccountDetail.tsx
- Account info card (code, name, type, balance)
- Transaction table (date, type badge, amount, description, reference)
- Date range filter
- Manual transaction entry
- CSV export

### Transfer.tsx
- From account dropdown (Cash/Bank/Mobile only)
- To account dropdown
- Amount input
- Description
- Date
- Confirmation step

### Receivables.tsx
- Table: invoice#, customer, amount, paid balance, due date, aging
- Aging badges by bracket
- Create invoice dialog
- Record payment against invoice
- Link to original booking

---

## Revenue Integration

When payments are created from:
1. **Room Booking** → DEBIT Cash/Bank, CREDIT Room Revenue
2. **Restaurant Order** → DEBIT Cash/Bank, CREDIT Restaurant Revenue
3. **Day Long Booking** → DEBIT Cash/Bank, CREDIT Day Long Revenue
4. **Manual Payment** → same with manual account selection

---

## Files to Create

| File | Purpose |
|------|---------|
| `apps/server/src/utils/accountLedger.ts` | Auto-ledger utility |
| `apps/server/src/controllers/accountController.ts` | Account CRUD + transactions |
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
| `apps/server/prisma/schema.prisma` | Add AccountTransaction, TransactionType, Payment reference fields |
| `apps/server/src/index.ts` | Mount account + receivable routes |
| `apps/server/src/controllers/paymentController.ts` | Auto-create account transactions |
| `apps/server/src/controllers/expenditureController.ts` | Auto-create account transactions |
| `apps/server/src/controllers/pendingPaymentController.ts` | Auto-create account transactions on pay-now |
| `apps/server/src/utils/bookingPayment.ts` | Pass businessLine, create account transactions |
| `apps/admin/src/config/rbac.ts` | Add Accounts sidebar items |
| `apps/admin/src/App.tsx` | Add accounts routes |
