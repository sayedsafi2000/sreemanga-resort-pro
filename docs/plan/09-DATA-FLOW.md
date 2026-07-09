# Complete Data Flow Documentation

> **Accounting terminology note:** diagrams below use classic "DEBIT/CREDIT" labels. The system actually uses the **simplified signed cashbook** (see `04-PHASE-4-ACCOUNTS.md`). Translate as:
> - `DEBIT Cash/Bank` → **Cash account `IN`** (+amount)
> - `CREDIT Revenue` → **Income account `IN`** (revenue tally +amount)
> - `DEBIT Expense` → **Expense account `IN`** (+amount)
> - `CREDIT Cash/Bank` → **Cash account `OUT`** (−amount)
> One rule everywhere: `IN` adds, `OUT` subtracts. No per-type sign flipping. Restaurant/Day-Long unpaid balances also create a **Receivable** (`IN`) until collected.

## Data Flow Diagrams

### 1. Room Booking Flow (Current + Enhanced)

```
Public Web (guest)              Admin (receptionist)
      │                               │
      │ Browse rooms                   │ Manual booking form
      │ Select dates                   │ Select room, guest, dates
      │ Guest info form                │ Total calc (price × nights)
      │ OTP verify email               │
      │ Submit booking                 │
      │                               │
      ▼                               ▼
      ┌───────────────────────────────────────┐
      │        POST /api/public/bookings      │
      │        POST /api/bookings (admin)     │
      └───────────────┬───────────────────────┘
                      │
                      ▼
      ┌───────────────────────────────────────┐
      │  1. Validate dates + room availability│
      │  2. Create Guest record (if new)      │
      │  3. Create Booking record             │
      │     - status: PENDING                 │
      │     - totalAmount: price × nights     │
      │     - businessLine: ROOM              │
      │  4. Create Payment record             │
      │     - status: PENDING                 │
      │     - amount: totalAmount             │
      │     - businessLine: ROOM              │
      │  5. [NEW] Create AccountTransaction   │
      │     - DEBIT Cash/Bank account         │
      │     - CREDIT Room Revenue account     │
      └───────────────┬───────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
    Email confirmation      Admin updates:
    sent to guest           CONFIRMED → CHECKED_IN
                            → CHECKED_OUT → CANCELLED
                            Room status updated accordingly
          │
          ▼
    Reports: counted in revenue,
    P&L shows under "Room Revenue"
    Balance Sheet: cash increased
```

### 2. Restaurant Order Flow (Enhanced)

```
Staff takes order:
  │
  ▼
┌─────────────────────────────────────────┐
│  1. Select menu items                   │
│  2. Assign to room (optional)           │
│  3. Create RestaurantOrder              │
│     - status: PENDING                   │
│     - totalPrice: sum of items          │
│     - items: [{name, qty, price}]       │
│     - businessLine: RESTAURANT          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Kitchen: PREPARING → READY             │
│  Staff: DELIVERED                       │
│  Payment: (currently missing)           │
└──────────────┬──────────────────────────┘
               │
               ▼  [NEW]
┌─────────────────────────────────────────┐
│  Payment for Restaurant Order:          │
│  1. Create Payment record               │
│     - referenceType: RESTAURANT_ORDER   │
│     - referenceId: order.id             │
│     - businessLine: RESTAURANT          │
│     - amount: totalPrice                │
│  2. Create AccountTransaction           │
│     - DEBIT Cash/Bank account           │
│     - CREDIT Restaurant Revenue account │
└─────────────────────────────────────────┘
```

### 3. Day Long Booking Flow (New)

