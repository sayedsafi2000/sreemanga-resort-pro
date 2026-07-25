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
  name: string; shareType: string; shareValue: number; investmentAmount: number;
  totalReceived: number; pending: number; distributionsCount: number;
};
type Share = {
  id: string; amount: number; status: string; paidDate?: string | null;
  distribution: { periodLabel: string; status: string };
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

  const shareLabel = summary
    ? summary.shareType === 'PERCENTAGE'
      ? `${summary.shareValue}%`
      : summary.shareType === 'FIXED'
        ? `${fmt(summary.shareValue)} fixed`
        : 'Custom'
    : '—';

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
          <Stat label="Total Investment" value={fmt(summary?.investmentAmount ?? 0)} />
          <Stat label="Total Received" value={fmt(summary?.totalReceived ?? 0)} accent="text-green-700" />
          <Stat label="Pending" value={fmt(summary?.pending ?? 0)} accent="text-amber-700" />
          <Stat label="Your Share" value={shareLabel} />
        </div>
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
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shares.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.distribution.periodLabel}</TableCell>
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
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
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
