# Resort Management System — Master Implementation Plan

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       Web (Next.js 14)                          │
│  Public site: Rooms, Booking, Gallery, Restaurant, Explore,     │
│  Blogs, Contact, Day Long booking, Shareholder Portal           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP (axios)
┌───────────────────────────▼─────────────────────────────────────┐
│                      Admin (React/Vite)                         │
│  Dashboard, Rooms, Bookings, Guests, Payments, Restaurant,      │
│  Day Long, Accounts, Shareholders, Staff HR, Reports,           │
│  Gallery, Blogs, Settings, Branding, Expenditures, Salaries     │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP (axios + JWT)
┌───────────────────────────▼─────────────────────────────────────┐
│                     API Server (Express)                         │
│  Middleware: auth → roleCheck → handler                          │
│  Routes: /api/auth, /api/public, /api/rooms, /api/bookings,     │
│  /api/payments, /api/restaurant, /api/day-long, /api/accounts,  │
│  /api/shareholders, /api/staff, /api/attendance, /api/leaves,   │
│  /api/expenditures, /api/salaries, /api/reports, ...             │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Prisma ORM
┌───────────────────────────▼─────────────────────────────────────┐
│                      PostgreSQL Database                          │
│  Tables: User, Room, Booking, Guest, Payment, RestaurantMenu,    │
│  RestaurantOrder, DayLongProduct, DayLongBooking, Account,       │
│  AccountTransaction, InventoryItem, Supplier, StockMovement,     │
│  MenuItemIngredient, Shareholder, ProfitDistribution,            │
│  ProfitShare, Department, Designation, StaffProfile, Shift,      │
│  DutyRoster, Attendance, Leave, Expense, ExpenseCategory,        │
│  PendingPayment, StaffSalary, Setting, SiteGalleryItem,          │
│  SiteNearbySpot, SiteBlog, PasswordReset, AuditLog               │
└─────────────────────────────────────────────────────────────────┘
```

## Current vs Future State

| Area | Current | Future |
|------|---------|--------|
| **Room Booking** | ✅ Full CRUD, payments, availability | ✅ Enhanced with business-line tagging |
| **Restaurant** | ⚠️ Menu + Orders exist, NO revenue tracking | ✅ Orders create payments + ledger entries (Phase 2) |
| **Inventory** | ❌ Does not exist | ✅ Products/Food/Amenities, purchase-in, auto-deduct (Phase 3) |
| **Day Long** | ❌ Does not exist | ✅ Full booking + payment + reporting (Phase 1) |
| **Accounts** | ❌ Basic expenses only | ✅ Chart of Accounts, signed cashbook, balance-sheet estimate (Phase 4) |
| **Shareholders** | ❌ Does not exist | ✅ Full management + login portal (Phase 5) |
| **Staff HR** | ❌ Basic user CRUD + salary only | ✅ Departments, shifts, attendance, leave, payroll (Phase 6) |
| **Reports** | ⚠️ Basic revenue + occupancy + expenses | ✅ P&L by business line, Balance Sheet, Cash Flow (Phase 7) |
| **RBAC** | ⚠️ Route-level only | ✅ Granular permissions + SHAREHOLDER role (Phase 5/8) |
| **Audit** | ❌ Does not exist | ✅ Full audit trail (Phase 8) |

## Business Line Data Flow (Future State)

```
                    ┌────────────────────────────────────────────┐
                    │         BUSINESS LINES (Revenue)           │
                    ├──────────────────┬─────────────────────────┤
                    │                  │                         │
    ┌───────────────┴───┐   ┌────────┴────────┐   ┌────────────┴───────────┐
    │   ROOM / COTTAGE   │   │   RESTAURANT     │   │      DAY LONG          │
    │   (Booking model)  │   │   (Order model)  │   │   (DayLongBooking)      │
    ├───────────────────┤   ├─────────────────┤   ├────────────────────────┤
    │ • Room → Booking  │   │ • Menu → Order  │   │ • Product → Booking    │
    │ • Per-night price │   │ • Food items    │   │ • Pool/Cottage/        │
    │ • Guest stays     │   │ • Room delivery │   │   Conference/Event/    │
    │ • Check-in/out    │   │ • Takeaway      │   │   Picnic               │
    └─────────┬─────────┘   └────────┬────────┘   │ • Per-person or slot   │
              │                      │            └───────────┬────────────┘
              │                      │                        │
              └──────────────────────┼────────────────────────┘
                                     │
                            ┌────────▼────────┐
                            │  PAYMENT (Cash,  │
                            │  Bank, Mobile,   │
                            │  Card, Stripe)   │
                            └────────┬────────┘
                                     │
              ┌──────────────────────┼────────────────────────┐
              │                      │                        │
    ┌─────────▼─────────┐ ┌─────────▼─────────┐  ┌───────────┴───────────┐
    │   CHART OF        │ │   EXPENSES        │  │   SHAREHOLDER         │
    │   ACCOUNTS         │ │   (Cost tracking)  │  │   (Profit distribution)│
    │   (Revenue +       │ │                   │  │                       │
    │    Asset tracking) │ │ • Category-based  │  │ • % / Fixed / Custom  │
    ├───────────────────┤ │ • Payable mgmt    │  │ • Dividend tracking   │
    │ • Cash             │ │ • Staff salaries  │  │ • Individual portal   │
    │ • Bank accounts    │ │                   │  │                       │
    │ • Mobile Banking   │ └───────────────────┘  └───────────────────────┘
    │ • Receivables      │
    │ • Payables         │
    │ • Assets/Liabilities│
    └────────────────────┘
