# Phase 10 (post-plan): Shareholder Polish → Docs-Sync + Merge → Testing

**Status of the project as a whole.** All planned phases (0–8) are built and wired
end-to-end across `apps/server`, `apps/admin`, and `apps/web`. Every domain has a
server route + controller + admin page + RBAC entry. This doc is the follow-up
work list after that build-out, in the order the team agreed to run it:

1. **Shareholder polish** (finish the active `feat/share-management` branch)
2. **Docs sync + merge to `main`**
3. **Testing** (first real suites — 0 exist today)

Merge *target* (straight-to-main vs PR) is **deferred** — decide at step 2.

---

## Context: what's already done (do NOT redo)

Verified against live code on `feat/share-management`:

- **OTP is DB-backed** (`prisma.otpCode` in `publicController.ts`). The old
  in-memory `Map` is gone. `CLAUDE.md` and `00-CURRENT-ISSUES.md` (C4) still
  describe the old behaviour — **stale**, fix in step 2.
- **Audit logging** (`audit()` middleware, `AuditLog` model, `/api/audit-logs`,
  admin `AuditLog` page) — done. `TODOS.md` still lists it as pending — stale.
- **Rate limiting** (`authLimiter`, `otpLimiter`, `apiLimiter` in `index.ts`) — done.
- **Register lockdown** (C3), **PaymentMethod enum** (C2/C5), **backfill off the
  read path** (H1) — done in Phase 0.
- Day Long, Inventory, Accounts/Chart-of-Accounts, Shareholders + Portal,
  Staff HR, Reports, Templates — all shipped.

