import { describe, expect, it } from 'vitest';
import { computeNet, derivePaymentStatus } from '../src/utils/orderPayment';

describe('computeNet', () => {
  it('subtracts the discount and adds the service charge', () => {
    expect(computeNet(1000, 100, 50)).toBe(950);
  });
  it('is the plain total when there is no discount or service charge', () => {
    expect(computeNet(1200, 0, 0)).toBe(1200);
  });
  it('never goes below zero', () => {
    expect(computeNet(100, 500, 0)).toBe(0);
  });
});

describe('derivePaymentStatus', () => {
  it('is UNPAID when nothing has been paid', () => {
    expect(derivePaymentStatus(0, 950)).toBe('UNPAID');
    expect(derivePaymentStatus(-1, 950)).toBe('UNPAID');
    expect(derivePaymentStatus(0, 0)).toBe('UNPAID');
  });
  it('is PARTIAL below the net amount', () => {
    expect(derivePaymentStatus(500, 950)).toBe('PARTIAL');
    expect(derivePaymentStatus(949.99, 950)).toBe('PARTIAL');
  });
  it('is PAID at or above the net amount', () => {
    expect(derivePaymentStatus(950, 950)).toBe('PAID');
    expect(derivePaymentStatus(1000, 950)).toBe('PAID');
  });
  it('steps back down after a refund lowers the paid amount (refund endpoint path)', () => {
    const net = computeNet(1000, 0, 0);
    expect(derivePaymentStatus(1000, net)).toBe('PAID');
    expect(derivePaymentStatus(Math.max(0, 1000 - 400), net)).toBe('PARTIAL');
    expect(derivePaymentStatus(Math.max(0, 1000 - 1000), net)).toBe('UNPAID');
    // Refunding more than was paid is floored at 0 by the caller, never negative.
    expect(derivePaymentStatus(Math.max(0, 1000 - 1500), net)).toBe('UNPAID');
  });
});
