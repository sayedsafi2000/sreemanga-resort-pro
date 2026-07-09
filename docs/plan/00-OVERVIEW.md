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
│  AccountTransaction, Shareholder, ProfitDistribution,            │
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
| **Restaurant** | ⚠️ Menu + Orders exist, NO revenue tracking | ✅ Orders create payments/account transactions |
| **Day Long** | ❌ Does not exist | ✅ Full booking + payment + reporting |
| **Accounts** | ❌ Basic expenses only | ✅ Chart of Accounts, transactions, balance sheet |
| **Shareholders** | ❌ Does not exist | ✅ Full management + login portal |
| **Staff HR** | ❌ Basic user CRUD + salary only | ✅ Departments, shifts, attendance, leave, payroll |
| **Reports** | ⚠️ Basic revenue + occupancy + expenses | ✅ P&L by business line, Balance Sheet, Cash Flow |
| **RBAC** | ⚠️ Route-level only | ✅ Granular permissions + SHAREHOLDER role |
| **Audit** | ❌ Does not exist | ✅ Full audit trail |

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
Phase 0 ──Foundation Schema Changes──
  │
  ├──▶ Phase 1 ──Day Long Module──────▶ Phase 5 ──Reports──▶ Done
  │                                    (depends on 1-4)
  ├──▶ Phase 2 ──Accounts System───────▶
  │
  ├──▶ Phase 3 ──Shareholder System────▶
  │
  └──▶ Phase 4 ──Staff HR─────────────▶
                                       Phase 6 (Cross-cutting) runs in parallel
```

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

| Role | Day Long | Accounts | Shareholders | Staff HR | Reports |
|------|----------|----------|--------------|----------|---------|
| SUPER_ADMIN | Full | Full | Full | Full | Full |
| MANAGER | Full | View + Create | View Only | View + Approve | Full |
| ACCOUNTANT | View | Full | View | View | Full |
| RECEPTIONIST | Create Bookings | View | — | — | View |
| HOUSEKEEPING | — | — | — | View duty | — |
| RESTAURANT_STAFF | — | — | — | View duty | — |
| SHAREHOLDER | — | — | Own data | — | Own reports |
