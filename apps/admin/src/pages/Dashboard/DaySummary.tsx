import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { CalendarDays, BedDouble, LogIn, Wallet, AlertTriangle, MonitorSmartphone, ClipboardList, Loader2 } from 'lucide-react';
import { fmt, fmtDate, todayYmd, addDaysYmd } from '@/pages/Bookings/shared';

type Summary = {
  date: string; totalRooms: number; occupiedRooms: number; reservedRooms: number; availableRooms: number; stayingBookings: number;
  checkIns: number; checkOuts: number; newBookings: number; advanceCollected: number; paymentsCount: number; dueOutstanding: number;
  month: { label: string; total: number; web: number; admin: number };
};

/** One day at a glance (occupancy, arrivals, money) plus the month's web vs front-desk bookings. */
const DaySummary: React.FC = () => {
  const [date, setDate] = useState(todayYmd());
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    api.get(`/bookings/day-summary?date=${date}`)
      .then((r) => { if (!cancelled) setData(r.data); })
      .catch((e) => { if (!cancelled) setError(e?.response?.data?.message || 'Could not load the day summary'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [date]);

  const monthLabel = data ? new Date(`${data.month.label}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '';
  const tiles = data ? [
    { label: 'Rooms booked', value: `${data.occupiedRooms}/${data.totalRooms}`, sub: data.reservedRooms ? `+${data.reservedRooms} reserved` : `${data.stayingBookings} stay${data.stayingBookings === 1 ? '' : 's'} that night`, icon: BedDouble, tone: 'text-rose-700 bg-rose-50 ring-rose-100', href: `/bookings/calendar?month=${date.slice(0, 7)}` },
    { label: 'Rooms available', value: String(data.availableRooms), sub: 'free that night', icon: CalendarDays, tone: 'text-emerald-700 bg-emerald-50 ring-emerald-100', href: `/bookings/new?checkIn=${date}&checkOut=${addDaysYmd(date, 1)}` },
    { label: 'Check-ins', value: String(data.checkIns), sub: `${data.checkOuts} check-out${data.checkOuts === 1 ? '' : 's'}`, icon: LogIn, tone: 'text-blue-700 bg-blue-50 ring-blue-100', href: `/bookings?from=${date}&to=${date}` },
    { label: 'Advance collected', value: fmt(data.advanceCollected), sub: `${data.paymentsCount} payment${data.paymentsCount === 1 ? '' : 's'} · ${data.newBookings} new booking${data.newBookings === 1 ? '' : 's'}`, icon: Wallet, tone: 'text-teal-700 bg-teal-50 ring-teal-100', href: '/payments' },
    { label: 'Due outstanding', value: fmt(data.dueOutstanding), sub: 'on bookings staying that night', icon: AlertTriangle, tone: 'text-amber-700 bg-amber-50 ring-amber-100', href: '/bookings?flag=due' },
  ] : [];

  return (
    <div className="card-base p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Day Summary</p>
          <p className="text-sm text-muted-foreground">{fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted" onClick={() => setDate(addDaysYmd(date, -1))}>‹</button>
          <Input type="date" className="h-9 w-40" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <button type="button" className="rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted" onClick={() => setDate(addDaysYmd(date, 1))}>›</button>
          {date !== todayYmd() && <button type="button" className="rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted" onClick={() => setDate(todayYmd())}>Today</button>}
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
      {loading && !data ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : data && (
        <>
          <div className={`mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5 ${loading ? 'opacity-60' : ''}`}>
            {tiles.map((tl) => {
              const Icon = tl.icon;
              return (
                <Link key={tl.label} to={tl.href} className="rounded-xl border bg-white p-3.5 transition hover:border-primary/40 hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{tl.label}</p>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ring-1 ${tl.tone}`}><Icon className="h-3.5 w-3.5" /></span>
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">{tl.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{tl.sub}</p>
                </Link>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-muted/50 px-4 py-3 text-sm">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{monthLabel}:</span>
            <span className="tabular-nums">{data.month.total} booking{data.month.total === 1 ? '' : 's'}</span>
            <span className="text-muted-foreground">·</span>
            <Link to={`/bookings?flag=web&from=${data.month.label}-01`} className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 font-semibold text-violet-800"><MonitorSmartphone className="h-3.5 w-3.5" /> Website {data.month.web}</Link>
            <Link to={`/bookings?from=${data.month.label}-01`} className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 font-semibold text-blue-800"><ClipboardList className="h-3.5 w-3.5" /> Front desk {data.month.admin}</Link>
          </div>
        </>
      )}
    </div>
  );
};

export default DaySummary;
