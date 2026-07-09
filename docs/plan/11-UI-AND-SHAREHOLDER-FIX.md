# Phase 9 (post-plan): Navigation UX + Shareholder Login Fix

Not part of the original 0–8 plan — a follow-up round after client feedback:
_"improve the UI, easy to navigate, modals not complex; shareholder needs a
different login screen; the shareholder page shows nothing — fix it."_

Admin app only. No schema or API changes.

---

## Bug: shareholder page showed nothing

**Root cause.** The admin login sent every user to `/dashboard`, but the
`SHAREHOLDER` role did not exist anywhere in the admin RBAC (`config/rbac.ts`).
So a shareholder who logged in got:
- an empty sidebar (`getSidebarItems('SHAREHOLDER')` → `[]`), and
- a blocked route (`/dashboard` not allowed for SHAREHOLDER → RoleGuard → `/unauthorized`).

Net result: a blank/empty screen. The API (`/api/shareholder/*`) was fine the
whole time — the gap was purely front-end routing + RBAC.

---

## What changed

### 1. Separate shareholder login screen
`apps/admin/src/pages/Login/Login.tsx`
- Added a **Staff / Shareholder** segmented toggle at the top of the card.
- Shareholder mode is visually distinct: fuchsia/purple gradient, "Shareholder
  Login" title, portal icon, **no register form**.
- Same `/api/auth/login` endpoint; redirect is role-aware (see below).

### 2. Role-aware landing
`apps/admin/src/config/rbac.ts` — new `landingPath(role)`:
`SHAREHOLDER → /portal`, everyone else → `/dashboard`.
- Login `useEffect` redirects via `landingPath` after auth.
- `App.tsx` root `/` route replaced `Navigate to="/dashboard"` with a
  `RootRedirect` component that honours `landingPath` (so a returning
  shareholder with a saved token lands on their portal, not unauthorized).

### 3. Shareholder portal page (fixes the blank view)
`apps/admin/src/pages/Portal/ShareholderPortal.tsx` (new), route `/portal`.
- Cards: Total Investment · Total Received · Pending · Your Share.
- Distribution history table (period / amount / status / paid date).
- Reads `/api/shareholder/summary` + `/api/shareholder/profit-shares`
  (own-data-only endpoints, SHAREHOLDER-gated at the mount).

### 4. RBAC additions for SHAREHOLDER
`apps/admin/src/config/rbac.ts`
- `StaffRole` union += `SHAREHOLDER`.
- `ROUTE_ACCESS['/portal'] = ['SHAREHOLDER']`; `/unauthorized` allows it too.
- `getSidebarItems` SHAREHOLDER case → single "My Portal" item.
- Layout role badge styling for SHAREHOLDER (fuchsia).

### 5. Grouped sidebar navigation (the "easy to navigate" ask)
`apps/admin/src/config/rbac.ts` + `apps/admin/src/components/layout/Layout.tsx`
- New `SIDEBAR_SECTION` map (item key → section label).
- SUPER_ADMIN / MANAGER sidebars reordered into sections:
  **Overview · Operations · Finance · People · Content · System**.
- Layout renders a small uppercase section header when the section changes,
  so the 20+-item sidebar scans cleanly. Shorter role sidebars (receptionist,
  housekeeping, etc.) are unaffected — headers only show when a section is set.

### 6. Register form simplified (security + UX)
`apps/admin/src/pages/Login/Login.tsx`
- Removed the **Role dropdown** from the staff register form. It was dead after
  the Phase 8 security fix (server forces RECEPTIONIST and ignores any body
  `role`). Replaced with a one-line note: new accounts are Receptionist; a
  Super Admin changes roles from User Accounts.

---

## Files touched

| File | Change |
|------|--------|
| `apps/admin/src/config/rbac.ts` | SHAREHOLDER role, `/portal` access, `landingPath`, `SIDEBAR_SECTION`, sidebar reorder + SHAREHOLDER case |
| `apps/admin/src/components/layout/Layout.tsx` | Section-grouped sidebar rendering; SHAREHOLDER badge |
| `apps/admin/src/pages/Login/Login.tsx` | Staff/Shareholder toggle, role-aware redirect, removed role dropdown |
| `apps/admin/src/pages/Portal/ShareholderPortal.tsx` | New in-admin shareholder portal |
| `apps/admin/src/App.tsx` | `RootRedirect`, `/portal` route |

---

## Verification

- `tsc --noEmit` clean for admin **and** server.
- API confirmed: shareholder login → role `SHAREHOLDER`; `/shareholder/summary`
  returns all fields the page reads; `/shareholder/profit-shares` returns the
  distribution (e.g. "Janu", ৳999, PAID).
- ⏳ Browser click-through pending — blocked by a transient tool-classifier
  outage at implementation time; to run once it clears.

### Manual test
1. `localhost:8001/login` → **Staff / Shareholder** toggle visible.
2. Shareholder tab → fuchsia theme, "Shareholder Login", no register.
3. `shareholder@resortnirjon.com` / `Share@12345` → lands on `/portal` with
   Investment ৳500,000, Total Received ৳999, 50% share, one distribution row.
4. `admin@resortnirjon.com` / `Admin@12345` → sidebar shows grouped sections.

---

## Notes / follow-ups

- A separate **web** shareholder portal also exists at `apps/web` `/shareholder`
  (built in Phase 5). The admin-integrated `/portal` added here is the surface
  the client is using; both hit the same API.
- Broader "redesign every page" was scoped **out** for now (client: "nav +
  shareholder is enough for now"). The grouped nav is the cross-cutting win;
  per-page table/modal polish can follow as feedback comes in.
- Pre-existing unrelated type error remains in `apps/web/src/components/BookingForm.tsx:641`
  (never touched by this work) — worth a small separate fix.
