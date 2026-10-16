import { METHOD_LABEL, fmt, fmtDate } from '@/pages/Bookings/shared';
import type { CashRollForward, CategoryAmount, LineKey, MethodGroup, Statement, StatementMemo } from './types';
import { fmtYmd } from './period';

/**
 * Row model for the Financial Report sheet. StatementSheet renders it; the CSV export walks it.
 * Labels here are the client's exact wording — keep them in sync with the PDF the accountant signs.
 */

export type SheetItem = {
  label: string;
  amount: number;
  /** Shown before the amount in muted sub-lists (cash roll-forward, retained earnings). */
  sign?: '+' | '−';
  /** Small muted text under the label (refund reason). */
  note?: string;
  /** Small muted text inline after the label ("৳x received − ৳y refunded"). */
  hint?: string;
  muted?: boolean;
  strong?: boolean;
};
export type SheetGroup = { title?: string; items: SheetItem[]; empty?: string };
export type SheetRow = {
  key: string;
  label: string;
  /** Small muted text under the label ("Liabilities + Owner's Equity", "12 payments"). */
  hint?: string;
  amount: number;
  /** line = plain; total = bold + top border; grand = bold + heavy top border; info = italic, outside the arithmetic. */
  variant: 'line' | 'total' | 'grand' | 'info';
  /** Breakdown shown when the row is expanded; absent → no chevron. */
  groups?: SheetGroup[];
  roseWhenNegative?: boolean;
};
export type SheetSection = { no: number; title: string; caption?: string; note?: string; rows: SheetRow[] };

/** ৳ formatter that renders negatives as "−৳500" instead of "৳-500". */
export const money = (n: number): string => {
  const v = Math.abs(n) < 0.005 ? 0 : n;
  return v < 0 ? `−${fmt(-v)}` : fmt(v);
};

/** Amount with its sign applied, for CSV cells. */
export const signedAmount = (item: SheetItem): number => (item.sign === '−' ? -item.amount : item.amount);

const LINES: LineKey[] = ['ROOM', 'RESTAURANT', 'DAY_LONG'];
const LINE_LABEL: Record<LineKey, string> = { ROOM: 'Room', RESTAURANT: 'Restaurant', DAY_LONG: 'Day long' };
const METHODS: MethodGroup[] = ['CASH', 'MOBILE', 'BANK'];
const METHOD_GROUP_LABEL: Record<MethodGroup, string> = { CASH: 'Cash', MOBILE: 'Mobile banking (bKash, Nagad)', BANK: 'Bank & card' };

const ROLL_FORWARD: { key: keyof CashRollForward; label: string; sign: '+' | '−' }[] = [
  { key: 'openingCash', label: 'Opening cash', sign: '+' },
  { key: 'paymentsReceived', label: 'Payments received', sign: '+' },
  { key: 'refunds', label: 'Refunds', sign: '−' },
  { key: 'purchasesPaid', label: 'Purchases paid', sign: '−' },
  { key: 'expensesPaid', label: 'Expenses paid', sign: '−' },
  { key: 'incomeTaxPaid', label: 'Income tax paid', sign: '−' },
  { key: 'fixedAssetPurchases', label: 'Fixed-asset purchases', sign: '−' },
  { key: 'shareCapitalReceived', label: 'Share capital received', sign: '+' },
  { key: 'shareCapitalRefunded', label: 'Share capital refunded', sign: '−' },
  { key: 'distributionsPaid', label: 'Profit distributions paid', sign: '−' },
  { key: 'loansReceived', label: 'Loans received', sign: '+' },
  { key: 'loansRepaid', label: 'Loans repaid', sign: '−' },
  { key: 'ownerCapitalIn', label: 'Owner capital in', sign: '+' },
  { key: 'ownerCapitalOut', label: 'Owner capital out', sign: '−' },
];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const categoryGroup = (rows: CategoryAmount[], empty: string, title?: string): SheetGroup => ({
  title,
  items: rows.map((c) => ({ label: c.name, amount: c.amount, hint: plural(c.count, 'entry').replace('entrys', 'entries') })),
  empty,
});

