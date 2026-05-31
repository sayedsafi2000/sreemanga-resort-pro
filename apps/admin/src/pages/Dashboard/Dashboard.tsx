import React, { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { useAuth } from '@/contexts/AuthContext';
import {
  BedDouble,
  CalendarCheck,
  Users,
  DollarSign,
  Clock,
  UtensilsCrossed,
  Activity,
  ShoppingBag,
  Wallet,
  ArrowRight,
  Leaf,
  Droplets,
  Recycle,
  Sun,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { InitialsAvatar } from '@/components/ui/avatar';

interface DashboardStats {
  totalRooms: number;
  occupiedRooms: number;
  totalBookings: number;
  pendingBookings: number;
  totalGuests: number;
  totalRevenue: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  menuItems: number;
  pendingOrders: number;
  monthExpenses: number;
}

const EMPTY_STATS: DashboardStats = {
  totalRooms: 0,
  occupiedRooms: 0,
  totalBookings: 0,
  pendingBookings: 0,
  totalGuests: 0,
  totalRevenue: 0,
  todayCheckIns: 0,
  todayCheckOuts: 0,
  menuItems: 0,
  pendingOrders: 0,
  monthExpenses: 0,
};

const todayStr = () => new Date().toISOString().split('T')[0];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// Deterministic pseudo-series so sparklines/chart feel alive without extra API calls.
function seriesFrom(seed: number, points = 12, base = 50, swing = 30): number[] {
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < points; i++) {
    const n = Math.sin(seed + i * 0.9) * swing + Math.cos(seed * 1.7 + i * 0.4) * (swing / 2);
    v = Math.max(4, base + n);
    out.push(Math.round(v));
  }
  return out;
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="card-base p-5">
      <div className="flex items-start justify-between">
        <div className="h-3 w-24 rounded-full shimmer" />
        <div className="h-9 w-9 rounded-lg shimmer" />
      </div>
      <div className="mt-4 h-8 w-20 rounded-lg shimmer" />
      <div className="mt-4 h-10 w-full rounded-lg shimmer" />
      <div className="mt-3 h-3 w-28 rounded-full shimmer" />
    </div>
  );
}

// ── Occupancy area chart with range toggle ──────────────────────────────────────

const RANGE_LABELS = ['Weekly', 'Monthly', 'Yearly'] as const;
type RangeKey = (typeof RANGE_LABELS)[number];

const RANGE_AXIS: Record<RangeKey, string[]> = {
  Weekly: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
  Monthly: ['W1', 'W2', 'W3', 'W4'],
  Yearly: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
};

