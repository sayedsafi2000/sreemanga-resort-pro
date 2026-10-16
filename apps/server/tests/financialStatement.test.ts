import { describe, expect, it } from 'vitest';
import { parsePeriod } from '../src/utils/dateRange';
import { METHOD_ACCOUNT } from '../src/utils/accountLedger';
import {
  buildStatement,
  effectivePaymentDate,
  lineOf,
  methodGroup,
  type ExpenseRow,
  type FinanceEntryRow,
  type PaymentRow,
  type RefundRow,
  type StatementInput,
} from '../src/utils/financialStatement';

const NOW = new Date(2026, 9, 16);
const PERIOD = parsePeriod('2026-10-01', '2026-10-31', NOW);
const inOct = (day: number, hour = 10) => new Date(2026, 9, day, hour);
const inSep = (day: number) => new Date(2026, 8, day, 10);

const CAT = {
  food: { categoryId: 'c-food', categoryName: 'Food & Kitchen', kind: 'PURCHASE' },
  util: { categoryId: 'c-util', categoryName: 'Utilities', kind: 'EXPENSE' },
  salary: { categoryId: 'c-sal', categoryName: 'Staff Salary', kind: 'EXPENSE' },
  tax: { categoryId: 'c-tax', categoryName: 'Income Tax', kind: 'INCOME_TAX' },
  fixed: { categoryId: 'c-fix', categoryName: 'Fixed Assets', kind: 'FIXED_ASSET' },
} as const;

const pay = (amount: number, date: Date, extra: Partial<PaymentRow> = {}): PaymentRow => ({
  amount, method: 'CASH', businessLine: 'ROOM', bookingId: 'b1', referenceType: 'BOOKING', paidAt: date, createdAt: date, ...extra,
});
const exp = (amount: number, date: Date, cat: (typeof CAT)[keyof typeof CAT], method = 'CASH'): ExpenseRow => ({
  amount, date, paymentMethod: method, ...cat,
});
const entry = (type: FinanceEntryRow['type'], amount: number, date: Date, method: string | null = 'CASH'): FinanceEntryRow => ({ type, amount, method, date });

const empty = (): StatementInput => ({
  period: PERIOD, payments: [], refunds: [], expenses: [], sharePayments: [], holdingRefunds: [], distributions: [], entries: [],
});

describe("the client's worked example", () => {
  // Revenue 100, refund 10, purchase 30, expenses 25, tax 2 → distributable 33;
  // opening cash 67 + fixed 400 − liability 50 → Total Asset 500 = Liability 50 + Equity 450.
  const input: StatementInput = {
    ...empty(),
    payments: [pay(60, inOct(2)), pay(40, inOct(5), { method: 'BKASH', businessLine: 'RESTAURANT', referenceType: 'RESTAURANT_ORDER', bookingId: null })],
    refunds: [{ id: 'r1', amount: 10, method: 'CASH', businessLine: 'ROOM', referenceType: 'BOOKING', refundedAt: inOct(6), reason: 'Cancelled', label: 'INV-00001 · Guest' }],
    expenses: [exp(30, inOct(7), CAT.food), exp(15, inOct(8), CAT.util), exp(10, inOct(9), CAT.salary), exp(2, inOct(10), CAT.tax)],
    entries: [
      entry('OPENING_CASH', 67, inSep(1)),
      entry('OPENING_FIXED_ASSET', 400, inSep(1), null),
      entry('OPENING_LIABILITY', 50, inSep(1), null),
    ],
  };
  const s = buildStatement(input);

  it('income statement lines', () => {
    expect(s.incomeStatement.revenue.total).toBe(100);
    expect(s.incomeStatement.revenue.byLine).toEqual({ ROOM: 60, RESTAURANT: 40, DAY_LONG: 0 });
    expect(s.incomeStatement.revenue.byMethod).toEqual({ CASH: 60, MOBILE: 40, BANK: 0 });
    expect(s.incomeStatement.refunds.total).toBe(10);
    expect(s.incomeStatement.refunds.items[0]).toMatchObject({ label: 'INV-00001 · Guest', reason: 'Cancelled', amount: 10 });
    expect(s.incomeStatement.netRevenue).toBe(90);
    expect(s.incomeStatement.purchases.total).toBe(30);
    expect(s.incomeStatement.grossProfit).toBe(60);
    expect(s.incomeStatement.expenses.total).toBe(25);
    expect(s.incomeStatement.expenses.byCategory.map((c) => c.name)).toEqual(['Utilities', 'Staff Salary']);
    expect(s.incomeStatement.netProfit).toBe(35);
  });
  it('profit & loss distribution', () => {
    expect(s.distribution.incomeTax.total).toBe(2);
    expect(s.distribution.distributable).toBe(33);
  });
  it('balance sheet balances exactly', () => {
    expect(s.balanceSheet.currentAssets.total).toBe(100);
    expect(s.balanceSheet.fixedAssets.total).toBe(400);
    expect(s.balanceSheet.totalAssets).toBe(500);
    expect(s.balanceSheet.liabilities.total).toBe(50);
    expect(s.balanceSheet.equity.openingCapital).toBe(417);
    expect(s.balanceSheet.equity.retainedEarnings.total).toBe(33);
    expect(s.balanceSheet.equity.total).toBe(450);
    expect(s.balanceSheet.totalLiabilitiesEquity).toBe(500);
    expect(s.balanceSheet.balanced).toBe(true);
    expect(s.period.label).toBe('October 2026');
  });
});

