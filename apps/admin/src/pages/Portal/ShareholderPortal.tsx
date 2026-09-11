import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/AuthContext';
import MyVouchersPanel, { type MineVoucher } from '@/components/MyVouchersPanel';

type Summary = {
  name: string; isActive: boolean; units: Record<string, number>; totalUnits: number;
  activeCapital: number; committedCapital: number; paidTotal: number; dueTotal: number; pendingHoldings: number;
  totalCapital: number; ownershipPercent: number; totalReceived: number; pending: number; distributionsCount: number;
};
type Holding = {
  id: string; quantity: number; unitPrice: number; totalPrice: number; paidAmount: number;
  status: 'PENDING_PAYMENT' | 'ACTIVE' | 'CANCELLED'; purchaseDate: string;
  tier: { code: string; name: string };
};
type Share = {
  id: string; amount: number; sharePercent?: number; status: string; paidDate?: string | null;
  distribution: { periodLabel: string; status: string; totalProfit?: number };
};
const HOLDING_STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Active', cls: 'bg-green-100 text-green-800' },
  PENDING_PAYMENT: { label: 'Instalments due', cls: 'bg-amber-100 text-amber-800' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-700' },
};

const fmt = (n: number) => `৳${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const STATUS_COLOR: Record<string, string> = {
  PAID: 'bg-green-100 text-green-800',
  PENDING: 'bg-amber-100 text-amber-800',
  CANCELLED: 'bg-red-100 text-red-700',
};

const ShareholderPortal: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [vouchers, setVouchers] = useState<MineVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [s, sh, v] = await Promise.all([
          api.get('/shareholder/summary'),
          api.get('/shareholder/profit-shares'),
          api.get('/shareholder/vouchers').catch(() => ({ data: { vouchers: [] } })),
        ]);
        setSummary(s.data?.summary ?? null);
        setHoldings(unwrapList<Holding>(s, ['holdings']));
        setShares(unwrapList<Share>(sh, ['shares']));
        setVouchers(unwrapList<MineVoucher>(v, ['vouchers']));
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Could not load your portal data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <p className="font-semibold text-amber-900">{error}</p>
        <p className="mt-1 text-sm text-amber-700">If this persists, contact the resort administrator.</p>
      </div>
    );
  }

  const unitsLabel = summary && Object.keys(summary.units).length
    ? Object.entries(summary.units).map(([code, qty]) => `${qty} ${holdings.find((h) => h.tier.code === code)?.tier.name ?? code}`).join(' · ')
    : 'No shares yet';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Shareholder portal"
        title={`Welcome, ${summary?.name ?? user?.name ?? 'Shareholder'}`}
        description="Investment overview, profit distributions, and personal resort vouchers"
      />

      <section className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Your position
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Your shares" value={unitsLabel} />
          <Stat label="Paid-up capital" value={fmt(summary?.activeCapital ?? 0)} />
          <Stat label="Ownership" value={`${(summary?.ownershipPercent ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`} accent="text-primary" />
          <Stat label="Received so far" value={fmt(summary?.totalReceived ?? 0)} accent="text-green-700" />
        </div>
        {(summary?.dueTotal ?? 0) > 0 && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {fmt(summary!.dueTotal)} of instalments still due. Shares start earning profit once fully paid.
          </p>
        )}
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 font-semibold">Your share units</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bought</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((h) => (
                  <TableRow key={h.id} className={h.status === 'CANCELLED' ? 'opacity-60' : ''}>
                    <TableCell className="font-medium">{h.tier.name} <span className="text-xs text-muted-foreground">@ {fmt(h.unitPrice)}</span></TableCell>
                    <TableCell className="text-right tabular-nums">{h.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(h.totalPrice)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(h.paidAmount)}</TableCell>
                    <TableCell><Badge className={HOLDING_STATUS[h.status]?.cls}>{HOLDING_STATUS[h.status]?.label ?? h.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(h.purchaseDate).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {holdings.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No share units on record yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Benefits
        </p>
        <MyVouchersPanel
          vouchers={vouchers}
          title="My vouchers"
          emptyHint="No personal vouchers yet. The resort may issue discounts to shareholders from time to time."
          showWhenEmpty
        />
      </section>

      <section className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Distributions
        </p>
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 font-semibold">Distribution history</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Your share</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shares.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.distribution.periodLabel}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{s.sharePercent != null ? `${s.sharePercent.toLocaleString(undefined, { maximumFractionDigits: 2 })}%` : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(s.amount)}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLOR[s.status] ?? 'bg-gray-100 text-gray-700'}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.paidDate ? new Date(s.paidDate).toLocaleDateString() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {shares.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No distributions yet. When profit is shared, it will appear here.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-bold ${accent ?? 'text-foreground'}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

export default ShareholderPortal;
