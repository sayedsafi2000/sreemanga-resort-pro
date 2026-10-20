/**
 * TS mirrors of the Financial Report API (apps/server/src/utils/financialStatement.ts +
 * controllers/financeController.ts). All amounts are 2-dp numbers in BDT.
 */

export type MethodGroup = 'CASH' | 'MOBILE' | 'BANK';
export type LineKey = 'ROOM' | 'RESTAURANT' | 'DAY_LONG';
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
  /** e.g. "INV-00042 · Guest name" — resolved server-side. */
  label: string | null;
  reason: string | null;
}

export interface DistributionItem {
  id: string;
  periodLabel: string;
  distributionDate: string;
  totalDistributed: number;
}

export interface CashRollForward {
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
}

export interface IncomeStatement {
  revenue: { total: number; count: number; byLine: ByLine; byMethod: ByMethod };
  refunds: { total: number; count: number; byLine: ByLine; items: RefundItem[] };
  netRevenue: number;
  purchases: { total: number; byCategory: CategoryAmount[] };
  grossProfit: number;
  expenses: { total: number; byCategory: CategoryAmount[] };
  netProfit: number;
}

/** A DRAFT / APPROVED distribution whose period overlaps the statement period — not yet paid out. */
export interface PlannedDistribution {
  id: string;
  periodLabel: string;
  status: 'DRAFT' | 'APPROVED';
  totalProfit: number;
  totalDistributed: number;
  periodStart: string;
  periodEnd: string;
}

export interface ProfitDistribution {
  netProfit: number;
  incomeTax: { total: number; byCategory: CategoryAmount[] };
  distributable: number;
  /** Informational — what was actually paid out in the period, not part of the arithmetic. */
  distributionsPaid: { total: number; items: DistributionItem[] };
  /** Informational — draft / approved distributions planned for this period (edit them on the Shareholders page). */
  planned: PlannedDistribution[];
}

export interface BalanceSheet {
  asOf: string;
  currentAssets: {
    total: number;
    cash: { total: number; byMethod: ByMethod; rollForward: CashRollForward };
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
}

/** Things the sheet deliberately leaves out, measured now rather than as-of. */
export interface StatementMemo {
  asOf: string;
  guestDues: number;
  restaurantDues: number;
  dayLongDues: number;
  stockValue: number;
  unpaidBills: number;
  unpaidSalaries: number;
}

/** Response of GET /finance/statement?from&to. */
export interface Statement {
  success?: boolean;
  generatedAt: string;
  period: { from: string; to: string; label: string };
  incomeStatement: IncomeStatement;
  distribution: ProfitDistribution;
  balanceSheet: BalanceSheet;
  memo: StatementMemo;
  /** The system "Income Tax" ExpenseCategory, or null if it has been removed. */
  incomeTaxCategoryId: string | null;
}

// ── Other entries (GET/POST /finance/entries) ────────────────────────────────

export const FINANCE_ENTRY_TYPES = [
  'OPENING_CASH',
  'OPENING_FIXED_ASSET',
  'OPENING_LIABILITY',
  'LOAN_RECEIVED',
  'LOAN_REPAID',
  'CAPITAL_IN',
  'CAPITAL_OUT',
] as const;
export type FinanceEntryType = (typeof FINANCE_ENTRY_TYPES)[number];

/** Types that move money through a cash / mobile / bank account — `method` is required. */
export const CASH_MOVING_TYPES: readonly FinanceEntryType[] = [
  'OPENING_CASH',
  'LOAN_RECEIVED',
  'LOAN_REPAID',
  'CAPITAL_IN',
  'CAPITAL_OUT',
];
export const isCashMovingType = (type: string): boolean => (CASH_MOVING_TYPES as readonly string[]).includes(type);

export interface FinanceEntry {
  id: string;
  type: FinanceEntryType | string;
  amount: number;
  method: string | null;
  /** ISO timestamp (local midnight of the entry day). */
  date: string;
  description: string | null;
  createdAt: string;
}
