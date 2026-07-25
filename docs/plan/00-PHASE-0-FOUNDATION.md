# Phase 0: Foundation & Schema Reorganization

**Goal:** Prepare the database and codebase for all new modules. Fix existing bugs.

**Prerequisite for:** All phases (1-8)

**Quick-win fixes to ship in this phase** (see `00-CURRENT-ISSUES.md`): C2 (BANK_TRANSFER→CARD), C5 (PaymentMethod enum), H1 (backfill off the GET path). Small, isolated, unblock accounting.

**Effort:** ~3-4 days

---

## Task 0.1: Chart of Accounts Model

### Prisma Schema Addition

```prisma
enum AccountType {
  CASH
  BANK
  MOBILE_BANKING
  RECEIVABLE
  PAYABLE
  ASSET
  LIABILITY
  EQUITY
  INCOME
  EXPENSE
}

model Account {
  id             String    @id @default(uuid())
  code           String    @unique    // e.g., "1001", "2001"
  name           String               // e.g., "Cash in Hand", "bKash", "DBBL Account"
  type           AccountType
  parentId       String?
  parent         Account?  @relation("AccountHierarchy", fields: [parentId], references: [id])
  children       Account[] @relation("AccountHierarchy")
  description    String?
  currentBalance Float     @default(0)
  isActive       Boolean   @default(true)
  sortOrder      Int       @default(0)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  transactions   AccountTransaction[]

  @@index([type])
  @@index([parentId])
  @@index([code])
}
```

### Default Chart of Accounts Seed Data

| Code | Name | Type | Parent |
|------|------|------|--------|
| 1000 | Current Assets | ASSET | null |
| 1001 | Cash in Hand | CASH | 1000 |
| 1002 | Bank Accounts | BANK | 1000 |
| 1003 | Mobile Banking | MOBILE_BANKING | 1000 |
| 1004 | Accounts Receivable | RECEIVABLE | 1000 |
| 1005 | Inventory | ASSET | 1000 |
| 1100 | Fixed Assets | ASSET | null |
| 1101 | Furniture & Fixtures | ASSET | 1100 |
| 1102 | Equipment | ASSET | 1100 |
| 2000 | Current Liabilities | LIABILITY | null |
| 2001 | Accounts Payable | PAYABLE | 2000 |
| 2002 | Accrued Expenses | PAYABLE | 2000 |
| 3000 | Equity | EQUITY | null |
| 3001 | Owner's Capital | EQUITY | 3000 |
| 3002 | Retained Earnings | EQUITY | 3000 |
| 4000 | Income | INCOME | null |
| 4001 | Room Revenue | INCOME | 4000 |
| 4002 | Restaurant Revenue | INCOME | 4000 |
| 4003 | Day Long Revenue | INCOME | 4000 |
| 5000 | Expenses | EXPENSE | null |
| 5001 | Utility Expenses | EXPENSE | 5000 |
| 5002 | Salary Expenses | EXPENSE | 5000 |
| 5003 | Maintenance | EXPENSE | 5000 |
| 5004 | Food Supplies | EXPENSE | 5000 |
| 5007 | Inventory / COGS | EXPENSE | 5000 |
| 5005 | Marketing | EXPENSE | 5000 |
| 5006 | Miscellaneous | EXPENSE | 5000 |

---

## Task 0.2: Reorganize Expense Categories

### Changes
- Link `ExpenseCategory` to `Account` (expense accounts from chart of accounts)
- Migrate existing categories to match chart of accounts expense accounts
- Keep custom fields feature but now categories map to real accounts

```prisma
model ExpenseCategory {
  id         String     @id @default(uuid())
  name       String
  accountId  String?    // Link to Account (type: EXPENSE)
  account    Account?   @relation(fields: [accountId], references: [id])
  isActive   Boolean    @default(true)
  sortOrder  Int        @default(0)
  fields     Json?      @default("[]")
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  expenses        Expense[]
  pendingPayments PendingPayment[]
}
```

---

## Task 0.3: Fix Payment Method Enum

### Current Problem
- `BANK_TRANSFER` in booking flow maps to `CARD` in `bookingPayment.ts:20`
- No `MOBILE_BANKING` enum value (bKash/ Nagad use `BKASH`/`NAGAD` string)

### Fix
```prisma
enum PaymentMethod {
  CASH
  BKASH
  NAGAD
  CARD
  STRIPE
  BANK_TRANSFER
  MOBILE_BANKING
}
```

---

## Task 0.4: Business Line Enum

```prisma
enum BusinessLine {
  ROOM
  RESTAURANT
  DAY_LONG
}
```

Add `businessLine` field to:
- `Booking` (default: ROOM)
- `RestaurantOrder` (default: RESTAURANT)
- `DayLongBooking` (default: DAY_LONG)
- `Payment` (optional, for revenue segmentation)

---

## Task 0.5: Fix Backfill on GET /payments

### Problem
`backfillMissingBookingPayments()` runs on every GET request, causing performance overhead.

### Fix
1. Remove automatic call from `getAllPayments` handler
2. Create a dedicated POST endpoint: `POST /api/payments/backfill`
3. Add an admin UI button "Sync Missing Payments" under Payments page
4. Or run as a one-time migration script

---

## Task 0.6: Persist OTP

### Problem
OTP is stored in-memory (`Map<email, OtpEntry>`) — lost on server restart, breaks multi-instance.

### Solution Options
**Option A (Recommended):** Store in DB

```prisma
model OtpCode {
  id         String   @id @default(uuid())
  email      String
  code       String
  expiresAt  DateTime
  verified   Boolean  @default(false)
  createdAt  DateTime @default(now())

  @@index([email])
  @@index([email, code])
}
```

**Option B:** Use Redis (if already in stack)

---

## Files Changed in Phase 0

| File | Change |
|------|--------|
| `apps/server/prisma/schema.prisma` | Add Account, AccountType, BusinessLine, update PaymentMethod, add OtpCode, update ExpenseCategory |
| `apps/server/prisma/seed.ts` | Add default chart of accounts, default expense categories with account links |
| `apps/server/src/utils/bookingPayment.ts` | Fix BANK_TRANSFER mapping, add BusinessLine to payment creation |
| `apps/server/src/controllers/paymentController.ts` | Remove auto-backfill from GET |
| `apps/server/src/controllers/publicController.ts` | Move OTP from Map to DB |
| `apps/server/src/routes/paymentRoutes.ts` | Add POST /backfill endpoint |
| `apps/admin/src/pages/Payments/Payments.tsx` | Add "Sync Missing Payments" button |