Still genuinely open (not this doc's steps 1–3, tracked for later):
- **H2 — base64 images in Postgres.** Every upload is a data-URL in the DB.
  Largest architectural debt; own phase later (object storage / S3 / R2).
- **Zero automated tests** — addressed in step 3 below.

---

## Step 1 — Shareholder polish (admin UI only; API already supports everything)

The backend already exposes every capability below; the admin page
(`apps/admin/src/pages/Shareholders/Shareholders.tsx`) just doesn't surface them.
**No schema or server changes needed** for 1.1–1.4.

### 1.1 CUSTOM-share amount entry (highest value — correctness)
**Problem.** `calculateProfitShares()` assigns `CUSTOM` shareholders **0**
(`profitDistributionController.ts:34`). The only way to set their amount is
`POST /shareholders/distributions/:id/custom-shares` (DRAFT only) — which the UI
never calls. So any CUSTOM shareholder silently receives nothing.

**Fix.** In the distribution **detail dialog** (`Shareholders.tsx:244`), when
`detail.status === 'DRAFT'`, make each `CUSTOM`-type share row's amount an
editable input. Add a "Save custom amounts" button that calls:
```
POST /shareholders/distributions/:id/custom-shares
body: { shares: [{ shareholderId, amount }, ...] }  // CUSTOM rows only
```
Then re-open detail to refresh totals. Endpoint + validator
(`customSharesSchema`) already exist.

**Also add "Recalculate"** button (DRAFT only) → `POST .../:id/recalculate`
(`recalcDistribution` exists) so an admin can reset shares after editing holders.

### 1.2 Edit + deactivate shareholders
**Problem.** `PATCH /shareholders/:id` (`updateShareholder`) and
`DELETE /shareholders/:id` (`deleteShareholder`) exist; the table
(`Shareholders.tsx:153`) has no row actions.

**Fix.** Add an actions column with **Edit** (reuses the shareholder dialog in
edit mode — PATCH instead of POST) and **Deactivate/Activate** (PATCH
`{ isActive }`, or DELETE for soft-remove — confirm which the controller does
before wiring). Reuse the existing dialog; branch on an `editingId` in state.

### 1.3 Complete the create/edit form
**Problem.** `shareholderSchema` accepts `address`, `nid`, `totalShares`,
`notes` (validator lines 7–14); the form (`Shareholders.tsx:191`) only sends
name/phone/email/shareType/shareValue/investmentAmount/login.

**Fix.** Add inputs for **NID**, **Address**, **Total shares** (number, optional),
**Notes** (textarea) to the shareholder dialog and include them in the POST/PATCH
body. Optional/nullable — no validation friction.

### 1.4 Consolidate the duplicate web portal
**Problem.** Two shareholder portals exist:
- admin `/portal` (`apps/admin/src/pages/Portal/ShareholderPortal.tsx`) — the one
  the client uses (per `11-UI-AND-SHAREHOLDER-FIX.md`).
- web `/shareholder` (`apps/web/src/app/shareholder/page.tsx`) — built in Phase 5,
  **not linked** from any web nav, redundant.

**Decision (recommended).** Keep admin `/portal` as the single portal. For the
web page, either (a) redirect `/shareholder` → the admin login, or (b) delete the
route and its `resort-api.ts` shareholder helpers. Pick (a) if any external link
to `/shareholder` may exist, else (b). **Confirm with client before deleting.**

### 1.5 (Optional) Distribution-paid email
When a distribution is marked DISTRIBUTED, email each shareholder their amount.
`emailService.ts` already has the transport + branded templates; add one template
+ a best-effort send loop in `distributeDistribution`
(`profitDistributionController.ts:141`). Non-blocking (return `false` on failure).
Skip if out of scope.

### Step 1 acceptance
- CUSTOM shareholder can be assigned a non-zero amount and it survives approve →
  distribute; ledger OUT entry matches the new `totalDistributed`.
- Shareholder can be edited and deactivated from the table.
- Create form round-trips NID/address/totalShares/notes.
- Only one portal is reachable.
- `tsc --noEmit` clean for admin + server; manual click-through of the full
  DRAFT → APPROVED → DISTRIBUTED flow with a CUSTOM holder in the mix.

---

## Step 2 — Docs sync + merge to `main`

### 2.1 Fix stale docs (they contradict live code)
- **`CLAUDE.md`** — the "Booking OTP is in-memory, not in the DB" paragraph is
  wrong; OTP now lives in the `OtpCode` table. Rewrite it.
- **`docs/plan/00-CURRENT-ISSUES.md`** — mark C2, C3, C4, C5, H1 as **DONE**
  (with commit refs), and note H2 + tests remain.
- **`TODOS.md`** — remove audit-trail + rate-limiting from "pending"; they ship.
- Anywhere docs say "framework configured, suites empty" — still true until step 3.

### 2.2 Prepare the branch for merge
`feat/share-management` is ~112 files / +13.5k lines ahead of `main` (Day Long,
Inventory, Accounts, Shareholder, Staff HR, Reports, audit, rate-limit, Docker,
this plan). Before merging:
- `npm run build` for all three apps; `tsc --noEmit` clean.
- Check the flagged **pre-existing** type error at
  `apps/web/src/components/BookingForm.tsx:641` (unrelated to shareholder work) —
  fix or confirm it's a false alarm.
- Run `prisma generate` + `db:push` against a clean DB to confirm the schema
  applies from scratch (migrations dir is gitignored — `db:push` is the workflow).
- **Merge-target decision goes here** (straight-to-`main` vs PR review). Deferred
  until now on purpose.

### Step 2 acceptance
- Docs no longer contradict code. All three apps build. Schema applies clean.
  Branch ready to merge (mechanism chosen at this point).

---

## Step 3 — Testing (first real suites)

**State today: 0 test files** in any app, though Vitest + Supertest (server) and
Vitest + RTL (admin/web) are configured and `docs/plan/10-TESTING.md` has the full
strategy. Start with money-critical, pure-logic paths for the best ROI.

Priority order:
1. **`calculateProfitShares()`** (`profitDistributionController.ts:19`) — pure
   function, unit-test FIXED-first-then-percentage split, empty pool, CUSTOM=0,
   rounding. High value, trivial to test.
2. **`utils/accountLedger.ts`** — signed cashbook / double-entry helpers.
3. **`utils/bookingPayment.ts`** — amount + status derivation (the C2 bug lived
   here). Include the BANK_TRANSFER-not-CARD regression.
4. **Supertest** on the distribution lifecycle: create (DRAFT) → custom-shares →
   approve → distribute, asserting status guards (e.g. can't distribute a
   non-APPROVED) and the ledger OUT entry.
5. Auth/RBAC: a SHAREHOLDER token can hit `/api/shareholder/*` but not
   `/api/shareholders/*` (portal vs management).

Follow `10-TESTING.md` for harness setup (test DB, fixtures). Wire `npm test`
into the root scripts so CI can run it.

### Step 3 acceptance
- `npm test` runs green with real assertions on the 5 areas above. Coverage is a
  starting floor, not exhaustive — money paths first.

---

## Out of scope here (later phases)
- **H2 object storage** for images (base64 → S3/R2) — its own phase.
- Broad per-page UI redesign (client: "nav + shareholder is enough for now").
- Granular per-action RBAC beyond current route-level checks.