```
Web (guest) or Admin (receptionist)
      │
      ▼
┌─────────────────────────────────────────┐
│  1. Browse DayLongProducts              │
│     - Products: Pool, Day Cottage,      │
│       Conference, Event, Picnic         │
│  2. Select product                      │
│  3. Select date + time slot             │
│  4. Enter guests (adults, children)     │
│  5. Calculate price:                    │
│     - basePrice + (pricePerPerson × pax)│
│  6. Guest info + OTP (web only)         │
│  7. Confirm + Payment method            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  POST /api/public/day-long/bookings     │
│  or POST /api/day-long-bookings (admin) │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  1. Validate date + slot availability   │
│  2. Create DayLongBooking               │
│     - productId, guestName, phone       │
│     - bookingDate, slotStart, slotEnd   │
│     - adults, children, totalAmount     │
│     - status: PENDING                   │
│  3. Create Payment record               │
│     - referenceType: DAY_LONG_BOOKING   │
│     - referenceId: booking.id           │
│     - businessLine: DAY_LONG            │
│  4. Create AccountTransaction           │
│     - DEBIT Cash/Bank account           │
│     - CREDIT Day Long Revenue account   │
└─────────────────────────────────────────┘
```

### 4. Accounts Transaction Flow (New)

```
                                            ┌───────────────────────┐
              Revenue Transaction           │  Expense Transaction  │
              ┌──────────────┐              │  ┌──────────────┐     │
              │ Payment IN   │              │  │ Expense OUT  │     │
              └──────┬───────┘              │  └──────┬───────┘     │
                     │                      │         │              │
                     ▼                      │         ▼              │
    ┌────────────────────────────┐          │ ┌────────────────────┐ │
    │ AccountTransaction (DEBIT) │          │ │ AccountTransaction │ │
    │ account: Cash in Hand      │          │ │ account: Salary    │ │
    │ amount: 10000              │          │ │ type: DEBIT        │ │
    │ reference: BOOKING/ORDER   │          │ │ amount: 50000      │ │
    └─────────────┬──────────────┘          │ └────────┬───────────┘ │
                  │                         │          │              │
                  ▼                         │          ▼              │
    ┌────────────────────────────┐          │ ┌────────────────────┐ │
    │ AccountTransaction (CREDIT)│          │ │ AccountTransaction │ │
    │ account: Room Revenue      │          │ │ account: Cash      │ │
    │ amount: 10000              │          │ │ type: CREDIT       │ │
    │ reference: BOOKING/ORDER   │          │ │ amount: 50000      │ │
    └─────────────┬──────────────┘          │ └────────┬───────────┘ │
                  │                         │          │              │
                  ▼                         │          ▼              │
    ┌────────────────────────────┐          │ ┌────────────────────┐ │
    │ Account Balance Update     │          │ │ Account Balance    │ │
    │ Cash: +10000               │          │ │ Cash: -50000      │ │
    │ Room Revenue: +10000       │          │ │ Salary Expense:   │ │
    │                            │          │ │   +50000          │ │
    └────────────────────────────┘          │ └────────────────────┘ │
                                            └───────────────────────┘

                   Transfer Transaction
              ┌────────────────────────────────┐
              │ AccountTransaction (DEBIT)     │
              │ account: Cash in Hand          │
              │ amount: 20000                  │
              │ description: Deposit to Bank   │
              ├────────────────────────────────┤
              │ AccountTransaction (CREDIT)    │
              │ account: Bank Account          │
              │ amount: 20000                  │
              │ description: Deposit from Cash │
              ├────────────────────────────────┤
              │ Balance Update:                │
              │ Cash: -20000                   │
              │ Bank: +20000                   │
              └────────────────────────────────┘
```

### 5. Shareholder Profit Distribution Flow

```
                    ┌───────────────────────────────┐
                    │  SUPER_ADMIN calculates profit │
                    │  for a period (monthly/Q)      │
                    └───────────┬───────────────────┘
                                │
                                ▼
                ┌───────────────────────────────┐
                │  GET /api/reports/profit-loss  │
                │  → netProfit: 180,000          │
                └───────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────────────┐
        │  POST /api/profit-distributions               │
        │  {                                           │
        │    periodLabel: "January 2026",              │
        │    totalProfit: 180000,                      │
        │    status: DRAFT                             │
        │  }                                           │
        │  → Auto-calculates shares:                   │
        │    - Shareholder A (40%) → 72,000            │
        │    - Shareholder B (30%) → 54,000            │
        │    - Shareholder C (30%) → 54,000            │
        └───────────┬───────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────────────────────────────┐
        │  POST /api/profit-distributions/:id/approve   │
        │  → status: APPROVED                           │
        │                                               │
        │  POST /api/profit-distributions/:id/distribute │
        │  → All shares → PAID                          │
        │  → AccountTransaction:                        │
        │    DEBIT: Retained Earnings / Cash            │
        │    CREDIT: Each shareholder (or Liability)    │
        └───────────┬───────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────────────────────────────┐
        │  Shareholder logs in → sees:                  │
        │  "You received 72,000 BDT for January 2026"   │
        └───────────────────────────────────────────────┘
```

