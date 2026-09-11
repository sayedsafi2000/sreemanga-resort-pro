import { describe, expect, it } from 'vitest';
import {
  calculateCapitalShares,
  describeUnits,
  holdingStatusFor,
  summarizeHoldings,
  tierAvailability,
  type HoldingLite,
} from '../src/utils/shareCapital';

const sum = (xs: { amount: number }[]) => Math.round(xs.reduce((s, x) => s + x.amount, 0) * 100) / 100;

describe('calculateCapitalShares', () => {
  it('splits profit in proportion to paid-up capital (Platinum weighs 2× Gold)', () => {
    const r = calculateCapitalShares(60000, [{ id: 'a', capital: 300000 }, { id: 'b', capital: 150000 }]);
    expect(r.totalCapital).toBe(450000);
    expect(r.shares).toEqual([
      { shareholderId: 'a', capitalAmount: 300000, sharePercent: 66.67, amount: 40000 },
      { shareholderId: 'b', capitalAmount: 150000, sharePercent: 33.33, amount: 20000 },
    ]);
  });

  it('pays out exactly the profit even when thirds do not divide evenly', () => {
    const r = calculateCapitalShares(100, [{ id: 'a', capital: 1 }, { id: 'b', capital: 1 }, { id: 'c', capital: 1 }]);
    expect(sum(r.shares)).toBe(100);
    expect(r.shares.map((s) => s.amount).sort()).toEqual([33.33, 33.33, 33.34]);
  });

  it('excludes holders with no paid-up capital and pays nothing on zero profit', () => {
    const r = calculateCapitalShares(5000, [{ id: 'a', capital: 150000 }, { id: 'pending', capital: 0 }]);
    expect(r.shares.map((s) => s.shareholderId)).toEqual(['a']);
    expect(r.shares[0].amount).toBe(5000);
    expect(calculateCapitalShares(0, [{ id: 'a', capital: 150000 }]).shares[0].amount).toBe(0);
    expect(calculateCapitalShares(1000, []).shares).toEqual([]);
  });
});

describe('holdings', () => {
  const gold = { code: 'GOLD', name: 'Gold' };
  const platinum = { code: 'PLATINUM', name: 'Platinum' };
  const holdings: HoldingLite[] = [
    { quantity: 2, totalPrice: 300000, paidAmount: 300000, status: 'ACTIVE', tier: gold },
    { quantity: 1, totalPrice: 300000, paidAmount: 100000, status: 'PENDING_PAYMENT', tier: platinum },
    { quantity: 1, totalPrice: 150000, paidAmount: 150000, status: 'CANCELLED', tier: gold },
  ];

  it('becomes ACTIVE only when fully paid, and cancelled stays cancelled', () => {
    expect(holdingStatusFor(100000, 300000)).toBe('PENDING_PAYMENT');
    expect(holdingStatusFor(300000, 300000)).toBe('ACTIVE');
    expect(holdingStatusFor(300000, 300000, 'CANCELLED')).toBe('CANCELLED');
  });

  it('summarises units, paid-up capital and dues while ignoring cancelled holdings', () => {
    const s = summarizeHoldings(holdings);
    expect(s.units).toEqual({ GOLD: 2, PLATINUM: 1 });
    expect(s.totalUnits).toBe(3);
    expect(s.activeCapital).toBe(300000); // only the fully paid Gold pair earns
    expect(s.committedCapital).toBe(600000);
    expect(s.paidTotal).toBe(400000);
    expect(s.dueTotal).toBe(200000);
    expect(s.pendingHoldings).toBe(1);
  });

  it('describes units compactly', () => {
    expect(describeUnits(holdings)).toBe('2 Gold · 1 Platinum');
    expect(describeUnits([])).toBe('No shares');
  });

  it('reports remaining units against a tier cap', () => {
    expect(tierAvailability({ totalUnits: 10 }, 7)).toEqual({ soldUnits: 7, availableUnits: 3 });
    expect(tierAvailability({ totalUnits: 5 }, 9).availableUnits).toBe(0);
    expect(tierAvailability({ totalUnits: null }, 9).availableUnits).toBeNull();
  });
});
