# Phase 7: Reporting Enhancements

**Goal:** Add comprehensive financial and operational reports including segmented P&L, Balance Sheet, Cash Flow, and enhanced dashboards.

**Depends on:** Phases 1-6 (needs data from all business lines)

**Effort:** ~4-5 days

> **Accounting note:** the system uses the **simplified signed cashbook** (Phase 4), not double-entry. Wherever this doc says "DEBIT/CREDIT," read it as: revenue/expense/cash tallies from `IN`/`OUT` movements. **Trial Balance is dropped** (a signed cashbook has no zero-sum guarantee) and replaced by an **Account Balances** report (every account + its running balance). The Balance Sheet is an **estimate** (assets vs liabilities+equity may not tie out exactly — show the difference as a "unreconciled" line rather than forcing it).

---

## Report Architecture

```
                         ┌─────────────────────────────┐
                         │      REPORTS ENGINE          │
                         │  (reportController.ts)       │
                         ├─────────────────────────────┤
                         │  • Date range filtering      │
                         │  • Business line filtering   │
                         │  • CSV / PDF export          │
                         └──────┬──────┬──────┬────────┘
                                │      │      │
              ┌─────────────────┘      │      └─────────────────┐
              ▼                        ▼                        ▼
   ┌──────────────────┐   ┌────────────────────┐   ┌──────────────────────┐
   │  FINANCIAL        │   │  OPERATIONAL        │   │  SHAREHOLDER         │
   │  REPORTS          │   │  REPORTS            │   │  REPORTS             │
   ├──────────────────┤   ├────────────────────┤   ├──────────────────────┤
   │ • P&L Statement  │   │ • Occupancy Report │   │ • Shareholder P&L    │
   │ • Balance Sheet  │   │ • Revenue by Line  │   │ • Distribution Hist. │
   │ • Cash Flow      │   │ • Staff Summary   │   │ • ROI Analysis       │
   │ • Trial Balance  │   │ • Attendance Rep. │   │                      │
   │   → Account Bal. │   │ • Leave Report    │   │                      │
   └──────────────────┘   └────────────────────┘   └──────────────────────┘
```

---

## API Endpoints

### Financial Reports
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reports/profit-loss` | P&L statement (filter: date range, business line) |
| GET | `/api/reports/balance-sheet` | Balance sheet (as of a date) |
| GET | `/api/reports/cash-flow` | Simplified cash flow statement |
| GET | `/api/reports/account-balances` | All accounts with running balances (replaces trial balance) |
| GET | `/api/reports/expense-category` | Expenses by category with drill-down |
| GET | `/api/reports/revenue-by-line` | Revenue segmented by Room/Restaurant/Day Long |

### Operational Reports
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reports/occupancy` | Enhanced occupancy with room type breakdown |
| GET | `/api/reports/daily-summary` | Daily cash report (revenue, expenses, net) |
| GET | `/api/reports/staff-summary` | Staff headcount, attendance %, salary summary |
| GET | `/api/reports/attendance` | Attendance summary by department |
| GET | `/api/reports/leave-summary` | Leave taken summary by department/type |

