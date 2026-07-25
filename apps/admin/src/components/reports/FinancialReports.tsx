import React, { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

type PL = {
  income: { total: number; byLine: Record<string, number>; byAccount: { accountName: string; amount: number }[] };
  expenses: { total: number; byAccount: { accountName: string; amount: number }[] };
  netProfit: number;
  profitMargin: number;
};
type BS = {
  assets: { total: number; currentAssets: { total: number; accounts: any[] }; fixedAssets: { total: number; accounts: any[] } };
  liabilities: { total: number; accounts: any[] };
  equity: { total: number; accounts: any[]; retainedEarnings: number };
  liabilitiesEquityTotal: number;
  unreconciled: number;
};

const fmt = (n: number) => `৳${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const LINE_LABEL: Record<string, string> = { ROOM: 'Room / Cottage', RESTAURANT: 'Restaurant', DAY_LONG: 'Day Long' };
const LINE_COLOR: Record<string, string> = { ROOM: 'bg-blue-500', RESTAURANT: 'bg-emerald-500', DAY_LONG: 'bg-amber-500' };

const FinancialReports: React.FC<{ startDate: string; endDate: string }> = ({ startDate, endDate }) => {
  const [pl, setPl] = useState<PL | null>(null);
  const [bs, setBs] = useState<BS | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = `?startDate=${startDate}&endDate=${endDate}`;
      const [plRes, bsRes] = await Promise.all([
        api.get(`/reports/profit-loss${params}`),
        api.get(`/reports/balance-sheet`),
      ]);
      setPl(plRes.data);
      setBs(bsRes.data);
    } finally { setLoading(false); }
  }, [startDate, endDate]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const lineTotal = pl ? Object.values(pl.income.byLine).reduce((s, v) => s + v, 0) : 0;

  return (
    <div className="space-y-6">
      {/* Headline */}
      {pl && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Total Income</div><div className="text-2xl font-bold text-emerald-700">{fmt(pl.income.total)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Total Expenses</div><div className="text-2xl font-bold text-red-700">{fmt(pl.expenses.total)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Net Profit</div><div className={`text-2xl font-bold ${pl.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(pl.netProfit)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Profit Margin</div><div className="text-2xl font-bold">{pl.profitMargin}%</div></CardContent></Card>
        </div>
      )}

      {/* Revenue by business line */}
      {pl && (
        <Card><CardContent className="p-4">
          <h3 className="mb-3 font-semibold">Revenue by Business Line</h3>
          <div className="space-y-2">
            {Object.entries(pl.income.byLine).map(([line, amount]) => {
              const pct = lineTotal > 0 ? (amount / lineTotal) * 100 : 0;
              return (
                <div key={line}>
                  <div className="flex justify-between text-sm"><span>{LINE_LABEL[line] ?? line}</span><span className="font-medium">{fmt(amount)} ({pct.toFixed(1)}%)</span></div>
                  <div className="mt-1 h-2 w-full rounded bg-muted"><div className={`h-2 rounded ${LINE_COLOR[line] ?? 'bg-gray-400'}`} style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
            {lineTotal === 0 && <p className="text-sm text-muted-foreground">No revenue in this period.</p>}
          </div>
        </CardContent></Card>
      )}

      {/* P&L statement */}
      {pl && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><CardContent className="p-4">
            <h3 className="mb-3 font-semibold">Income</h3>
            <Table><TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {pl.income.byAccount.map((a) => <TableRow key={a.accountName}><TableCell>{a.accountName}</TableCell><TableCell className="text-right tabular-nums">{fmt(a.amount)}</TableCell></TableRow>)}
                {pl.income.byAccount.length === 0 && <TableRow><TableCell colSpan={2} className="text-center py-4 text-muted-foreground">No income</TableCell></TableRow>}
                <TableRow className="font-semibold"><TableCell>Total</TableCell><TableCell className="text-right">{fmt(pl.income.total)}</TableCell></TableRow>
              </TableBody></Table>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <h3 className="mb-3 font-semibold">Expenses</h3>
            <Table><TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {pl.expenses.byAccount.map((a) => <TableRow key={a.accountName}><TableCell>{a.accountName}</TableCell><TableCell className="text-right tabular-nums">{fmt(a.amount)}</TableCell></TableRow>)}
                {pl.expenses.byAccount.length === 0 && <TableRow><TableCell colSpan={2} className="text-center py-4 text-muted-foreground">No expenses</TableCell></TableRow>}
                <TableRow className="font-semibold"><TableCell>Total</TableCell><TableCell className="text-right">{fmt(pl.expenses.total)}</TableCell></TableRow>
              </TableBody></Table>
          </CardContent></Card>
        </div>
      )}

      {/* Balance sheet */}
      {bs && (
        <Card><CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Balance Sheet (estimate)</h3>
            {bs.unreconciled !== 0 && <span className="text-xs text-amber-700">Unreconciled: {fmt(bs.unreconciled)}</span>}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Assets — {fmt(bs.assets.total)}</h4>
              <Table><TableBody>
                {[...bs.assets.currentAssets.accounts, ...bs.assets.fixedAssets.accounts].map((a: any) => (
                  <TableRow key={a.code}><TableCell>{a.name}</TableCell><TableCell className="text-right tabular-nums">{fmt(a.balance)}</TableCell></TableRow>
                ))}
              </TableBody></Table>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Liabilities + Equity — {fmt(bs.liabilitiesEquityTotal)}</h4>
              <Table><TableBody>
                {bs.liabilities.accounts.map((a: any) => <TableRow key={a.code}><TableCell>{a.name}</TableCell><TableCell className="text-right tabular-nums">{fmt(a.balance)}</TableCell></TableRow>)}
                {bs.equity.accounts.map((a: any) => <TableRow key={a.code}><TableCell>{a.name}</TableCell><TableCell className="text-right tabular-nums">{fmt(a.balance)}</TableCell></TableRow>)}
                <TableRow><TableCell>Retained Earnings (period)</TableCell><TableCell className="text-right tabular-nums">{fmt(bs.equity.retainedEarnings)}</TableCell></TableRow>
              </TableBody></Table>
            </div>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
};

export default FinancialReports;