export function buildSections(s: Statement): SheetSection[] {
  const is = s.incomeStatement;
  const d = s.distribution;
  const bs = s.balanceSheet;
  const cash = bs.currentAssets.cash;
  const eq = bs.equity;
  const re = eq.retainedEarnings;

  const rollForward = ROLL_FORWARD.filter((r) => cash.rollForward[r.key] !== 0).map((r) => ({
    label: r.label,
    amount: cash.rollForward[r.key],
    sign: r.sign,
    muted: true,
  }));

  return [
    {
      no: 1,
      title: 'Income Statement',
      rows: [
        {
          key: 'revenue',
          label: 'Revenue/ Sales (All part included)',
          hint: plural(is.revenue.count, 'payment'),
          amount: is.revenue.total,
          variant: 'line',
          groups: [
            { title: 'By business line', items: LINES.map((k) => ({ label: LINE_LABEL[k], amount: is.revenue.byLine[k] })) },
            { title: 'By payment method', items: METHODS.map((k) => ({ label: METHOD_GROUP_LABEL[k], amount: is.revenue.byMethod[k] })) },
          ],
        },
        {
          key: 'refunds',
          label: '(-) Refund/ Sales Return',
          amount: is.refunds.total,
          variant: 'line',
          groups: [
            {
              items: is.refunds.items.map((r) => ({
                label: [fmtDate(r.refundedAt), r.label ?? 'Refund', METHOD_LABEL[r.method] ?? r.method].join(' · '),
                amount: r.amount,
                note: r.reason ?? undefined,
              })),
              empty: 'No refunds in this period',
            },
          ],
        },
        { key: 'netRevenue', label: 'Net Revenue', amount: is.netRevenue, variant: 'total' },
        {
          key: 'purchases',
          label: '(-) Purchase (All kind of Purchase included)',
          amount: is.purchases.total,
          variant: 'line',
          groups: [categoryGroup(is.purchases.byCategory, 'No purchases in this period')],
        },
        { key: 'grossProfit', label: 'Gross Profit', amount: is.grossProfit, variant: 'total' },
        {
          key: 'expenses',
          label: '(-) Expenses (All kind of exp. included)',
          amount: is.expenses.total,
          variant: 'line',
          groups: [categoryGroup(is.expenses.byCategory, 'No expenses in this period')],
        },
        { key: 'netProfit', label: 'Net Profit', amount: is.netProfit, variant: 'grand', roseWhenNegative: true },
      ],
    },
    {
      no: 2,
      title: 'Profit & Loss Distribution',
      note: 'The "Paid to shareholders" line is informational only — it is not part of the arithmetic above.',
      rows: [
        { key: 'd-netProfit', label: 'Net Profit', amount: d.netProfit, variant: 'line', roseWhenNegative: true },
        {
          key: 'incomeTax',
          label: '(-) Income Tax',
          amount: d.incomeTax.total,
          variant: 'line',
          groups: [categoryGroup(d.incomeTax.byCategory, 'No income tax paid in this period')],
        },
        { key: 'distributable', label: 'Distributed Profit & Loss', amount: d.distributable, variant: 'grand', roseWhenNegative: true },
        {
          key: 'distributionsPaid',
          label: 'Paid to shareholders in this period',
          amount: d.distributionsPaid.total,
          variant: 'info',
          groups: [
            {
              items: d.distributionsPaid.items.map((x) => ({ label: `${x.periodLabel} · ${fmtDate(x.distributionDate)}`, amount: x.totalDistributed })),
              empty: 'No distributions paid in this period',
            },
          ],
        },
      ],
    },
    {
      no: 3,
      title: 'Balance Sheet',
      caption: `as of ${fmtYmd(bs.asOf)}`,
      rows: [
        {
          key: 'currentAssets',
          label: 'Current Asset',
          amount: bs.currentAssets.total,
          variant: 'line',
          groups: [
            {
              items: [
                { label: 'Cash in hand', amount: cash.byMethod.CASH },
                { label: 'Mobile banking', amount: cash.byMethod.MOBILE },
                { label: 'Bank & card', amount: cash.byMethod.BANK },
              ],
            },
            { title: 'Cash roll-forward (cumulative)', items: rollForward, empty: 'Nothing recorded yet' },
          ],
        },
        {
          key: 'fixedAssets',
          label: 'Fixed Asset',
          amount: bs.fixedAssets.total,
          variant: 'line',
          groups: [
            { items: [{ label: 'Opening balance', amount: bs.fixedAssets.opening }] },
            categoryGroup(bs.fixedAssets.additionsByCategory, 'No fixed-asset purchases recorded', 'Additions'),
          ],
        },
        { key: 'totalAssets', label: 'Total Asset', amount: bs.totalAssets, variant: 'total' },
        {
          key: 'liabilities',
          label: 'Current Liability',
          amount: bs.liabilities.total,
          variant: 'line',
          groups: [
            {
              items: [
                { label: 'Opening balance', amount: bs.liabilities.opening, sign: '+' },
                { label: 'Loans received', amount: bs.liabilities.loansReceived, sign: '+' },
                { label: 'Loans repaid', amount: bs.liabilities.loansRepaid, sign: '−' },
              ],
            },
          ],
        },
        {
          key: 'equity',
          label: "Owner's Equity",
          amount: eq.total,
          variant: 'line',
          groups: [
            {
              items: [
                { label: 'Opening capital', amount: eq.openingCapital, hint: 'opening cash + fixed assets − liabilities' },
                { label: 'Share capital', amount: eq.shareCapital.net, hint: `${money(eq.shareCapital.received)} received − ${money(eq.shareCapital.refunded)} refunded` },
                { label: 'Owner capital', amount: eq.ownerCapital.net, hint: `${money(eq.ownerCapital.in)} in − ${money(eq.ownerCapital.out)} out` },
              ],
            },
            {
              title: 'Retained earnings (cumulative)',
              items: [
                { label: 'Revenue', amount: re.revenue, sign: '+', muted: true },
                { label: 'Refunds', amount: re.refunds, sign: '−', muted: true },
                { label: 'Purchases', amount: re.purchases, sign: '−', muted: true },
                { label: 'Expenses', amount: re.expenses, sign: '−', muted: true },
                { label: 'Income tax', amount: re.incomeTax, sign: '−', muted: true },
                { label: 'Profit distributions', amount: re.distributions, sign: '−', muted: true },
                { label: 'Retained earnings', amount: re.total, strong: true },
              ],
            },
          ],
        },
        { key: 'totalLiabilitiesEquity', label: 'Total Liability', hint: "Liabilities + Owner's Equity", amount: bs.totalLiabilitiesEquity, variant: 'grand' },
      ],
    },
  ];
}

