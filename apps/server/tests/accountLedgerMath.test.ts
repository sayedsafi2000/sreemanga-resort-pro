import { describe, expect, it } from 'vitest';
import { balanceDelta } from '../src/utils/accountLedger';

/**
 * The one rule every ledger write and every edit/delete revert goes through:
 * IN adds, OUT subtracts, and `sign = -1` is the exact mirror of the original posting.
 */
describe('balanceDelta', () => {
  it('adds on IN and subtracts on OUT', () => {
    expect(balanceDelta('IN', 500)).toBe(500);
    expect(balanceDelta('OUT', 500)).toBe(-500);
  });

  it('reverts an entry with sign -1 so revert + original nets to zero', () => {
    for (const direction of ['IN', 'OUT'] as const) {
      expect(balanceDelta(direction, 1234.56) + balanceDelta(direction, 1234.56, -1)).toBe(0);
    }
  });

  it('editing a row = revert old delta + apply new delta', () => {
    // Manual IN 500 edited to OUT 200 on a balance of 1000 → 1000 − 500 − 200 = 300.
    const balance = 1000 + balanceDelta('IN', 500, -1) + balanceDelta('OUT', 200);
    expect(balance).toBe(300);
  });

  it('transfer legs mirror each other: editing the amount keeps the pair balanced', () => {
    const from = 1000 + balanceDelta('OUT', 300);
    const to = 100 + balanceDelta('IN', 300);
    // Edit 300 → 450 on both legs.
    const from2 = from + balanceDelta('OUT', 300, -1) + balanceDelta('OUT', 450);
    const to2 = to + balanceDelta('IN', 300, -1) + balanceDelta('IN', 450);
    expect(from2 + to2).toBe(from + to);
    expect(from2).toBe(550);
    expect(to2).toBe(550);
  });

  it('is zero for a zero amount (either sign of zero)', () => {
    expect(balanceDelta('IN', 0) === 0).toBe(true);
    expect(balanceDelta('OUT', 0, -1) === 0).toBe(true);
  });
});
