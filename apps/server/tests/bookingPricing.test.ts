import { describe, expect, it } from 'vitest';
import {
  bookingCellState,
  computeBookingTotal,
  formatInvoiceNo,
  mergeCellState,
  nightsBetween,
  paidAndDue,
  parseInvoiceNo,
  stayNights,
} from '../src/utils/bookingPricing';

const d = (s: string) => new Date(s);

describe('nightsBetween / stayNights', () => {
  it('counts calendar nights and never returns 0', () => {
    expect(nightsBetween(d('2026-09-12'), d('2026-09-13'))).toBe(1);
    expect(nightsBetween(d('2026-09-12'), d('2026-09-15'))).toBe(3);
    expect(nightsBetween(d('2026-09-12'), d('2026-09-12'))).toBe(1);
  });
  it('lists the occupied nights, excluding the checkout day', () => {
    expect(stayNights(d('2026-09-30'), d('2026-10-02'))).toEqual(['2026-09-30', '2026-10-01']);
  });
});

describe('computeBookingTotal', () => {
  it('adds nights, extra persons and extra charge, then applies both discounts', () => {
    const p = computeBookingTotal({ rate: 5500, nights: 2, extraPersons: 1, extraGuestCharge: 800, extraCharge: 500, voucherDiscount: 600, staffDiscount: 400 });
    expect(p.roomSubtotal).toBe(11000);
    expect(p.extraPersonTotal).toBe(1600);
    expect(p.gross).toBe(13100);
    expect(p.total).toBe(12100);
  });
  it('never goes negative and caps discounts at the gross amount', () => {
    const p = computeBookingTotal({ rate: 1000, nights: 1, voucherDiscount: 700, staffDiscount: 900 });
    expect(p.voucherDiscount).toBe(700);
    expect(p.staffDiscount).toBe(300);
    expect(p.total).toBe(0);
  });
  it('treats missing extras as zero', () => {
    expect(computeBookingTotal({ rate: 3800, nights: 3 }).total).toBe(11400);
  });
});

describe('paidAndDue', () => {
  it('counts only completed payments', () => {
    const r = paidAndDue(3800, [{ amount: 1000, status: 'COMPLETED' }, { amount: 3800, status: 'PENDING' }, { amount: 500, status: 'FAILED' }]);
    expect(r).toEqual({ paid: 1000, due: 2800 });
  });
  it('never reports negative due', () => {
    expect(paidAndDue(1000, [{ amount: 1500, status: 'COMPLETED' }]).due).toBe(0);
  });
});

describe('invoice numbers', () => {
  it('formats and parses INV references', () => {
    expect(formatInvoiceNo(42)).toBe('INV-00042');
    expect(parseInvoiceNo('INV-00042')).toBe(42);
    expect(parseInvoiceNo('inv 42')).toBe(42);
    expect(parseInvoiceNo('42')).toBe(42);
    expect(parseInvoiceNo('Rakiba')).toBeNull();
  });
});

describe('calendar cell states', () => {
  it('maps booking statuses', () => {
    expect(bookingCellState('PENDING')).toBe('RESERVED');
    expect(bookingCellState('CONFIRMED')).toBe('BOOKED');
    expect(bookingCellState('CHECKED_IN')).toBe('BOOKED');
    expect(bookingCellState('CANCELLED')).toBeNull();
  });
  it('lets the stronger state win', () => {
    expect(mergeCellState('AVAILABLE', 'RESERVED')).toBe('RESERVED');
    expect(mergeCellState('RESERVED', 'BOOKED')).toBe('BOOKED');
    expect(mergeCellState('BOOKED', 'RESERVED')).toBe('BOOKED');
    expect(mergeCellState('BOOKED', 'BLOCKED')).toBe('BLOCKED');
  });
});
