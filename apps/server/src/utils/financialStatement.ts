import { inPeriod, periodLabel, type Period } from './dateRange';

/**
 * Financial Report derivation — pure, no Prisma.
 *
 * Cash-basis statement built from the operational rows staff already enter (payments,
 * expenses incl. the salary mirror rows, share payments, profit distributions) plus
 * FinanceEntry rows for money with no other record (opening balances, loans, owner capital).
 *
 * The caller passes every row dated BEFORE `period.endExclusive` (the balance sheet is
 * cumulative "as of" the period end); this module splits in-period vs cumulative itself.
 * Expenses must already be filtered to status PAID.
 *
 * All sums are done in integer paisa so Total Asset === Total Liability + Equity exactly.
 */

export type MethodGroup = 'CASH' | 'MOBILE' | 'BANK';
export type LineKey = 'ROOM' | 'RESTAURANT' | 'DAY_LONG';
export type CategoryKind = 'EXPENSE' | 'PURCHASE' | 'FIXED_ASSET' | 'INCOME_TAX';
export type FinanceEntryKind =
  | 'OPENING_CASH'
  | 'OPENING_FIXED_ASSET'
  | 'OPENING_LIABILITY'
  | 'LOAN_RECEIVED'
  | 'LOAN_REPAID'
  | 'CAPITAL_IN'
  | 'CAPITAL_OUT';

export interface PaymentRow {
  amount: number;
  method: string;
  businessLine?: string | null;
  bookingId?: string | null;
  referenceType?: string | null;
  paidAt?: Date | null;
  createdAt: Date;
}
export interface RefundRow {
  id: string;
  amount: number;
  method: string;
  businessLine?: string | null;
  referenceType?: string | null;
  refundedAt: Date;
  reason?: string | null;
  /** Human label resolved by the caller, e.g. "INV-00042 · Guest name". */
  label?: string | null;
}
export interface ExpenseRow {
  amount: number;
  date: Date;
  paymentMethod?: string | null;
  categoryId: string;
  categoryName: string;
  kind: CategoryKind | string;
}
export interface SharePaymentRow {
  amount: number;
  method: string;
  paidAt: Date;
}
export interface HoldingRefundRow {
  amount: number;
  refundedAt: Date;
}
export interface DistributionRow {
  id: string;
  periodLabel: string;
  totalDistributed: number;
  distributionDate: Date;
}
export interface FinanceEntryRow {
  type: FinanceEntryKind | string;
  amount: number;
  method?: string | null;
  date: Date;
}

export interface StatementInput {
  period: Period;
  payments: PaymentRow[];
  refunds: RefundRow[];
  expenses: ExpenseRow[];
  sharePayments: SharePaymentRow[];
  holdingRefunds: HoldingRefundRow[];
  distributions: DistributionRow[];
  entries: FinanceEntryRow[];
}

export type ByMethod = Record<MethodGroup, number>;
export type ByLine = Record<LineKey, number>;
export interface CategoryAmount {
  categoryId: string;
  name: string;
  amount: number;
  count: number;
}
export interface RefundItem {
  id: string;
  refundedAt: string;
  amount: number;
  method: string;
  businessLine: string | null;
  referenceType: string | null;
  label: string | null;
  reason: string | null;
}

export interface Statement {
  period: { from: string; to: string; label: string };
  incomeStatement: {
    revenue: { total: number; count: number; byLine: ByLine; byMethod: ByMethod };
    refunds: { total: number; count: number; byLine: ByLine; items: RefundItem[] };
    netRevenue: number;
    purchases: { total: number; byCategory: CategoryAmount[] };
    grossProfit: number;
    expenses: { total: number; byCategory: CategoryAmount[] };
    netProfit: number;
  };
  distribution: {
    netProfit: number;
    incomeTax: { total: number; byCategory: CategoryAmount[] };
    distributable: number;
    distributionsPaid: {
      total: number;
      items: { id: string; periodLabel: string; distributionDate: string; totalDistributed: number }[];
    };
  };
  balanceSheet: {
    asOf: string;
    currentAssets: {
      total: number;
      cash: {
        total: number;
        byMethod: ByMethod;
        rollForward: {
          paymentsReceived: number;
          refunds: number;
          purchasesPaid: number;
          expensesPaid: number;
          incomeTaxPaid: number;
          fixedAssetPurchases: number;
          shareCapitalReceived: number;
          shareCapitalRefunded: number;
          distributionsPaid: number;
          openingCash: number;
          loansReceived: number;
          loansRepaid: number;
          ownerCapitalIn: number;
          ownerCapitalOut: number;
        };
      };
    };
    fixedAssets: { total: number; opening: number; additions: number; additionsByCategory: CategoryAmount[] };
    totalAssets: number;
    liabilities: { total: number; opening: number; loansReceived: number; loansRepaid: number };
    equity: {
      total: number;
      openingCapital: number;
      shareCapital: { received: number; refunded: number; net: number };
      ownerCapital: { in: number; out: number; net: number };
      retainedEarnings: {
        revenue: number;
        refunds: number;
        purchases: number;
        expenses: number;
        incomeTax: number;
        distributions: number;
        total: number;
      };
    };
    totalLiabilitiesEquity: number;
    balanced: boolean;
  };
}