```

## Implementation Phases (Dependency Order)

```
Phase 0 ──Foundation Schema + Quick-Win Bug Fixes──
  │
  ├──▶ Phase 1 ──Day Long Module──────────┐
  ├──▶ Phase 2 ──Restaurant Revenue───────┤
  ├──▶ Phase 3 ──Inventory (auto-deduct)──┤──▶ Phase 4 ──Accounts──▶ Phase 7 ──Reports──▶ Done
  │         (Phase 2 feeds Phase 3 recipes)│      (needs 1,2,3 revenue+cost)
  ├──▶ Phase 5 ──Shareholder System───────┘  (needs Phase 4 profit)
  │
  └──▶ Phase 6 ──Staff HR─────────────────▶
                                          Phase 8 (Cross-cutting) runs in parallel
```

Full dependency notes:
- **Phase 4 (Accounts)** consumes revenue from 1/2 and cost from 3 → sequence 1,2,3 → 4.
- **Phase 5 (Shareholder)** needs Phase 4 profit numbers.
- **Phase 7 (Reports)** needs data from 1-6.
- **Phase 0** ships the C2/C5/H1 quick-win fixes (see `00-CURRENT-ISSUES.md`).

## File Structure Additions

```
apps/server/prisma/schema.prisma     ← Extended models
apps/server/src/
  controllers/        ← + dayLong, account, shareholder, staff/department, attendance, leave, shift, dutyRoster
  routes/             ← + dayLong, account, shareholder, staff, attendance, leave, shift, dutyRoster
  validators/         ← + dayLong, account, shareholder, staff, attendance, leave
  middleware/         ← + permission check (granular)
  utils/              ← + accountLedger (auto double-entry logic)

apps/admin/src/
  pages/
    DayLong/          ← Products.tsx, Bookings.tsx
    Accounts/         ← ChartOfAccounts.tsx, AccountDetail.tsx, Transfer.tsx
    Shareholders/     ← Shareholders.tsx, ProfitDistribution.tsx
    Staff/            ← Directory.tsx, Departments.tsx, Shifts.tsx, Attendance.tsx, Leave.tsx
  config/rbac.ts      ← Extended with new roles + permissions

apps/web/src/
  app/
    day-long/         ← Products list, booking flow
    shareholder/      ← Dashboard, reports
  lib/                ← Extended API client
```

## Role & Permission Matrix (Planned)

| Role | Day Long | Restaurant | Inventory | Accounts | Shareholders | Staff HR | Reports |
|------|----------|-----------|-----------|----------|--------------|----------|---------|
| SUPER_ADMIN | Full | Full | Full | Full | Full | Full | Full |
| MANAGER | Full | Full | Full | View + Create | View Only | View + Approve | Full |
| ACCOUNTANT | View | View | View + Purchase | Full | View | View | Full |
| RECEPTIONIST | Create Bookings | Take orders/payments | — | View | — | — | View |
| HOUSEKEEPING | — | — | Issue amenities | — | — | View duty | — |
| RESTAURANT_STAFF | — | Take orders/payments | Issue/consume | — | — | View duty | — |
| SHAREHOLDER | — | — | — | — | Own data | — | Own reports |

## Phase Index

| # | Phase | File | Effort |
|---|-------|------|--------|
| — | Current Issues list | `00-CURRENT-ISSUES.md` | — |
| 0 | Foundation + quick-win fixes | `00-PHASE-0-FOUNDATION.md` | 3-4d |
| 1 | Day Long | `01-PHASE-1-DAYLONG.md` | 5-6d |
| 2 | Restaurant Revenue | `02-PHASE-2-RESTAURANT-REVENUE.md` | 3-4d |
| 3 | Inventory | `03-PHASE-3-INVENTORY.md` | 6-7d |
| 4 | Accounts (signed cashbook) | `04-PHASE-4-ACCOUNTS.md` | 5-6d |
| 5 | Shareholder | `05-PHASE-5-SHAREHOLDER.md` | 5-6d |
| 6 | Staff HR | `06-PHASE-6-STAFF-HR.md` | 8-10d |
| 7 | Reports | `07-PHASE-7-REPORTS.md` | 4-5d |
| 8 | Cross-cutting / hardening | `08-PHASE-8-IMPROVEMENTS.md` | 5-6d |
| — | Data flow reference | `09-DATA-FLOW.md` | — |
| — | Testing strategy | `10-TESTING.md` | — |