describe('period vs cumulative', () => {
  it('older money is in cash and retained earnings but not in the period P&L', () => {
    const s = buildStatement({ ...empty(), payments: [pay(500, inSep(10)), pay(200, inOct(3))], expenses: [exp(100, inSep(12), CAT.util)] });
    expect(s.incomeStatement.revenue.total).toBe(200);
    expect(s.incomeStatement.expenses.total).toBe(0);
    expect(s.balanceSheet.currentAssets.cash.total).toBe(600);
    expect(s.balanceSheet.equity.retainedEarnings.total).toBe(600);
    expect(s.balanceSheet.balanced).toBe(true);
  });
  it('effectivePaymentDate prefers paidAt and falls back to createdAt', () => {
    expect(effectivePaymentDate({ paidAt: inOct(5), createdAt: inSep(1) })).toEqual(inOct(5));
    expect(effectivePaymentDate({ paidAt: null, createdAt: inSep(1) })).toEqual(inSep(1));
    const s = buildStatement({ ...empty(), payments: [pay(100, inSep(1), { paidAt: null, createdAt: inOct(2) })] });
    expect(s.incomeStatement.revenue.total).toBe(100);
  });
});

describe('classification helpers', () => {
  it('methodGroup agrees with the ledger account mapping', () => {
    const groupOfCode: Record<string, string> = { '1001': 'CASH', '1003': 'MOBILE', '1002': 'BANK' };
    for (const [method, code] of Object.entries(METHOD_ACCOUNT)) {
      expect(methodGroup(method)).toBe(groupOfCode[code]);
    }
    expect(methodGroup(null)).toBe('CASH');
  });
  it('lineOf falls back through referenceType and bookingId', () => {
    expect(lineOf({ businessLine: 'DAY_LONG' })).toBe('DAY_LONG');
    expect(lineOf({ businessLine: null, referenceType: 'RESTAURANT_ORDER' })).toBe('RESTAURANT');
    expect(lineOf({ businessLine: null, referenceType: null, bookingId: 'b' })).toBe('ROOM');
    expect(lineOf({})).toBe('ROOM');
  });
});