export interface StatementMemo {
  asOf: string;
  guestDues: number;
  restaurantDues: number;
  dayLongDues: number;
  stockValue: number;
  unpaidBills: number;
  unpaidSalaries: number;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const toPaisa = (n: number): number => Math.round((Number(n) || 0) * 100);
const toMoney = (p: number): number => p / 100;

/** Same grouping as METHOD_ACCOUNT in accountLedger.ts (1001 / 1003 / 1002). */
export function methodGroup(method: string | null | undefined): MethodGroup {
  switch (method) {
    case 'BKASH':
    case 'NAGAD':
    case 'MOBILE_BANKING':
      return 'MOBILE';
    case 'CARD':
    case 'BANK_TRANSFER':
    case 'STRIPE':
      return 'BANK';
    default:
      return 'CASH';
  }
}

const REF_LINE: Record<string, LineKey> = {
  BOOKING: 'ROOM',
  RESTAURANT_ORDER: 'RESTAURANT',
  DAY_LONG_BOOKING: 'DAY_LONG',
};

export function lineOf(p: { businessLine?: string | null; referenceType?: string | null; bookingId?: string | null }): LineKey {
  if (p.businessLine === 'ROOM' || p.businessLine === 'RESTAURANT' || p.businessLine === 'DAY_LONG') return p.businessLine;
  if (p.referenceType && REF_LINE[p.referenceType]) return REF_LINE[p.referenceType];
  return 'ROOM';
}

/** Cash basis: the moment the money arrived; legacy rows fall back to createdAt. */
export function effectivePaymentDate(p: { paidAt?: Date | null; createdAt: Date }): Date {
  return p.paidAt ?? p.createdAt;
}

const emptyByMethod = (): Record<MethodGroup, number> => ({ CASH: 0, MOBILE: 0, BANK: 0 });
const emptyByLine = (): Record<LineKey, number> => ({ ROOM: 0, RESTAURANT: 0, DAY_LONG: 0 });

function normaliseKind(kind: string | null | undefined): CategoryKind {
  return kind === 'PURCHASE' || kind === 'FIXED_ASSET' || kind === 'INCOME_TAX' ? kind : 'EXPENSE';
}

class CategoryTally {
  private map = new Map<string, { name: string; paisa: number; count: number }>();
  total = 0;
  add(categoryId: string, name: string, paisa: number) {
    const cur = this.map.get(categoryId) ?? { name, paisa: 0, count: 0 };
    cur.paisa += paisa;
    cur.count += 1;
    this.map.set(categoryId, cur);
    this.total += paisa;
  }
  rows(): CategoryAmount[] {
    return [...this.map.entries()]
      .map(([categoryId, v]) => ({ categoryId, name: v.name, amount: toMoney(v.paisa), count: v.count }))
      .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
  }
}

const moneyByMethod = (m: Record<MethodGroup, number>): ByMethod => ({ CASH: toMoney(m.CASH), MOBILE: toMoney(m.MOBILE), BANK: toMoney(m.BANK) });
const moneyByLine = (m: Record<LineKey, number>): ByLine => ({ ROOM: toMoney(m.ROOM), RESTAURANT: toMoney(m.RESTAURANT), DAY_LONG: toMoney(m.DAY_LONG) });

// ── main ─────────────────────────────────────────────────────────────────────

export function buildStatement(input: StatementInput): Statement {
  const { period } = input;
  const inP = (d: Date) => inPeriod(d, period);

  // Cumulative cash by method group; every flow below feeds it.
  const cash = emptyByMethod();
  const addCash = (method: string | null | undefined, paisa: number) => {
    cash[methodGroup(method)] += paisa;
  };

  // Revenue
  const revByLine = emptyByLine();
  const revByMethod = emptyByMethod();
  let revPeriod = 0;
  let revCount = 0;
  let revCum = 0;
  for (const p of input.payments) {
    const paisa = toPaisa(p.amount);
    revCum += paisa;
    addCash(p.method, paisa);
    if (inP(effectivePaymentDate(p))) {
      revPeriod += paisa;
      revCount += 1;
      revByLine[lineOf(p)] += paisa;
      revByMethod[methodGroup(p.method)] += paisa;
    }
  }

  // Refunds
  const refByLine = emptyByLine();
  const refundItems: RefundItem[] = [];
  let refPeriod = 0;
  let refCum = 0;
  for (const r of input.refunds) {
    const paisa = toPaisa(r.amount);
    refCum += paisa;
    addCash(r.method, -paisa);
    if (inP(r.refundedAt)) {
      refPeriod += paisa;
      refByLine[lineOf(r)] += paisa;
      refundItems.push({
        id: r.id,
        refundedAt: r.refundedAt.toISOString(),
        amount: toMoney(paisa),
        method: r.method,
        businessLine: r.businessLine ?? null,
        referenceType: r.referenceType ?? null,
        label: r.label ?? null,
        reason: r.reason ?? null,
      });
    }
  }
  refundItems.sort((a, b) => a.refundedAt.localeCompare(b.refundedAt));

  // Expenses by kind (period tallies) + cumulative totals
  const purchases = new CategoryTally();
  const expenses = new CategoryTally();
  const incomeTax = new CategoryTally();
  const fixedAdditions = new CategoryTally(); // cumulative — balance sheet
  const cum = { purchases: 0, expenses: 0, incomeTax: 0, fixedAssets: 0 };
  for (const e of input.expenses) {
    const paisa = toPaisa(e.amount);
    const kind = normaliseKind(e.kind);
    addCash(e.paymentMethod ?? 'CASH', -paisa);
    switch (kind) {
      case 'PURCHASE':
        cum.purchases += paisa;
        if (inP(e.date)) purchases.add(e.categoryId, e.categoryName, paisa);
        break;
      case 'INCOME_TAX':
        cum.incomeTax += paisa;
        if (inP(e.date)) incomeTax.add(e.categoryId, e.categoryName, paisa);
        break;
      case 'FIXED_ASSET':
        cum.fixedAssets += paisa;
        fixedAdditions.add(e.categoryId, e.categoryName, paisa);
        break;
      default:
        cum.expenses += paisa;
        if (inP(e.date)) expenses.add(e.categoryId, e.categoryName, paisa);
    }
  }

  // Share capital
  let shareReceived = 0;
  for (const s of input.sharePayments) {
    const paisa = toPaisa(s.amount);
    shareReceived += paisa;
    addCash(s.method, paisa);
  }
  let shareRefunded = 0;
  for (const h of input.holdingRefunds) {
    const paisa = toPaisa(h.amount);
    shareRefunded += paisa;
    addCash('CASH', -paisa); // cancelHolding posts the refund to 1001 Cash in Hand
  }

  // Profit distributions actually paid out
  let distCum = 0;
  let distPeriod = 0;
  const distItems: Statement['distribution']['distributionsPaid']['items'] = [];
  for (const d of input.distributions) {
    const paisa = toPaisa(d.totalDistributed);
    distCum += paisa;
    addCash('CASH', -paisa); // distribute() posts the payout to 1001 Cash in Hand
    if (inP(d.distributionDate)) {
      distPeriod += paisa;
      distItems.push({
        id: d.id,
        periodLabel: d.periodLabel,
        distributionDate: d.distributionDate.toISOString(),
        totalDistributed: toMoney(paisa),
      });
    }
  }

  // Finance entries (cumulative only — none of them is a P&L item)
  const fe: Record<FinanceEntryKind, number> = {
    OPENING_CASH: 0,
    OPENING_FIXED_ASSET: 0,
    OPENING_LIABILITY: 0,
    LOAN_RECEIVED: 0,
    LOAN_REPAID: 0,
    CAPITAL_IN: 0,
    CAPITAL_OUT: 0,
  };
  for (const en of input.entries) {
    const paisa = toPaisa(en.amount);
    switch (en.type) {
      case 'OPENING_CASH':
      case 'LOAN_RECEIVED':
      case 'CAPITAL_IN':
        fe[en.type] += paisa;
        addCash(en.method ?? 'CASH', paisa);
        break;
      case 'LOAN_REPAID':
      case 'CAPITAL_OUT':
        fe[en.type] += paisa;
        addCash(en.method ?? 'CASH', -paisa);
        break;
      case 'OPENING_FIXED_ASSET':
      case 'OPENING_LIABILITY':
        fe[en.type] += paisa;
        break;
      default:
        break; // unknown type: ignored
    }
  }

  // Income statement (period)
  const netRevenue = revPeriod - refPeriod;
  const grossProfit = netRevenue - purchases.total;
  const netProfit = grossProfit - expenses.total;
  const distributable = netProfit - incomeTax.total;

  // Balance sheet (cumulative, as of period.to)
  const cashTotal = cash.CASH + cash.MOBILE + cash.BANK;
  const fixedTotal = fe.OPENING_FIXED_ASSET + cum.fixedAssets;
  const totalAssets = cashTotal + fixedTotal;
  const liabilitiesTotal = fe.OPENING_LIABILITY + fe.LOAN_RECEIVED - fe.LOAN_REPAID;
  const openingCapital = fe.OPENING_CASH + fe.OPENING_FIXED_ASSET - fe.OPENING_LIABILITY;
  const shareNet = shareReceived - shareRefunded;
  const ownerNet = fe.CAPITAL_IN - fe.CAPITAL_OUT;
  const retained = revCum - refCum - cum.purchases - cum.expenses - cum.incomeTax - distCum;
  const equityTotal = openingCapital + shareNet + ownerNet + retained;
  const totalLiabilitiesEquity = liabilitiesTotal + equityTotal;

  return {
    period: { from: period.from, to: period.to, label: periodLabel(period.from, period.to) },
    incomeStatement: {
      revenue: { total: toMoney(revPeriod), count: revCount, byLine: moneyByLine(revByLine), byMethod: moneyByMethod(revByMethod) },
      refunds: { total: toMoney(refPeriod), count: refundItems.length, byLine: moneyByLine(refByLine), items: refundItems },
      netRevenue: toMoney(netRevenue),
      purchases: { total: toMoney(purchases.total), byCategory: purchases.rows() },
      grossProfit: toMoney(grossProfit),
      expenses: { total: toMoney(expenses.total), byCategory: expenses.rows() },
      netProfit: toMoney(netProfit),
    },
    distribution: {
      netProfit: toMoney(netProfit),
      incomeTax: { total: toMoney(incomeTax.total), byCategory: incomeTax.rows() },
      distributable: toMoney(distributable),
      distributionsPaid: { total: toMoney(distPeriod), items: distItems },
    },
    balanceSheet: {
      asOf: period.to,
      currentAssets: {
        total: toMoney(cashTotal),
        cash: {
          total: toMoney(cashTotal),
          byMethod: moneyByMethod(cash),
          rollForward: {
            paymentsReceived: toMoney(revCum),
            refunds: toMoney(refCum),
            purchasesPaid: toMoney(cum.purchases),
            expensesPaid: toMoney(cum.expenses),
            incomeTaxPaid: toMoney(cum.incomeTax),
            fixedAssetPurchases: toMoney(cum.fixedAssets),
            shareCapitalReceived: toMoney(shareReceived),
            shareCapitalRefunded: toMoney(shareRefunded),
            distributionsPaid: toMoney(distCum),
            openingCash: toMoney(fe.OPENING_CASH),
            loansReceived: toMoney(fe.LOAN_RECEIVED),
            loansRepaid: toMoney(fe.LOAN_REPAID),
            ownerCapitalIn: toMoney(fe.CAPITAL_IN),
            ownerCapitalOut: toMoney(fe.CAPITAL_OUT),
          },
        },
      },
      fixedAssets: {
        total: toMoney(fixedTotal),
        opening: toMoney(fe.OPENING_FIXED_ASSET),
        additions: toMoney(cum.fixedAssets),
        additionsByCategory: fixedAdditions.rows(),
      },
      totalAssets: toMoney(totalAssets),
      liabilities: {
        total: toMoney(liabilitiesTotal),
        opening: toMoney(fe.OPENING_LIABILITY),
        loansReceived: toMoney(fe.LOAN_RECEIVED),
        loansRepaid: toMoney(fe.LOAN_REPAID),
      },
      equity: {
        total: toMoney(equityTotal),
        openingCapital: toMoney(openingCapital),
        shareCapital: { received: toMoney(shareReceived), refunded: toMoney(shareRefunded), net: toMoney(shareNet) },
        ownerCapital: { in: toMoney(fe.CAPITAL_IN), out: toMoney(fe.CAPITAL_OUT), net: toMoney(ownerNet) },
        retainedEarnings: {
          revenue: toMoney(revCum),
          refunds: toMoney(refCum),
          purchases: toMoney(cum.purchases),
          expenses: toMoney(cum.expenses),
          incomeTax: toMoney(cum.incomeTax),
          distributions: toMoney(distCum),
          total: toMoney(retained),
        },
      },
      totalLiabilitiesEquity: toMoney(totalLiabilitiesEquity),
      balanced: totalAssets === totalLiabilitiesEquity,
    },
  };
}
