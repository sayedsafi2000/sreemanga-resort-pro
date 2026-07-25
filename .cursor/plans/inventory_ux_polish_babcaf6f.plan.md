---
name: Inventory UX Polish
overview: Polish Inventory action/movement clarity (colors, labels, actor), unify primary button color to `default` (blue), move Dashboard Quick Actions up and expand them, keep Staff Salary only on `/staff-salaries`, and show negative/outgoing Accounts balances in red.
todos:
  - id: inv-movements-actions
    content: Color-coded Issue/Adjust/Edit buttons; Title Case movement types + createdBy column (API include)
    status: completed
  - id: primary-buttons
    content: Replace variant=ink with default across admin primary CTAs
    status: completed
  - id: quick-actions
    content: Move Quick Actions above stats; expand role-aware shortcuts
    status: completed
  - id: staff-salary-route
    content: Remove Staff Salary from expenditures sidebar/add form; point users to /staff-salaries
    status: completed
  - id: accounts-colors
    content: Red negative balances; colored IN/OUT and receivable outstanding
    status: completed
isProject: false
---

# Inventory / Dashboard / Salary UX polish

## 1. Inventory — clear actions + readable movements

**File:** [apps/admin/src/pages/Inventory/Inventory.tsx](apps/admin/src/pages/Inventory/Inventory.tsx)  
**API:** [apps/server/src/controllers/inventoryController.ts](apps/server/src/controllers/inventoryController.ts)

**Row actions (stop icon-only confusion):**
- Replace ghost icon-only buttons with small labeled, color-coded buttons:
  - **Issue** — amber (`text-amber-700 border-amber-200 bg-amber-50`)
  - **Adjust** — blue (`text-blue-700 border-blue-200 bg-blue-50`)
  - **Edit** — slate/outline
  - **Deactivate** — red outline (already red icon)
- Dialog titles stay `Issue stock — {item}` / `Adjust stock — {item}` / `Edit item — {item}` so the item name is not confused with the action.

**Movements table:**
- Do not show raw enum caps (`ISSUE`, `ADJUSTMENT`). Map to Title Case labels: Issue, Adjust, Purchase, Sale, Consumption, Return.
- Color badges by type (e.g. Issue amber, Adjust blue, Purchase green, Consumption/Sale rose).
- Include **By** column: who did it (`createdBy.name`) and keep human-readable date/time.
- Server: `listMovements` already stores `createdById` but does not include user — change to:

```ts
include: {
  item: true,
  supplier: true,
  createdBy: { select: { id: true, name: true } },
}
```

- Qty direction hint: show Issue/OUT as `−qty`, Purchase/IN as `+qty` where type implies direction; keep Adjust signed via notes/preview already in dialogs.
- Negative `balanceAfter` stays red.

## 2. Unify primary button color (black vs blue)

Root cause: [button.tsx](apps/admin/src/components/ui/button.tsx) has `default` = `bg-primary` (blue) and `ink` = `bg-ink` (near-black). Pages mix both (e.g. Expenditures `variant="ink"`).

**Fix:** Replace all admin `variant="ink"` primary CTAs with `variant="default"` so Add / Save / primary actions match dashboard blue. Leave outline/ghost/destructive as-is. Scope: the ~12 files currently using `ink` (Expenditures, Bookings, Rooms, Guests, Payments, etc.).

## 3. Quick Actions — top of Dashboard + more useful links

**File:** [apps/admin/src/pages/Dashboard/Dashboard.tsx](apps/admin/src/pages/Dashboard/Dashboard.tsx)

- Move the Quick Actions block **above the stats cards** (immediately under the page header) so it is the first interactive strip.
- Keep role-aware links; expand for fewer clicks:
  - Receptionist+: New Booking, Add Guest
  - Manager/Admin+: Add Room, Add Expense (`?tab=expenses&new=1`), Inventory low stock (`/inventory?tab=items&low=1`)
  - Finance roles (ACCOUNTANT + managers): Staff Salaries (`/staff-salaries`), Accounts transfer shortcut (`/accounts?tab=chart`)
- Slightly larger tap targets (`px-4 py-2.5`) — same colored chip pattern, not mixed primary black/blue buttons.

## 4. Staff Salary only via `/staff-salaries`

Staff payroll must not be operated from Expenditures.

| Surface | Change |
|---------|--------|
| [Layout.tsx](apps/admin/src/components/layout/Layout.tsx) `ExpenditureNavGroup` | Omit category named `Staff Salary` from sidebar children (or link that single child to `/staff-salaries` — **omit** so nav stays clean) |
| [Expenditures.tsx](apps/admin/src/pages/Expenditures/Expenditures.tsx) | Exclude Staff Salary from Add Expense category Select; if URL `categoryId` is that category, show banner + button “Open Staff Salaries” instead of locking Add Expense to payroll |
| Category manager | Keep existing reserved-name rules; no new Staff Salary create |
| Historical rows | Keep read-only visibility of salary-synced expenses; prefer link/badge to `/staff-salaries` rather than edit as a normal expense |

No schema change; salaries page remains the write path.

## 5. Accounts — red (and semantic colors) where needed

**File:** [apps/admin/src/pages/Accounts/Accounts.tsx](apps/admin/src/pages/Accounts/Accounts.tsx)

- Helper `balanceClass(n)` → `text-red-600` when `n < 0`, else default; apply to cash cards, chart row balances, group totals, detail header.
- Transaction amounts: OUT in red, IN in emerald (direction badge already colored).
- Receivables: outstanding balance (`amount - collected`) in amber when &gt; 0; red if overdue (`dueDate < today` and not COLLECTED).

## Implementation order

1. Inventory API `createdBy` + UI movements/actions colors  
2. Replace `ink` → `default` primary CTAs  
3. Dashboard Quick Actions relocate + expand  
4. Staff Salary out of expenditures nav/forms  
5. Accounts balance/amount coloring
