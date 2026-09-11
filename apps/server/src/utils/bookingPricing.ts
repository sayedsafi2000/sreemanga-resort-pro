/**
 * Booking pricing + invoice helpers (pure — unit tested in tests/bookingPricing.test.ts).
 *
 * total = rate × nights
 *       + extraPersons × extraGuestCharge × nights
 *       + extraCharge
 *       − voucherDiscount − staffDiscount        (never below 0)
 */

export const round2 = (n: number) => Math.round(n * 100) / 100;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar nights between check-in and check-out (half-open stay). Never below 1. */
export function nightsBetween(checkIn: Date, checkOut: Date): number {
  const a = Date.UTC(checkIn.getUTCFullYear(), checkIn.getUTCMonth(), checkIn.getUTCDate());
  const b = Date.UTC(checkOut.getUTCFullYear(), checkOut.getUTCMonth(), checkOut.getUTCDate());
  return Math.max(1, Math.round((b - a) / DAY_MS));
}

export type PricingInput = {
  rate: number;
  nights: number;
  extraPersons?: number;
  extraGuestCharge?: number | null;
  extraCharge?: number;
  voucherDiscount?: number;
  staffDiscount?: number;
};

export type PricingBreakdown = {
  rate: number;
  nights: number;
  roomSubtotal: number;
  extraPersons: number;
  extraPersonTotal: number;
  extraCharge: number;
  gross: number;
  voucherDiscount: number;
  staffDiscount: number;
  total: number;
};

export function computeBookingTotal(i: PricingInput): PricingBreakdown {
  const rate = Math.max(0, i.rate);
  const nights = Math.max(1, Math.floor(i.nights));
  const extraPersons = Math.max(0, Math.floor(i.extraPersons ?? 0));
  const roomSubtotal = round2(rate * nights);
  const extraPersonTotal = round2(extraPersons * (i.extraGuestCharge ?? 0) * nights);
  const extraCharge = round2(Math.max(0, i.extraCharge ?? 0));
  const gross = round2(roomSubtotal + extraPersonTotal + extraCharge);
  const voucherDiscount = round2(Math.min(gross, Math.max(0, i.voucherDiscount ?? 0)));
  const staffDiscount = round2(Math.min(gross - voucherDiscount, Math.max(0, i.staffDiscount ?? 0)));
  return {
    rate,
    nights,
    roomSubtotal,
    extraPersons,
    extraPersonTotal,
    extraCharge,
    gross,
    voucherDiscount,
    staffDiscount,
    total: round2(Math.max(0, gross - voucherDiscount - staffDiscount)),
  };
}

/** Paid = COMPLETED payments only; due never below 0. */
export function paidAndDue(totalAmount: number, payments: { amount: number; status: string }[]) {
  const paid = round2(payments.filter((p) => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0));
  return { paid, due: round2(Math.max(0, totalAmount - paid)) };
}

export function formatInvoiceNo(n: number): string {
  return `INV-${String(n).padStart(5, '0')}`;
}

/** Parse "INV-00042", "inv 42" or "42" → 42; null when it isn't an invoice reference. */
export function parseInvoiceNo(raw: string): number | null {
  const m = raw.trim().match(/^(?:inv[\s-]*)?0*(\d{1,9})$/i);
  return m ? Number(m[1]) : null;
}

export type CellState = 'BOOKED' | 'RESERVED' | 'BLOCKED' | 'AVAILABLE';

/** How a booking shows on the calendar / room grid. CANCELLED bookings don't occupy anything. */
export function bookingCellState(status: string): Exclude<CellState, 'BLOCKED' | 'AVAILABLE'> | null {
  if (status === 'PENDING') return 'RESERVED';
  if (status === 'CONFIRMED' || status === 'CHECKED_IN' || status === 'CHECKED_OUT') return 'BOOKED';
  return null;
}

/** Strongest state wins when several bookings touch the same room/night. */
export function mergeCellState(a: CellState, b: CellState): CellState {
  const rank: Record<CellState, number> = { AVAILABLE: 0, RESERVED: 1, BOOKED: 2, BLOCKED: 3 };
  return rank[b] > rank[a] ? b : a;
}

/** Every calendar date (YYYY-MM-DD, UTC) of a stay: check-in night up to, not including, checkout. */
export function stayNights(checkIn: Date, checkOut: Date): string[] {
  const out: string[] = [];
  const cur = new Date(Date.UTC(checkIn.getUTCFullYear(), checkIn.getUTCMonth(), checkIn.getUTCDate()));
  const end = Date.UTC(checkOut.getUTCFullYear(), checkOut.getUTCMonth(), checkOut.getUTCDate());
  while (cur.getTime() < end && out.length < 400) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}