### Shareholder Reports
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reports/shareholder-pnl` | P&L data formatted for shareholder view |
| GET | `/api/reports/shareholder-distributions` | Distribution history |

---

## P&L Statement (Profit & Loss)

### Response Shape
```json
{
  "period": { "start": "2026-01-01", "end": "2026-01-31" },
  "income": {
    "total": 500000,
    "byLine": {
      "ROOM": 300000,
      "RESTAURANT": 120000,
      "DAY_LONG": 80000
    },
    "byAccount": [
      { "accountName": "Room Revenue", "amount": 300000 },
      { "accountName": "Restaurant Revenue", "amount": 120000 },
      { "accountName": "Day Long Revenue", "amount": 80000 }
    ]
  },
  "expenses": {
    "total": 320000,
    "byAccount": [
      { "accountName": "Salary Expenses", "amount": 180000 },
      { "accountName": "Utility Expenses", "amount": 50000 },
      { "accountName": "Food Supplies", "amount": 40000 },
      { "accountName": "Maintenance", "amount": 30000 },
      { "accountName": "Marketing", "amount": 12000 },
      { "accountName": "Miscellaneous", "amount": 8000 }
    ]
  },
  "netProfit": 180000,
  "profitMargin": 36.0
}
```

### Calculation Logic
```typescript
async function getProfitLoss(startDate: Date, endDate: Date, businessLine?: string) {
  // Get all income accounts
  const incomeAccounts = await prisma.account.findMany({
    where: { type: 'INCOME', isActive: true },
  });

  // Get all expense accounts
  const expenseAccounts = await prisma.account.findMany({
    where: { type: 'EXPENSE', isActive: true },
  });

  // Calculate income totals from transactions
  // ... aggregate IN/OUT by account within date range (income balance = SUM(IN) - SUM(OUT))

  // Calculate expense totals from transactions
  // ... aggregate IN/OUT by account within date range (expense balance = SUM(IN) - SUM(OUT))

  // If businessLine filter, only include related income/expense accounts
  // ...
}
```

---

## Balance Sheet

### Response Shape
```json
{
  "asOfDate": "2026-01-31",
  "assets": {
    "total": 2500000,
    "currentAssets": {
      "total": 1500000,
      "accounts": [
        { "name": "Cash in Hand", "balance": 500000 },
        { "name": "Bank Accounts", "balance": 800000 },
        { "name": "Mobile Banking", "balance": 100000 },
        { "name": "Accounts Receivable", "balance": 100000 }
      ]
    },
    "fixedAssets": {
      "total": 1000000,
      "accounts": [
        { "name": "Furniture & Fixtures", "balance": 600000 },
        { "name": "Equipment", "balance": 400000 }
      ]
    }
  },
  "liabilities": {
    "total": 500000,
    "currentLiabilities": {
      "total": 500000,
      "accounts": [
        { "name": "Accounts Payable", "balance": 300000 },
        { "name": "Accrued Expenses", "balance": 200000 }
      ]
    }
  },
  "equity": {
    "total": 2000000,
    "accounts": [
      { "name": "Owner's Capital", "balance": 1500000 },
      { "name": "Retained Earnings", "balance": 500000 }
    ]
  },
  "liabilitiesEquityTotal": 2500000
}
```

---

## Enhanced Reports Admin UI

### Reports.tsx (enhanced)

Add tabs:

1. **Overview** (existing) — revenue vs expenses chart
2. **P&L Statement** — income table, expense table, net profit, business line breakdown
3. **Balance Sheet** — tree view of assets, liabilities, equity with totals
4. **Cash Flow** — simplified cash in/out by category
5. **Business Line** — revenue comparison chart (Room vs Restaurant vs Day Long)
6. **Operational** — occupancy, staff summary, daily summary

### New Components

- `ProfitLossView.tsx` — P&L table with expandable sections
- `BalanceSheetView.tsx` — tree view with collapsible account groups
- `CashFlowView.tsx` — operating/investing/financing sections
- `RevenueByLineChart.tsx` — bar chart comparing business lines
- `DailySummaryTable.tsx` — daily cash position table
- `StaffSummaryCard.tsx` — HR metrics card

### Export Functionality

All reports include:
- CSV export (all rows)
- Print-friendly view
- Date range filter
- Business line filter (for P&L)

---

## Dashboard Enhancement

Update `Dashboard.tsx` to show:
- Revenue by business line (pie chart or bar chart)
- Cash position (total across all cash/bank/mobile accounts)
- Today's summary (revenue, expenses, net)
- Pending approvals (leave requests count)
- Shareholder quick summary (for SUPER_ADMIN/MANAGER)
- Attendance quick stats (% present today)

---

## Files to Create

| File | Purpose |
|------|---------|
| `apps/server/src/controllers/reportController.ts` | Enhanced with P&L, Balance Sheet, Cash Flow (replace existing) |
| `apps/admin/src/components/reports/ProfitLossView.tsx` | P&L report component |
| `apps/admin/src/components/reports/BalanceSheetView.tsx` | Balance sheet component |
| `apps/admin/src/components/reports/CashFlowView.tsx` | Cash flow component |
| `apps/admin/src/components/reports/RevenueByLineChart.tsx` | Revenue breakdown chart |

## Files to Modify

| File | Change |
|------|--------|
| `apps/server/src/routes/reportRoutes.ts` | Add new report endpoints |
| `apps/admin/src/pages/Reports/Reports.tsx` | Major enhancement with tabs and new views |
| `apps/admin/src/pages/Dashboard/Dashboard.tsx` | Add cash position, revenue by line, attendance quick stats |
