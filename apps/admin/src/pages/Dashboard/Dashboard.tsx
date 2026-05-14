import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { useAuth } from '@/contexts/AuthContext';
import {
  BedDouble,
  CalendarCheck,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  UtensilsCrossed,
  TrendingDown,
  Activity,
  ShoppingBag,
  Wallet,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

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

// ── Greeting ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-card animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-3.5 w-24 rounded-full bg-slate-100" />
          <div className="h-7 w-16 rounded-lg bg-slate-100" />
          <div className="h-3 w-20 rounded-full bg-slate-100" />
        </div>
        <div className="h-11 w-11 rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

type StatCardProps = {
  title: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  iconClass: string;
  iconBg: string;
  href?: string;
  accent?: string;
};

function StatCard({ title, value, sub, icon: Icon, iconClass, iconBg, href, accent }: StatCardProps) {
  const content = (
    <div
      className={`group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-card transition-all duration-200 hover:shadow-card-hover ${
        accent ? `border-l-[3px]` : ''
      }`}
      style={accent ? { borderLeftColor: accent } : undefined}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} transition-transform duration-200 group-hover:scale-110`}>
          <Icon className={`h-5 w-5 ${iconClass}`} />
        </div>
      </div>
      {href && (
        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          View details <ArrowRight className="h-3 w-3" />
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link to={href} className="block">{content}</Link>;
  }
  return content;
}

// ── Occupancy bar ─────────────────────────────────────────────────────────────

function OccupancyBar({ occupied, total }: { occupied: number; total: number }) {
  const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
  const available = total - occupied;
  const color = pct >= 90 ? '#e11d48' : pct >= 70 ? '#d97706' : '#059669';

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Room Occupancy</p>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-bold"
          style={{ background: `${color}18`, color }}
        >
          {pct}%
        </span>
      </div>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">
        {occupied} <span className="text-sm font-medium text-muted-foreground">/ {total} rooms</span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="progress-animated h-full rounded-full transition-all"
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

// ── Today at a glance card ────────────────────────────────────────────────────

function TodayGlance({ checkIns, checkOuts }: { checkIns: number; checkOuts: number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Today at a Glance</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-emerald-50 p-3 text-center">
          <TrendingUp className="mx-auto h-5 w-5 text-emerald-600" />
          <p className="mt-1.5 text-xl font-bold text-emerald-700">{checkIns}</p>
          <p className="text-xs font-medium text-emerald-600">Check-ins</p>
        </div>
        <div className="rounded-lg bg-blue-50 p-3 text-center">
          <TrendingDown className="mx-auto h-5 w-5 text-blue-600" />
          <p className="mt-1.5 text-xl font-bold text-blue-700">{checkOuts}</p>
          <p className="text-xs font-medium text-blue-600">Check-outs</p>
        </div>
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

  // ── Role-specific cards ───────────────────────────────────────────────────

  const renderCards = () => {
    if (role === 'HOUSEKEEPING') {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <OccupancyBar occupied={stats.occupiedRooms} total={stats.totalRooms} />
          <StatCard title="Total Rooms" value={stats.totalRooms} sub="All room types" icon={BedDouble} iconClass="text-blue-600" iconBg="bg-blue-50" href="/rooms" accent="#3b82f6" />
          <StatCard title="Occupied" value={stats.occupiedRooms} sub="Currently booked" icon={Activity} iconClass="text-amber-600" iconBg="bg-amber-50" accent="#d97706" />
        </div>
      );
    }

    if (role === 'RESTAURANT_STAFF') {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard title="Menu Items" value={stats.menuItems ?? 0} sub="Active on menu" icon={UtensilsCrossed} iconClass="text-orange-600" iconBg="bg-orange-50" href="/restaurant" accent="#ea580c" />
          <StatCard title="Pending Orders" value={stats.pendingOrders ?? 0} sub="Need preparation" icon={ShoppingBag} iconClass="text-amber-600" iconBg="bg-amber-50" href="/restaurant" accent="#d97706" />
        </div>
      );
    }

    if (role === 'ACCOUNTANT') {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Revenue" value={fmt(stats.totalRevenue)} sub="Completed payments" icon={DollarSign} iconClass="text-emerald-600" iconBg="bg-emerald-50" href="/payments" accent="#059669" />
          <StatCard title="Month Expenses" value={fmt(stats.monthExpenses)} sub="Paid expenditures" icon={Wallet} iconClass="text-rose-600" iconBg="bg-rose-50" href="/expenditures" accent="#e11d48" />
          <StatCard title="Completed" value={stats.totalBookings} sub="Successful payments" icon={CalendarCheck} iconClass="text-green-600" iconBg="bg-green-50" accent="#16a34a" />
          <StatCard title="Pending" value={stats.pendingBookings} sub="Awaiting payment" icon={Clock} iconClass="text-orange-600" iconBg="bg-orange-50" accent="#ea580c" />
        </div>
      );
    }

    if (role === 'RECEPTIONIST') {
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <OccupancyBar occupied={stats.occupiedRooms} total={stats.totalRooms} />
            <TodayGlance checkIns={stats.todayCheckIns} checkOuts={stats.todayCheckOuts} />
            <StatCard title="Guests" value={stats.totalGuests} sub="Total registered" icon={Users} iconClass="text-violet-600" iconBg="bg-violet-50" href="/guests" accent="#7c3aed" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard title="Total Bookings" value={stats.totalBookings} sub={`${stats.pendingBookings} pending`} icon={CalendarCheck} iconClass="text-blue-600" iconBg="bg-blue-50" href="/bookings" accent="#2563eb" />
            <StatCard title="Total Rooms" value={stats.totalRooms} sub={`${stats.totalRooms - stats.occupiedRooms} available`} icon={BedDouble} iconClass="text-teal-600" iconBg="bg-teal-50" href="/rooms" accent="#0d9488" />
          </div>
        </div>
      );
    }

    // SUPER_ADMIN / MANAGER
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <OccupancyBar occupied={stats.occupiedRooms} total={stats.totalRooms} />
          <TodayGlance checkIns={stats.todayCheckIns} checkOuts={stats.todayCheckOuts} />
          <StatCard title="Total Guests" value={stats.totalGuests} sub="All time registered" icon={Users} iconClass="text-violet-600" iconBg="bg-violet-50" href="/guests" accent="#7c3aed" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Revenue" value={fmt(stats.totalRevenue)} sub="From completed payments" icon={DollarSign} iconClass="text-emerald-600" iconBg="bg-emerald-50" href="/payments" accent="#059669" />
          <StatCard title="Month Expenses" value={fmt(stats.monthExpenses)} sub="Paid this month" icon={Wallet} iconClass="text-rose-600" iconBg="bg-rose-50" href="/expenditures" accent="#e11d48" />
          <StatCard title="Total Bookings" value={stats.totalBookings} sub={`${stats.pendingBookings} pending`} icon={CalendarCheck} iconClass="text-blue-600" iconBg="bg-blue-50" href="/bookings" accent="#2563eb" />
          <StatCard title="Total Rooms" value={stats.totalRooms} sub={`${stats.totalRooms - stats.occupiedRooms} available`} icon={BedDouble} iconClass="text-teal-600" iconBg="bg-teal-50" href="/rooms" accent="#0d9488" />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* ── Page heading ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {getGreeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Here's what's happening at the resort today.
          </p>
        </div>
        <div className="hidden items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-muted-foreground shadow-sm sm:flex">
          <Activity className="h-3.5 w-3.5 text-emerald-500" />
          Live data
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        renderCards()
      )}

      {/* ── Quick actions ───────────────────────────────────────────────────── */}
      {!loading && (role === 'SUPER_ADMIN' || role === 'MANAGER' || role === 'RECEPTIONIST') && (
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quick Actions
          </p>
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
                  <Icon className="h-3.5 w-3.5" />
                  {a.label}
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