export const memoItems = (m: StatementMemo): { label: string; amount: number }[] => [
  { label: 'Guest dues outstanding', amount: m.guestDues },
  { label: 'Restaurant dues', amount: m.restaurantDues },
  { label: 'Day Long dues', amount: m.dayLongDues },
  { label: 'Stock on hand (cost)', amount: m.stockValue },
  { label: 'Unpaid bills', amount: m.unpaidBills },
  { label: 'Unpaid salaries', amount: m.unpaidSalaries },
];

/** Section / Line / Amount rows for downloadCsv. Breakdown rows (detailed only) are indented with two spaces. */
export function csvRows(s: Statement, detailed: boolean): (string | number)[][] {
  const out: (string | number)[][] = [['Section', 'Line', 'Amount']];
  for (const sec of buildSections(s)) {
    const name = `${sec.no} ${sec.title}${sec.caption ? ` (${sec.caption})` : ''}`;
    for (const row of sec.rows) {
      out.push([name, row.label, row.amount]);
      if (!detailed) continue;
      for (const g of row.groups ?? []) {
        for (const it of g.items) out.push([name, `  ${g.title ? `${g.title}: ` : ''}${it.label}`, signedAmount(it)]);
      }
    }
  }
  for (const m of memoItems(s.memo)) out.push(['Memo (not included above)', m.label, m.amount]);
  return out;
}