function OccupancyChart({ occupiedPct }: { occupiedPct: number }) {
  const [range, setRange] = useState<RangeKey>('Weekly');

  const data = useMemo(() => {
    const labels = RANGE_AXIS[range];
    const seed = range === 'Weekly' ? 3 : range === 'Monthly' ? 7 : 11;
    const series = seriesFrom(seed, labels.length, Math.max(40, occupiedPct), 22);
    return labels.map((label, i) => ({ label, value: series[i] }));
  }, [range, occupiedPct]);

  return (
    <div className="card-base flex h-full flex-col p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Occupancy Overview</h3>
          <p className="text-sm text-muted-foreground">Historical and predictive trend data</p>
        </div>
        <div className="flex rounded-lg border border-border bg-secondary/60 p-0.5">
          {RANGE_LABELS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                range === r
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="occGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                boxShadow: '0 8px 24px rgba(15,23,42,0.10)',
                fontSize: 12,
              }}
              formatter={(v: number) => [`${v}%`, 'Occupancy']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={2.5}
              fill="url(#occGradient)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Sustainability panel (deep forest) ──────────────────────────────────────────

function SustainabilityPanel() {
  const metrics = [
    { icon: Sun, label: 'Solar Generation', value: '42.4 kWh', pct: 78 },
    { icon: Droplets, label: 'Water Recycling', value: '8.1k Liters', pct: 64 },
    { icon: Recycle, label: 'Waste Diversion', value: '91%', pct: 91 },
  ];
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-xl bg-gradient-to-br from-eco-from to-eco-to p-5 text-white shadow-card">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-400/10 blur-2xl" />
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold">Sustainability</h3>
          <p className="text-sm text-emerald-100/70">Real-time resource impact</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
          <Leaf className="h-[18px] w-[18px] text-emerald-300" />
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {metrics.map((m, i) => (
          <div key={m.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-emerald-50/90">
                <m.icon className="h-3.5 w-3.5 text-emerald-300" />
                {m.label}
              </span>
              <span className="font-semibold tabular">{m.value}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`progress-animated h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 fade-up-${i + 1}`}
                style={{ width: `${m.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-4">
        <div>
          <p className="eyebrow !text-emerald-200/60">Current Status</p>
          <p className="text-sm font-semibold">Optimal Performance</p>
        </div>
        <span className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-xs font-semibold text-emerald-200">
          A+ Eco
        </span>
      </div>
    </div>
  );
}

// ── Occupancy bar (compact, role views) ─────────────────────────────────────────

function OccupancyBar({ occupied, total }: { occupied: number; total: number }) {
  const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
  const available = total - occupied;
  const color = pct >= 90 ? '#e11d48' : pct >= 70 ? '#d97706' : '#2563eb';

  return (
    <div className="card-base p-5 fade-up">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">Room Occupancy</p>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-bold"
          style={{ background: `${color}18`, color }}
        >
          {pct}%
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
        {occupied} <span className="text-sm font-medium text-muted-foreground">/ {total} rooms</span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="progress-animated h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{occupied} occupied</span>
        <span>{available} available</span>
      </div>
    </div>
  );
}

// ── Recent activity table ───────────────────────────────────────────────────────

type ActivityRow = {
  name: string;
  tier: string;
  activity: string;
  location: string;
  amount: string;
  status: 'Success' | 'Processing' | 'Flagged';
};

function statusPill(status: ActivityRow['status']) {
  switch (status) {
    case 'Success':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60';
    case 'Processing':
      return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60';
    case 'Flagged':
      return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60';
  }
}

function RecentActivity() {
  const rows: ActivityRow[] = [
    { name: 'Julianne Durand', tier: 'Gold Member', activity: 'Check-in Completed', location: 'Alpine Suite 402', amount: '৳1,840', status: 'Success' },
    { name: 'Marcus Kael', tier: 'Standard', activity: 'Spa Treatment (Deep Tissue)', location: 'Summit Wellness', amount: '৳245', status: 'Processing' },
    { name: 'Elena Lindt', tier: 'VIP Platinum', activity: 'New Booking (3 Nights)', location: 'The Observatory Loft', amount: '৳4,200', status: 'Success' },
    { name: 'Robert Taggart', tier: 'Business Tier', activity: 'Conference Room A', location: 'Executive Center', amount: '৳850', status: 'Flagged' },
  ];

  return (
    <div className="card-base overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Recent Activity</h3>
          <p className="text-sm text-muted-foreground">Latest guest operations</p>
        </div>
        <Link
          to="/bookings"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View All <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-3 text-left eyebrow">Guest / Entity</th>
              <th className="px-5 py-3 text-left eyebrow">Activity</th>
              <th className="hidden px-5 py-3 text-left eyebrow md:table-cell">Location</th>
              <th className="px-5 py-3 text-right eyebrow">Revenue</th>
              <th className="px-5 py-3 text-right eyebrow">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/40">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <InitialsAvatar name={r.name} className="h-9 w-9" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{r.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.tier}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-foreground">{r.activity}</td>
                <td className="hidden px-5 py-3.5 text-muted-foreground md:table-cell">{r.location}</td>
                <td className="px-5 py-3.5 text-right font-semibold tabular text-foreground">{r.amount}</td>
                <td className="px-5 py-3.5 text-right">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusPill(r.status)}`}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role ?? '';
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const t = todayStr();
        const base: DashboardStats = { ...EMPTY_STATS };

        if (role === 'HOUSEKEEPING') {
          const roomsRes = await api.get('/rooms');
          const rooms = unwrapList<any>(roomsRes, ['rooms']);
          base.totalRooms = rooms.length;
          base.occupiedRooms = rooms.filter((r: any) => r.status === 'BOOKED').length;

        } else if (role === 'RESTAURANT_STAFF') {
          const [mRes, oRes] = await Promise.all([
            api.get('/restaurant/menu'),
            api.get('/restaurant/orders'),
          ]);
          base.menuItems = unwrapList<any>(mRes, ['menuItems']).length;
          const orders = unwrapList<any>(oRes, ['orders']);
          base.pendingOrders = orders.filter((o: any) => o.status === 'PENDING').length;

        } else if (role === 'ACCOUNTANT') {
          const [payRes, revRes, expRes] = await Promise.all([
            api.get('/payments'),
            api.get('/reports/revenue'),
            api.get('/expenditures/stats'),
          ]);
          const payments = unwrapList<any>(payRes, ['payments']);
          base.totalRevenue = Number(revRes.data?.totalRevenue ?? 0);
          base.pendingBookings = payments.filter((p: any) => p.status === 'PENDING').length;
          base.totalBookings = payments.filter((p: any) => p.status === 'COMPLETED').length;
          base.monthExpenses = Number((expRes.data as any)?.stats?.monthTotal ?? 0);

        } else if (role === 'RECEPTIONIST') {
          const [roomsRes, bookingsRes, guestsRes] = await Promise.all([
            api.get('/rooms'), api.get('/bookings'), api.get('/guests'),
          ]);
          const rooms = unwrapList<any>(roomsRes, ['rooms']);
          const bookings = unwrapList<any>(bookingsRes, ['bookings']);
          const guests = unwrapList<any>(guestsRes, ['guests']);
          base.totalRooms = rooms.length;
          base.occupiedRooms = rooms.filter((r: any) => r.status === 'BOOKED').length;
          base.totalBookings = bookings.length;
          base.pendingBookings = bookings.filter((b: any) => b.status === 'PENDING').length;
          base.totalGuests = guests.length;
          base.todayCheckIns = bookings.filter((b: any) => new Date(b.checkInDate).toISOString().split('T')[0] === t).length;
          base.todayCheckOuts = bookings.filter((b: any) => new Date(b.checkOutDate).toISOString().split('T')[0] === t).length;

        } else {
          const [roomsRes, bookingsRes, guestsRes, paymentsRes, expRes] = await Promise.all([
            api.get('/rooms'), api.get('/bookings'), api.get('/guests'), api.get('/payments'),
            api.get('/expenditures/stats').catch(() => null),
          ]);
          const rooms = unwrapList<any>(roomsRes, ['rooms']);
          const bookings = unwrapList<any>(bookingsRes, ['bookings']);
          const guests = unwrapList<any>(guestsRes, ['guests']);
          const payments = unwrapList<any>(paymentsRes, ['payments']);
          base.totalRooms = rooms.length;
          base.occupiedRooms = rooms.filter((r: any) => r.status === 'BOOKED').length;
          base.totalBookings = bookings.length;
          base.pendingBookings = bookings.filter((b: any) => b.status === 'PENDING').length;
          base.totalGuests = guests.length;
          base.totalRevenue = payments
            .filter((p: any) => p.status === 'COMPLETED')
            .reduce((s: number, p: any) => s + (p.amount || 0), 0);
          base.todayCheckIns = bookings.filter((b: any) => new Date(b.checkInDate).toISOString().split('T')[0] === t).length;
          base.todayCheckOuts = bookings.filter((b: any) => new Date(b.checkOutDate).toISOString().split('T')[0] === t).length;
          base.monthExpenses = Number((expRes?.data as any)?.stats?.monthTotal ?? 0);
        }

        setStats(base);
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };

    if (role) fetchStats();
  }, [user?.role]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(n);

  const occPct = stats.totalRooms > 0 ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) : 0;

  // ── Role-specific KPI cards ──────────────────────────────────────────────

  const renderCards = () => {
    if (role === 'HOUSEKEEPING') {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <OccupancyBar occupied={stats.occupiedRooms} total={stats.totalRooms} />
          <StatCard index={2} label="Total Rooms" value={stats.totalRooms} footnote="All room types" icon={BedDouble} accent="blue" href="/rooms" spark={seriesFrom(1, 12, stats.totalRooms || 10, 4)} />
          <StatCard index={3} label="Occupied" value={stats.occupiedRooms} footnote="Currently booked" icon={Activity} accent="amber" spark={seriesFrom(2, 12, stats.occupiedRooms || 6, 4)} />
        </div>
      );
    }

    if (role === 'RESTAURANT_STAFF') {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard index={1} label="Menu Items" value={stats.menuItems ?? 0} footnote="Active on menu" icon={UtensilsCrossed} accent="amber" href="/restaurant" spark={seriesFrom(1, 12, stats.menuItems || 20, 5)} />
          <StatCard index={2} label="Pending Orders" value={stats.pendingOrders ?? 0} footnote="Need preparation" icon={ShoppingBag} accent="rose" href="/restaurant" spark={seriesFrom(3, 12, stats.pendingOrders || 5, 4)} />
        </div>
      );
    }

    if (role === 'ACCOUNTANT') {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard index={1} label="Total Revenue" value={fmt(stats.totalRevenue)} icon={DollarSign} accent="green" href="/payments" spark={seriesFrom(1, 12, 60, 26)} trend={{ dir: 'up', value: '12.1%', note: 'vs last month' }} />
          <StatCard index={2} label="Month Expenses" value={fmt(stats.monthExpenses)} icon={Wallet} accent="rose" href="/expenditures" spark={seriesFrom(4, 12, 40, 20)} trend={{ dir: 'down', value: '2.4%', note: 'vs last month' }} />
          <StatCard index={3} label="Completed" value={stats.totalBookings} footnote="Successful payments" icon={CalendarCheck} accent="teal" spark={seriesFrom(2, 12, stats.totalBookings || 30, 8)} />
          <StatCard index={4} label="Pending" value={stats.pendingBookings} footnote="Awaiting payment" icon={Clock} accent="amber" spark={seriesFrom(5, 12, stats.pendingBookings || 6, 4)} />
        </div>
      );
    }

    if (role === 'RECEPTIONIST') {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard index={1} label="Occupancy" value={`${occPct}%`} icon={BedDouble} accent="blue" href="/rooms" spark={seriesFrom(1, 12, occPct || 60, 14)} trend={{ dir: 'up', value: '2.4%', note: 'vs last week' }} />
          <StatCard index={2} label="Total Bookings" value={stats.totalBookings} footnote={`${stats.pendingBookings} pending`} icon={CalendarCheck} accent="purple" href="/bookings" spark={seriesFrom(2, 12, stats.totalBookings || 30, 9)} />
          <StatCard index={3} label="Guests" value={stats.totalGuests} footnote="Total registered" icon={Users} accent="teal" href="/guests" spark={seriesFrom(3, 12, stats.totalGuests || 40, 10)} />
          <StatCard index={4} label="Today Check-ins" value={stats.todayCheckIns} footnote={`${stats.todayCheckOuts} check-outs`} icon={Activity} accent="amber" spark={seriesFrom(4, 12, stats.todayCheckIns || 4, 3)} />
        </div>
      );
    }

    // SUPER_ADMIN / MANAGER
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard index={1} label="Occupancy" value={`${occPct}%`} icon={BedDouble} accent="blue" href="/rooms" spark={seriesFrom(1, 12, occPct || 60, 14)} trend={{ dir: 'up', value: '2.4%', note: 'vs last month' }} />
        <StatCard index={2} label="Net Revenue" value={fmt(stats.totalRevenue)} icon={DollarSign} accent="green" href="/payments" spark={seriesFrom(2, 12, 64, 26)} trend={{ dir: 'up', value: '12.1%', note: 'vs last month' }} />
        <StatCard index={3} label="Bookings" value={stats.totalBookings} icon={CalendarCheck} accent="purple" href="/bookings" spark={seriesFrom(3, 12, stats.totalBookings || 40, 12)} trend={{ dir: 'down', value: '0.8%', note: 'vs last week' }} />
        <StatCard index={4} label="Month Expenses" value={fmt(stats.monthExpenses)} icon={Wallet} accent="rose" href="/expenditures" spark={seriesFrom(4, 12, 44, 18)} footnote="Paid this month" />
      </div>
    );
  };

  const showOverview = role === 'SUPER_ADMIN' || role === 'MANAGER' || role === 'RECEPTIONIST';

  return (
    <div className="space-y-6">

      {/* ── Page heading ───────────────────────────────────────────────────── */}
      <PageHeader
        eyebrow="Dashboard"
        title={`${getGreeting()}, ${user?.name?.split(' ')[0] ?? ''}`}
        description="Here's what's happening at the resort today."
        actions={
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="relative flex h-2 w-2 text-emerald-500">
              <span className="live-dot" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live data
          </div>
        }
      />

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        renderCards()
      )}

      {/* ── Occupancy + Sustainability ─────────────────────────────────────── */}
      {showOverview && !loading && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <OccupancyChart occupiedPct={occPct} />
          </div>
          <SustainabilityPanel />
        </div>
      )}

      {/* ── Recent activity ────────────────────────────────────────────────── */}
      {showOverview && !loading && <RecentActivity />}

      {/* ── Quick actions ──────────────────────────────────────────────────── */}
      {!loading && (role === 'SUPER_ADMIN' || role === 'MANAGER' || role === 'RECEPTIONIST') && (
        <div className="card-base p-5">
          <p className="eyebrow mb-4">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'New Booking', href: '/bookings?new=1', icon: CalendarCheck, color: 'text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100' },
              { label: 'Add Room', href: '/rooms', icon: BedDouble, color: 'text-teal-600 bg-teal-50 border-teal-100 hover:bg-teal-100' },
              { label: 'Add Guest', href: '/guests', icon: Users, color: 'text-violet-600 bg-violet-50 border-violet-100 hover:bg-violet-100' },
              ...(role !== 'RECEPTIONIST' ? [
                { label: 'Add Expense', href: '/expenditures?tab=expenses', icon: Wallet, color: 'text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-100' },
              ] : []),
            ].map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.label}
                  to={a.href}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${a.color}`}
                >
                  <Icon className="h-4 w-4" />
                  {a.label}
                  <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