describe('expense kinds', () => {
  it('routes each kind to its own line; fixed assets never touch the P&L', () => {
    const base = { ...empty(), payments: [pay(1000, inOct(1))] };
    const s = buildStatement({ ...base, expenses: [exp(300, inOct(2), CAT.fixed), exp(50, inOct(3), CAT.tax), exp(120, inOct(4), CAT.food), exp(80, inOct(5), CAT.util)] });
    expect(s.incomeStatement.purchases.total).toBe(120);
    expect(s.incomeStatement.expenses.total).toBe(80);
    expect(s.incomeStatement.netProfit).toBe(800);
    expect(s.distribution.incomeTax.total).toBe(50);
    expect(s.distribution.distributable).toBe(750);
    expect(s.balanceSheet.fixedAssets.additions).toBe(300);
    expect(s.balanceSheet.fixedAssets.additionsByCategory[0]).toMatchObject({ name: 'Fixed Assets', amount: 300 });
    expect(s.balanceSheet.currentAssets.cash.total).toBe(1000 - 300 - 50 - 120 - 80);
    expect(s.balanceSheet.balanced).toBe(true);
  });
  it('treats unknown kinds as operating expenses', () => {
    const s = buildStatement({ ...empty(), expenses: [exp(10, inOct(2), { ...CAT.util, kind: 'WHATEVER' } as any)] });
    expect(s.incomeStatement.expenses.total).toBe(10);
  });
});

describe('refunds, capital and finance entries', () => {
  it('a refund lowers net revenue, cash and retained earnings by the same amount', () => {
    const before = buildStatement({ ...empty(), payments: [pay(500, inOct(1))] });
    const refund: RefundRow = { id: 'r', amount: 120, method: 'BKASH', businessLine: 'ROOM', referenceType: 'BOOKING', refundedAt: inOct(4) };
    const after = buildStatement({ ...empty(), payments: [pay(500, inOct(1))], refunds: [refund] });
    expect(before.incomeStatement.netRevenue - after.incomeStatement.netRevenue).toBe(120);
    expect(before.balanceSheet.currentAssets.cash.total - after.balanceSheet.currentAssets.cash.total).toBe(120);
    expect(after.balanceSheet.currentAssets.cash.byMethod).toEqual({ CASH: 500, MOBILE: -120, BANK: 0 });
    expect(before.balanceSheet.equity.retainedEarnings.total - after.balanceSheet.equity.retainedEarnings.total).toBe(120);
    expect(after.balanceSheet.balanced).toBe(true);
  });
  it('share capital, holding refunds and distributions sit in equity, not in the P&L', () => {
    const s = buildStatement({
      ...empty(),
      payments: [pay(1000, inOct(1))],
      sharePayments: [{ amount: 150000, method: 'BANK_TRANSFER', paidAt: inSep(5) }, { amount: 150000, method: 'CASH', paidAt: inOct(9) }],
      holdingRefunds: [{ amount: 150000, refundedAt: inOct(20) }],
      distributions: [{ id: 'd1', periodLabel: 'September 2026', totalDistributed: 400, distributionDate: inOct(12) }],
    });
    expect(s.incomeStatement.revenue.total).toBe(1000);
    expect(s.incomeStatement.netProfit).toBe(1000);
    expect(s.balanceSheet.equity.shareCapital).toEqual({ received: 300000, refunded: 150000, net: 150000 });
    expect(s.distribution.distributionsPaid.total).toBe(400);
    expect(s.balanceSheet.equity.retainedEarnings.total).toBe(600);
    expect(s.balanceSheet.currentAssets.cash.total).toBe(1000 + 300000 - 150000 - 400);
    expect(s.balanceSheet.balanced).toBe(true);
  });
  it('loans move cash and liabilities; owner capital moves cash and equity', () => {
    const s = buildStatement({
      ...empty(),
      entries: [entry('LOAN_RECEIVED', 50000, inOct(2), 'BANK_TRANSFER'), entry('LOAN_REPAID', 10000, inOct(20), 'BANK_TRANSFER'), entry('CAPITAL_IN', 20000, inOct(3)), entry('CAPITAL_OUT', 5000, inOct(25))],
    });
    expect(s.balanceSheet.liabilities).toEqual({ total: 40000, opening: 0, loansReceived: 50000, loansRepaid: 10000 });
    expect(s.balanceSheet.equity.ownerCapital).toEqual({ in: 20000, out: 5000, net: 15000 });
    expect(s.balanceSheet.currentAssets.cash.byMethod).toEqual({ CASH: 15000, MOBILE: 0, BANK: 40000 });
    expect(s.incomeStatement.netProfit).toBe(0);
    expect(s.balanceSheet.balanced).toBe(true);
  });
  it('ignores unknown entry types and keeps 2-dp rounding exact', () => {
    const s = buildStatement({ ...empty(), payments: [pay(0.1, inOct(1)), pay(0.2, inOct(2))], entries: [entry('MYSTERY' as any, 999, inOct(1))] });
    expect(s.incomeStatement.revenue.total).toBe(0.3);
    expect(s.balanceSheet.currentAssets.cash.total).toBe(0.3);
    expect(s.balanceSheet.balanced).toBe(true);
  });
});

