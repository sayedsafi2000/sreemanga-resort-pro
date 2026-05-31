import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, RefreshCw, DollarSign, Wallet, TrendingUp, TrendingDown, BedDouble, CalendarCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

type RevenueResp = {
  totalRevenue?: number;
  totalBookings?: number;
  revenueByDate?: Record<string, number>;
  revenueByRoomType?: Record<string, number>;
};

type OccupancyResp = {
  totalRooms?: number;
  occupiedRoomNights?: number;
  totalRoomNights?: number;
  occupancyRate?: number;
};

type BookingStatsResp = {
  totalBookings?: number;
  confirmedBookings?: number;
  checkedInBookings?: number;
  checkedOutBookings?: number;
  cancelledBookings?: number;
};

type ExpenseReportResp = {
  totalExpenses?: number;
  totalCount?: number;
  expensesByDate?: Record<string, number>;
  expensesByCategory?: Record<string, number>;
};

function firstOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtCurrency(n: number): string {
  return `৳${n.toLocaleString()}`;
}

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c ?? '');
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(',')
    )
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const Reports: React.FC = () => {
  const [startDate, setStartDate] = useState<string>(firstOfMonth());
  const [endDate, setEndDate] = useState<string>(todayIso());
  const [rev, setRev] = useState<RevenueResp | null>(null);
  const [occ, setOcc] = useState<OccupancyResp | null>(null);
  const [bookings, setBookings] = useState<BookingStatsResp | null>(null);
  const [expenses, setExpenses] = useState<ExpenseReportResp | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = `?startDate=${startDate}&endDate=${endDate}`;
      const [r, o, b, e] = await Promise.all([
        api.get(`/reports/revenue${params}`),
        api.get(`/reports/occupancy${params}`),
        api.get(`/reports/bookings${params}`),
        api.get(`/reports/expenses${params}`),
      ]);
      setRev(r.data || null);
      setOcc(o.data || null);
      setBookings(b.data || null);
      setExpenses(e.data || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const revenueChartData = useMemo(() => {
    const revMap = rev?.revenueByDate || {};
    const expMap = expenses?.expensesByDate || {};
    const allDates = new Set<string>([...Object.keys(revMap), ...Object.keys(expMap)]);
    return Array.from(allDates)
      .map((date) => ({
        date,
        revenue: Number(revMap[date] ?? 0),
        expenses: Number(expMap[date] ?? 0),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [rev, expenses]);

  const expenseCategoryRows = useMemo(() => {
    const map = expenses?.expensesByCategory || {};
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount: Number(amount) || 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const totalRevenueValue = rev?.totalRevenue ?? 0;
  const totalExpenseValue = expenses?.totalExpenses ?? 0;
  const netProfit = totalRevenueValue - totalExpenseValue;

  const roomTypeRows = useMemo(() => {
    const map = rev?.revenueByRoomType || {};
    return Object.entries(map)
      .map(([type, amount]) => ({ type, amount: Number(amount) || 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [rev]);

  const handleExportRevenue = () => {
    const rows: string[][] = [['Date', 'Revenue (BDT)']];
    revenueChartData.forEach((r) => rows.push([r.date, String(r.revenue)]));
    rows.push([]);
    rows.push(['Room Type', 'Revenue (BDT)']);
    roomTypeRows.forEach((r) => rows.push([r.type, String(r.amount)]));
    downloadCsv(`revenue-${startDate}_to_${endDate}.csv`, rows);
  };

  const handleExportBookings = () => {
    if (!bookings) return;
    const rows: string[][] = [
      ['Status', 'Count'],
      ['Total', String(bookings.totalBookings ?? 0)],
      ['Confirmed', String(bookings.confirmedBookings ?? 0)],
      ['Checked-in', String(bookings.checkedInBookings ?? 0)],
      ['Checked-out', String(bookings.checkedOutBookings ?? 0)],
      ['Cancelled', String(bookings.cancelledBookings ?? 0)],
    ];
    downloadCsv(`bookings-${startDate}_to_${endDate}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="Reports"
        description="Revenue, occupancy, and booking stats over the selected date range."
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button variant="outline" onClick={fetchAll} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Headline cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="card-base card-lift p-5 fade-up fade-up-1">
          <div className="flex items-start justify-between">
            <p className="eyebrow">Total revenue</p>
            <span className="stat-green stat-icon-bg flex h-9 w-9 items-center justify-center rounded-lg"><DollarSign className="h-[18px] w-[18px]" /></span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight value-pop">{fmtCurrency(totalRevenueValue)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{rev?.totalBookings ?? 0} paying bookings</p>
        </div>
        <div className="card-base card-lift p-5 fade-up fade-up-2">
          <div className="flex items-start justify-between">
            <p className="eyebrow">Total expenses</p>
            <span className="stat-rose stat-icon-bg flex h-9 w-9 items-center justify-center rounded-lg"><Wallet className="h-[18px] w-[18px]" /></span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight value-pop">{fmtCurrency(totalExpenseValue)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{expenses?.totalCount ?? 0} expense rows (PAID)</p>
        </div>
        <div className="card-base card-lift p-5 fade-up fade-up-3">
          <div className="flex items-start justify-between">
            <p className="eyebrow">Net profit</p>
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${netProfit < 0 ? 'stat-rose' : 'stat-green'} stat-icon-bg`}>
              {netProfit < 0 ? <TrendingDown className="h-[18px] w-[18px]" /> : <TrendingUp className="h-[18px] w-[18px]" />}
            </span>
          </div>
          <p className={`mt-3 text-2xl font-bold tracking-tight value-pop ${netProfit < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {fmtCurrency(netProfit)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Revenue − expenses</p>
        </div>
        <div className="card-base card-lift p-5 fade-up fade-up-4">
          <div className="flex items-start justify-between">
            <p className="eyebrow">Occupancy</p>
            <span className="stat-blue stat-icon-bg flex h-9 w-9 items-center justify-center rounded-lg"><BedDouble className="h-[18px] w-[18px]" /></span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight value-pop">{(occ?.occupancyRate ?? 0).toFixed(1)}%</p>
          <p className="mt-1 text-xs text-muted-foreground">{occ?.occupiedRoomNights ?? 0} of {occ?.totalRoomNights ?? 0} room-nights</p>
        </div>
        <div className="card-base card-lift p-5 fade-up fade-up-5">
          <div className="flex items-start justify-between">
            <p className="eyebrow">Total bookings</p>
            <span className="stat-purple stat-icon-bg flex h-9 w-9 items-center justify-center rounded-lg"><CalendarCheck className="h-[18px] w-[18px]" /></span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight value-pop">{bookings?.totalBookings ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">{bookings?.cancelledBookings ?? 0} cancelled</p>
        </div>
      </div>

      {/* Booking stats breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Bookings by status</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportBookings} disabled={!bookings}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Stat label="Confirmed" value={bookings?.confirmedBookings ?? 0} />
            <Stat label="Checked-in" value={bookings?.checkedInBookings ?? 0} />
            <Stat label="Checked-out" value={bookings?.checkedOutBookings ?? 0} />
            <Stat label="Cancelled" value={bookings?.cancelledBookings ?? 0} />
            <Stat label="Total" value={bookings?.totalBookings ?? 0} />
          </div>
        </CardContent>
      </Card>

      {/* Revenue + expenses chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Revenue vs expenses over time</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportRevenue} disabled={!rev}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </CardHeader>
        <CardContent>
          {revenueChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">
              No revenue or expenses in selected range.
            </p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(v: number) => fmtCurrency(v)}
                    labelStyle={{ color: '#111' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#dc2626"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenses by category */}
      <Card>
        <CardHeader>
          <CardTitle>Expenses by category</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenseCategoryRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    No expenses in selected range.
                  </TableCell>
                </TableRow>
              ) : (
                expenseCategoryRows.map((r) => {
                  const share = totalExpenseValue > 0 ? (r.amount / totalExpenseValue) * 100 : 0;
                  return (
                    <TableRow key={r.category}>
                      <TableCell className="font-medium">{r.category}</TableCell>
                      <TableCell className="text-right">{fmtCurrency(r.amount)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {share.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Revenue by room type */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by room type</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room Type</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roomTypeRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    No data in selected range.
                  </TableCell>
                </TableRow>
              ) : (
                roomTypeRows.map((r) => {
                  const total = rev?.totalRevenue || 0;
                  const share = total > 0 ? (r.amount / total) * 100 : 0;
                  return (
                    <TableRow key={r.type}>
                      <TableCell className="font-medium">{r.type}</TableCell>
                      <TableCell className="text-right">{fmtCurrency(r.amount)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {share.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="space-y-1">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-xl font-semibold">{value}</p>
  </div>
);

export default Reports;