### 6. Staff Attendance & Payroll Flow

```
                        Day Begins
                            │
                            ▼
        ┌───────────────────────────────────────────────┐
        │  Duty Roster: Staff assigned to shifts        │
        │  - John: Morning (09:00-17:00)                │
        │  - Sarah: Evening (15:00-23:00)               │
        └───────────────────┬───────────────────────────┘
                            │
                    ┌───────┴───────┐
                    ▼               ▼
            Check-in (self)    Admin marks
            POST /attendance/  POST /attendance/bulk
            check-in           { staffId, status }
                    │               │
                    └───────┬───────┘
                            ▼
        ┌───────────────────────────────────────────────┐
        │  Attendance Record created/updated:            │
        │  - staffId, date, checkIn, status              │
        └───────────────────┬───────────────────────────┘
                            │
                    ┌───────┴───────┐
                    ▼               ▼
            Check-out          Leave applied
            End of shift       POST /leaves
                    │               │
                    ▼               ▼
        ┌───────────────────────────────────────────────┐
        │  End of Month Payroll Calculation:            │
        │  - Base salary from StaffProfile.basicSalary  │
        │  - Deduct for absences (unpaid)               │
        │  - Deduct for unpaid leave                    │
        │  - Add overtime (if tracked)                  │
        │  → Create/Update StaffSalary record           │
        │  → Auto-sync to Expense (existing logic)      │
        │  → AccountTransaction:                        │
        │    DEBIT: Salary Expense                      │
        │    CREDIT: Cash/Bank                          │
        └───────────────────────────────────────────────┘
```

## Entity Relationship Summary

```
BUSINESS LINES (Revenue Sources):
  Booking ──── Room ──── Payments ──── AccountTransaction (DEBIT Cash, CREDIT Room Revenue)
  Order ────── Menu ──── Payments ──── AccountTransaction (DEBIT Cash, CREDIT Restaurant Revenue)
  DLBooking ── Product ─ Payments ──── AccountTransaction (DEBIT Cash, CREDIT Day Long Revenue)

ACCOUNTING:
  Account (Chart of Accounts)
    ├── AccountTransaction (DEBIT/CREDIT entries)
    ├── Expense ← ExpenseCategory ← Account
    ├── PendingPayment ← ExpenseCategory ← Account
    └── Receivable (new)

SHAREHOLDER:
  Shareholder ──── User (login)
       │
  ProfitDistribution ──── ProfitShare ──── Shareholder

STAFF HR:
  User ──── StaffProfile ──── Department
                  │               │
                  ├── Designation ─┘
                  ├── DutyRoster ──── Shift
                  ├── Attendance
                  └── Leave
                         │
                   StaffSalary ──── Expense (auto-sync)
```

## Key Integration Points

| Integration | Trigger | Effect |
|-------------|---------|--------|
| Payment created | Any booking/order | Auto-creates DEBIT/CREDIT account transactions |
| Expense created | Manual entry or salary sync | Auto-creates DEBIT expense + CREDIT cash/bank |
| Salary paid | Payroll processing | Auto-creates Expense record + AccountTransaction |
| Leave approved | Manager action | Affects next payroll calculation |
| Attendance change | Check-in/out or admin | Affects payroll (absent deduction) |
| Day Long booking | Guest or admin booking | Creates Payment → revenue in Day Long Revenue |
| Restaurant order payment | Staff marks paid | Creates Payment → revenue in Restaurant Revenue |
