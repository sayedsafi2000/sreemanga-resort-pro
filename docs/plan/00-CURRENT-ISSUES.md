# Current System — Problems & Cleanup List

Verified against live code (branch `feat/share-management`). Ordered by severity. Each maps to the phase that fixes it.

## Critical (correctness / money / security)

| # | Problem | Evidence | Fix in |
|---|---------|----------|--------|
| C1 | **Restaurant orders track no money.** Orders create no Payment, no `paidAmount`. Restaurant revenue invisible to reports/accounts. | `restaurantController.ts` order create → `status: 'PENDING'` only | Phase 2 |
| C2 | **`BANK_TRANSFER` mislabeled as `CARD`.** Bank payments recorded as card. | `bookingPayment.ts:19-20` `case 'BANK_TRANSFER': return 'CARD'` | Phase 0 |
| C3 | **Open registration accepts any role.** `POST /api/auth/register` takes `role` from body, defaults RECEPTIONIST — anyone can self-register as SUPER_ADMIN. | `authController.ts:75` `role: role \|\| 'RECEPTIONIST'` | Phase 8 (lock down) |
| C4 | **OTP in-memory `Map`.** Lost on restart, breaks multi-instance, no rate limit → OTP spam. | `publicController.ts:13` `const otpStore = new Map` | Phase 0 (persist) + Phase 8 (rate limit) |
| C5 | **PaymentMethod enum incomplete.** No `BANK_TRANSFER`, no `MOBILE_BANKING`; bKash/Nagad squeezed into wrong buckets. | `schema.prisma:382-388` | Phase 0 |

## High (performance / data integrity)

| # | Problem | Evidence | Fix in |
|---|---------|----------|--------|
| H1 | **Backfill runs on every `GET /payments`.** Full scan + writes on a read path. | `paymentController.ts:16` `await backfillMissingBookingPayments()` in `getAllPayments` | Phase 0 (move to explicit endpoint) |
| H2 | **Images stored as base64 in Postgres**, `express.json({ limit: '10mb' })`. DB bloat, slow loads. | `index.ts:55` | Phase 8 (cloud upload) |
| H3 | **No audit trail.** No record of who changed bookings/payments/expenses. | — | Phase 8 |
| H4 | **No account/ledger** — expenses exist but no cash/bank balances, no revenue segmentation, no balance sheet. | only `Expense` + `ExpenseCategory` | Phase 4 |

## Medium (structure / UX / maintainability)

| # | Problem | Evidence | Fix in |
|---|---------|----------|--------|
| M1 | **Expense categories not organized** — free-form, not linked to a chart of accounts. | `ExpenseCategory` standalone | Phase 0 (link to Account) |
| M2 | **Salary category coupled by name string.** Renaming the "Staff Salary" category breaks payroll sync. | `expenditureController.ts:76` | Phase 6 (link by id/flag) |
| M3 | **Route-level RBAC only** — no per-action granularity (a MANAGER can delete). No SHAREHOLDER role. | `index.ts` mounts + `roleCheck` | Phase 5 (role) + Phase 8 (granular) |
| M4 | **No inventory** — products, food items, amenities untracked (client req #2). | — | Phase 3 |
| M5 | **Three Tailwind configs + stray `next.config.mjs` in the Vite admin.** Config confusion. | admin app | Phase 8 (cleanup, optional) |
| M6 | **No `.env.example`.** New env vars undocumented across three apps. | — | Phase 8 |

## Low (nice-to-have)

| # | Problem | Fix in |
|---|---------|--------|
| L1 | No API docs (Swagger). | Phase 8 |
| L2 | No rate limiting on auth/OTP. | Phase 8 |
| L3 | Inconsistent port defaults across apps (server 3001 vs dev wiring 8000). | Phase 8 (align + document) |
| L4 | No tests yet (framework configured, suites empty). | ongoing (see 10-TESTING.md) |

---

## Quick-win batch (do alongside Phase 0)

C2, C5, H1 are small, isolated, and unblock accounting. Knock them out first in Phase 0.
