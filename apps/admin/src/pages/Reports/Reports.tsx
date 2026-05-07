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
import { Download, RefreshCw } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = `?startDate=${startDate}&endDate=${endDate}`;
      const [r, o, b] = await Promise.all([
        api.get(`/reports/revenue${params}`),
        api.get(`/reports/occupancy${params}`),
        api.get(`/reports/bookings${params}`),
      ]);
      setRev(r.data || null);
      setOcc(o.data || null);
      setBookings(b.data || null);
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
    const map = rev?.revenueByDate || {};
    return Object.entries(map)
      .map(([date, value]) => ({ date, revenue: Number(value) || 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [rev]);

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Revenue, occupancy, and booking stats over the selected date range.
          </p>
        </div>
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
      </div>

      {/* Headline cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtCurrency(rev?.totalRevenue ?? 0)}</p>
            <p className="text-xs text-muted-foreground">
              {rev?.totalBookings ?? 0} paying bookings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{(occ?.occupancyRate ?? 0).toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">
              {occ?.occupiedRoomNights ?? 0} of {occ?.totalRoomNights ?? 0} room-nights
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{bookings?.totalBookings ?? 0}</p>
            <p className="text-xs text-muted-foreground">In selected range</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{bookings?.cancelledBookings ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {bookings?.totalBookings
                ? `${(((bookings.cancelledBookings ?? 0) / bookings.totalBookings) * 100).toFixed(1)}% of total`
                : '—'}
            </p>
          </CardContent>
        </Card>
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

      {/* Revenue chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Revenue over time</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportRevenue} disabled={!rev}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </CardHeader>
        <CardContent>
          {revenueChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">
              No revenue in selected range.
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
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
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
