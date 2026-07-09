# Phase 2: Restaurant Revenue & Payment Integration

**Goal:** Close the biggest current gap — restaurant orders track NO money. Add order payment (POS + allow pending), wire restaurant revenue into the accounts ledger, and consume inventory on order.

**Depends on:** Phase 0 (BusinessLine enum, PaymentMethod fix). Ledger calls land once Phase 4 exists — until then, Payment records are created and the ledger hook is a no-op stub.

**Effort:** ~3-4 days

**Why this is its own phase:** The data-flow doc assumed restaurant orders create Payments + AccountTransactions, but no phase owned it and the code creates neither (verified: `restaurantController.ts` creates orders with `status: PENDING`, no Payment). This phase is that owner.

---

## Current State (verified)

- `RestaurantOrder` has `totalPrice`, `status` (PENDING→PREPARING→READY→DELIVERED→CANCELLED). No payment, no `paidAmount`, no link to `Payment`.
- Menu picker for order items already exists (commit `83b95bb`).
- Restaurant revenue is invisible to Reports and Accounts.

---

## Schema Changes

```prisma
enum RestaurantOrderPaymentStatus {
  UNPAID
  PARTIAL
  PAID
}

model RestaurantOrder {
  // ... existing fields ...
  businessLine   BusinessLine @default(RESTAURANT)
  paymentStatus  RestaurantOrderPaymentStatus @default(UNPAID)
  paidAmount     Float        @default(0)
  discount       Float        @default(0)
  serviceCharge  Float        @default(0)
  netAmount      Float?       // totalPrice - discount + serviceCharge
  payments       Payment[]    // polymorphic via referenceType + referenceId
}
```

`Payment` reference fields (`referenceType`, `referenceId`, `businessLine`) come from Phase 0 / Phase 1.

---

## Payment Model (decided: POS + allow pending)

- Order can be created UNPAID (a "tab"), then paid later — matches the room-booking pending flow already in code.
- Payment can be full or partial. `paymentStatus` derives from `paidAmount` vs `netAmount`.
- Unpaid balance becomes a **Receivable** in the accounts system (Phase 4).

---

## API Endpoints

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/api/restaurant/orders/:id/payments` | RECEPTIONIST, RESTAURANT_STAFF, MANAGER, SUPER_ADMIN | Record a payment against an order |
| GET | `/api/restaurant/orders/:id/payments` | Any auth | Payment history for order |
| PATCH | `/api/restaurant/orders/:id` | (existing) | Now also recomputes `netAmount`, `paymentStatus` |

### Record payment flow
1. Validate `amount <= netAmount - paidAmount`.
2. Inside `prisma.$transaction`:
   - Create `Payment { referenceType: 'RESTAURANT_ORDER', referenceId, businessLine: RESTAURANT, method, amount }`.
   - `order.paidAmount += amount`; recompute `paymentStatus`.
   - **Ledger (Phase 4):** `recordRevenue({ businessLine: 'RESTAURANT', method, amount, referenceType, referenceId })`.
   - **Inventory (Phase 3):** on first payment OR on DELIVERED, deduct consumed stock (see Phase 3 consumption hook).
3. Return updated order.

---

## Pricing / Totals

```
netAmount = totalPrice - discount + serviceCharge
paymentStatus =
  paidAmount <= 0            → UNPAID
  paidAmount >= netAmount    → PAID
  else                       → PARTIAL
```

---

## Admin UI (Restaurant.tsx enhancements)

- Order row shows payment badge (UNPAID/PARTIAL/PAID) + balance due.
- "Take Payment" dialog: method dropdown (CASH/BKASH/NAGAD/CARD), amount (default = balance), transaction ref.
- Discount + service charge inputs on the order form.
- Filter orders by paymentStatus.
- Daily restaurant sales summary card (total, paid, outstanding).

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/server/prisma/schema.prisma` | Add RestaurantOrderPaymentStatus, order payment fields, businessLine |
| `apps/server/src/controllers/restaurantController.ts` | Add record-payment handler, recompute totals, ledger + inventory hooks |
| `apps/server/src/routes/restaurantRoutes.ts` | Add `/orders/:id/payments` routes |
| `apps/server/src/validators/restaurantValidator.ts` | Payment + discount schemas |
| `apps/admin/src/pages/Restaurant/Restaurant.tsx` | Payment dialog, badges, discount/service charge, sales summary |

## Files to Create

| File | Purpose |
|------|---------|
| `apps/server/src/controllers/__tests__/restaurantPayment.test.ts` | Payment + partial + status derivation tests |