describe('accounting identity (property)', () => {
  // mulberry32 — deterministic PRNG so failures reproduce.
  function rng(seed: number) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const METHODS = ['CASH', 'BKASH', 'NAGAD', 'CARD', 'STRIPE', 'BANK_TRANSFER', 'MOBILE_BANKING'];
  const LINES = ['ROOM', 'RESTAURANT', 'DAY_LONG', null];
  const KINDS = [CAT.food, CAT.util, CAT.salary, CAT.tax, CAT.fixed];
  const TYPES: FinanceEntryRow['type'][] = ['OPENING_CASH', 'OPENING_FIXED_ASSET', 'OPENING_LIABILITY', 'LOAN_RECEIVED', 'LOAN_REPAID', 'CAPITAL_IN', 'CAPITAL_OUT'];

  it('Total Asset === Total Liability + Equity for 300 random ledgers', () => {
    const r = rng(20261016);
    const pick = <T,>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)];
    const money = () => Math.round(r() * 1_000_000) / 100; // up to 10,000.00 with paisa
    const when = () => new Date(PERIOD.endExclusive.getTime() - 1 - Math.floor(r() * 90 * 86_400_000)); // always < endExclusive
    for (let i = 0; i < 300; i++) {
      const n = () => Math.floor(r() * 8);
      const input: StatementInput = {
        period: PERIOD,
        payments: Array.from({ length: n() }, () => pay(money(), when(), { method: pick(METHODS), businessLine: pick(LINES), paidAt: r() < 0.2 ? null : when(), createdAt: when() })),
        refunds: Array.from({ length: n() }, (_, k) => ({ id: `r${k}`, amount: money(), method: pick(METHODS), businessLine: pick(LINES), referenceType: null, refundedAt: when() })),
        expenses: Array.from({ length: n() }, () => exp(money(), when(), pick(KINDS), pick(METHODS))),
        sharePayments: Array.from({ length: n() }, () => ({ amount: money(), method: pick(METHODS), paidAt: when() })),
        holdingRefunds: Array.from({ length: n() }, () => ({ amount: money(), refundedAt: when() })),
        distributions: Array.from({ length: n() }, (_, k) => ({ id: `d${k}`, periodLabel: 'x', totalDistributed: money(), distributionDate: when() })),
        entries: Array.from({ length: n() }, () => entry(pick(TYPES), money(), when(), pick(METHODS))),
      };
      const s = buildStatement(input);
      expect(s.balanceSheet.balanced).toBe(true);
      expect(s.balanceSheet.totalAssets).toBe(s.balanceSheet.totalLiabilitiesEquity);
      // cash is the sum of its by-method parts and of its roll-forward
      const bm = s.balanceSheet.currentAssets.cash.byMethod;
      expect(Math.round((bm.CASH + bm.MOBILE + bm.BANK) * 100)).toBe(Math.round(s.balanceSheet.currentAssets.cash.total * 100));
      const rf = s.balanceSheet.currentAssets.cash.rollForward;
      const viaRoll = rf.paymentsReceived - rf.refunds - rf.purchasesPaid - rf.expensesPaid - rf.incomeTaxPaid - rf.fixedAssetPurchases + rf.shareCapitalReceived - rf.shareCapitalRefunded - rf.distributionsPaid + rf.openingCash + rf.loansReceived - rf.loansRepaid + rf.ownerCapitalIn - rf.ownerCapitalOut;
      expect(Math.round(viaRoll * 100)).toBe(Math.round(s.balanceSheet.currentAssets.cash.total * 100));
    }
  });
});
