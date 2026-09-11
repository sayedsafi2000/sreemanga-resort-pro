import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { InitialsAvatar } from '@/components/ui/avatar';
import {
  ChevronLeft, ChevronRight, Users, Loader2, Plus, Crown, Globe2, Handshake, MonitorSmartphone, CalendarDays, CalendarCheck,
  Clock, Ban, CheckCircle2, X, FileText, Pencil, Phone, BedDouble, Search, Building2, DollarSign, Tag, Check,
} from 'lucide-react';
import { TYPE_LABEL, STATUS_META, fmt, fmtDate, addDaysYmd, errMsg, resortTitle } from './shared';

type Day = { date: string; day: number; weekday: number; isPast: boolean; isToday: boolean; isWeekend: boolean };
type CalRoom = { id: string; name: string; type: string; capacity: number; price: number; weekendPrice?: number | null; extraGuestCharge?: number | null; status: string };
type CellBooking = {
  id: string; invoiceLabel: string; status: string; guestName: string; guestPhone: string; isVip: boolean; isForeigner: boolean; isStakeholder: boolean;
  source: string; staffName?: string | null; checkInDate: string; checkOutDate: string; nights: number; totalAmount: number;
};
type Cell = { state: 'BOOKED' | 'RESERVED' | 'BLOCKED'; booking?: CellBooking };
type Calendar = { month: string; days: Day[]; rooms: CalRoom[]; cells: Record<string, Record<string, Cell>>; stats: Record<string, number> };

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthLabel = (ym: string) => new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const shiftMonth = (ym: string, n: number) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const bdt = (n: number) => `${n.toLocaleString()} BDT`;

const MonthlyCalendar: React.FC = () => {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [month, setMonthState] = useState(() => (/^\d{4}-\d{2}$/.test(sp.get('month') ?? '') ? sp.get('month')! : new Date().toISOString().slice(0, 7)));
  const [draft, setDraft] = useState(month);
  const setMonth = (value: string) => {
    setMonthState(value); setDraft(value);
    const n = new URLSearchParams(sp); n.set('month', value); setSp(n, { replace: true });
  };
  const [cal, setCal] = useState<Calendar | null>(null);
  const [resortName, setResortName] = useState('Pina Vista');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ roomId: string; dates: string[] } | null>(null);
  const [active, setActive] = useState<CellBooking | null>(null);

  useEffect(() => {
    api.get('/public/settings').then((r) => { const t = resortTitle(r.data?.settings); if (t) setResortName(t); }).catch(() => {});
  }, []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null); setSelected(null); setActive(null);
    api.get(`/bookings/calendar?month=${month}`)
      .then((r) => { if (!cancelled) setCal(r.data); })
      .catch((e) => { if (!cancelled) setError(errMsg(e, 'Failed to load calendar')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [month]);

  // ── Checkbox selection: consecutive nights of one room ────────────────
  const toggle = (roomId: string, date: string) => {
    setActive(null);
    setSelected((cur) => {
      if (!cur || cur.roomId !== roomId) return { roomId, dates: [date] };
      const dates = [...cur.dates].sort(); const first = dates[0]; const last = dates[dates.length - 1];
      const idx = dates.indexOf(date);
      if (idx >= 0) {
        // Uncheck: drop it (and anything after a middle night so the run stays consecutive).
        const next = idx === 0 ? dates.slice(1) : dates.slice(0, idx);
        return next.length ? { roomId, dates: next } : null;
      }
      if (date === addDaysYmd(last, 1) || date === addDaysYmd(first, -1)) return { roomId, dates: [...dates, date].sort() };
      return { roomId, dates: [date] }; // non-adjacent night → start a fresh selection
    });
  };
  const selection = useMemo(() => {
    if (!selected || !cal) return null;
    const room = cal.rooms.find((r) => r.id === selected.roomId); if (!room) return null;
    const dates = [...selected.dates].sort();
    const contiguous = dates.every((d, i) => i === 0 || addDaysYmd(dates[i - 1], 1) === d);
    const price = dates.reduce((s, d) => { const day = cal.days.find((x) => x.date === d); return s + (day?.isWeekend && room.weekendPrice ? room.weekendPrice : room.price); }, 0);
    return { room, dates, contiguous, checkIn: dates[0], checkOut: addDaysYmd(dates[dates.length - 1], 1), nights: dates.length, price };
  }, [selected, cal]);

  const stats = cal?.stats ?? {};
  const chips = [
    { label: 'Booked', n: stats.booked, cls: 'bg-red-600 text-white', icon: <CalendarCheck className="h-4 w-4" /> },
    { label: 'Website', n: stats.web, cls: 'bg-violet-600 text-white', icon: <MonitorSmartphone className="h-4 w-4" /> },
    { label: 'Reserved', n: stats.reserved, cls: 'bg-amber-400 text-slate-900', icon: <Clock className="h-4 w-4" /> },
    { label: 'Blocked', n: stats.blocked, cls: 'bg-slate-600 text-white', icon: <Ban className="h-4 w-4" /> },
    { label: 'Available', n: stats.available, cls: 'bg-emerald-600 text-white', icon: <CheckCircle2 className="h-4 w-4" /> },
    { label: 'VIP', n: stats.vip, cls: 'bg-yellow-400 text-slate-900', icon: <Crown className="h-4 w-4" /> },
    { label: 'Foreigner', n: stats.foreigner, cls: 'bg-orange-500 text-white', icon: <Globe2 className="h-4 w-4" /> },
    { label: 'Stakeholder', n: stats.stakeholder, cls: 'bg-green-600 text-white', icon: <Handshake className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-3">
      {/* ── Title bar ─────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-slate-800 px-4 py-3 text-white shadow-md">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <CalendarDays className="h-5 w-5" />
          <h1 className="text-xl font-bold tracking-tight">Monthly Resort Booked List</h1>
          <span className="text-sm text-slate-300">Day-by-day room availability &amp; booking status</span>
          <Button size="sm" className="ml-auto h-8 bg-blue-600 text-white hover:bg-blue-700" onClick={() => navigate('/bookings/new')}><Plus className="mr-1 h-4 w-4" /> New Booking</Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((c) => (
            <span key={c.label} className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold shadow-sm ${c.cls}`}>
              {c.icon}{c.label}<span className="rounded bg-black/25 px-1.5 py-0.5 text-xs font-bold tabular-nums">{c.n ?? 0}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Month bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-xl bg-slate-800 px-4 py-3 text-white shadow-md sm:flex-row sm:items-center">
        <form className="flex items-center gap-3" onSubmit={(e) => { e.preventDefault(); if (/^\d{4}-(0[1-9]|1[0-2])$/.test(draft)) setMonth(draft); }}>
          <div className="flex flex-1 items-stretch overflow-hidden rounded-md sm:flex-none">
            <input type="month" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="YYYY-MM" className="h-10 min-w-0 flex-1 bg-white px-3 text-sm text-slate-900 outline-none sm:w-40 sm:flex-none" aria-label="Month" />
            <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-slate-600"><CalendarDays className="h-4 w-4" /></span>
          </div>
          <Button type="submit" className="h-10 bg-blue-600 px-4 text-white hover:bg-blue-700"><Search className="mr-1.5 h-4 w-4" /> Search</Button>
        </form>
        <div className="flex items-center justify-between gap-2 sm:ml-auto sm:justify-end sm:gap-3">
          <Button variant="outline" size="sm" className="h-9 bg-white text-slate-800 hover:bg-slate-100" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Previous</span></Button>
          <span className="flex items-center gap-2 text-base font-bold sm:text-lg"><CalendarDays className="h-5 w-5" /> {monthLabel(month)}</span>
          <Button variant="outline" size="sm" className="h-9 bg-white text-slate-800 hover:bg-slate-100" onClick={() => setMonth(shiftMonth(month, 1))}><span className="hidden sm:inline">Next</span><ChevronRight className="h-4 w-4 sm:ml-1" /></Button>
        </div>
      </div>

      {error && <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>}

      {/* ── Grid: days × rooms ────────────────────────────────────────── */}
      {loading || !cal ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="overflow-hidden rounded-xl border shadow-md">
          <div className="flex items-center justify-center gap-1.5 border-b border-slate-700 bg-slate-800 px-3 py-2 text-[15px] font-bold text-white"><Building2 className="h-4 w-4" />{resortName}</div>
          <div className="overflow-auto bg-white" style={{ maxHeight: 'calc(100vh - 8.5rem)' }}>
          <table className="w-full min-w-[880px] border-collapse text-xs">
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="sticky left-0 z-30 w-[72px] border-r border-slate-700 bg-slate-800 px-2 py-2 text-left align-bottom text-sm font-bold text-white">Days</th>
                {cal.rooms.map((r) => (
                  <th key={r.id} className={`border-r border-slate-700 bg-slate-800 px-2 py-2 text-center text-white ${r.status === 'MAINTENANCE' ? 'opacity-70' : ''}`}>
                    <div className="text-[15px] font-bold leading-tight">{r.name}</div>
                    <div className="mt-0.5 text-xs font-medium text-slate-200">{TYPE_LABEL[r.type] ?? r.type}</div>
                    <div className="mt-0.5 flex items-center justify-center gap-1 text-xs text-slate-300"><Users className="h-3.5 w-3.5" />{r.capacity} persons</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cal.days.map((d, rowIdx) => (
                <tr key={d.date}>
                  <td className={`sticky left-0 z-10 border border-slate-200 px-2 py-2 text-center ${d.isWeekend ? 'bg-red-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
                    <div className="text-base font-bold leading-none">{String(d.day).padStart(2, '0')}</div>
                    <div className={`mt-1 text-xs ${d.isWeekend ? 'text-red-100' : 'text-slate-600'}`}>{WD[d.weekday]}</div>
                    {d.isToday && <div className="mt-1 rounded bg-blue-600 px-1 text-[9px] font-bold uppercase text-white">Today</div>}
                  </td>
                  {cal.rooms.map((r) => {
                    const cell = cal.cells[r.id]?.[d.date];
                    if (cell?.booking) {
                      const bk = cell.booking; const booked = cell.state === 'BOOKED';
                      const tipBelow = rowIdx < cal.days.length / 2;
                      return (
                        <td key={r.id} className={`group relative border p-0 align-middle ${booked ? 'border-red-700/40 bg-red-600 text-white' : 'border-amber-500/50 bg-amber-400 text-slate-900'}`}>
                          <button type="button" data-bar={bk.id} onClick={() => { setActive(bk); setSelected(null); }} className="flex min-h-[60px] w-full flex-col items-center justify-center px-1.5 py-2 text-center transition hover:brightness-95">
                            <span className="flex items-center gap-1.5 text-[13px] font-extrabold uppercase tracking-wide">{booked ? <CalendarCheck className="h-4 w-4" /> : <Clock className="h-4 w-4" />}{booked ? 'Booked' : 'Reserved'}</span>
                            <span className="mt-1 max-w-full truncate text-[12px] font-medium">{bk.guestName}</span>
                            {(bk.isVip || bk.isForeigner || bk.isStakeholder || bk.source === 'WEB') && (
                              <span className="mt-1 flex gap-1 opacity-90">{bk.isVip && <Crown className="h-3 w-3" />}{bk.isForeigner && <Globe2 className="h-3 w-3" />}{bk.isStakeholder && <Handshake className="h-3 w-3" />}{bk.source === 'WEB' && <MonitorSmartphone className="h-3 w-3" />}</span>
                            )}
                          </button>
                          <div className={`pointer-events-none absolute left-1/2 z-40 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-3 py-2 text-center text-[12px] font-medium leading-snug text-white shadow-lg group-hover:block ${tipBelow ? 'top-full mt-1' : 'bottom-full mb-1'}`}>
                            {bk.guestName}, {bk.guestPhone},<br />Booked By: {bk.staffName ?? 'Website'} · {bk.invoiceLabel}
                          </div>
                        </td>
                      );
                    }
                    if (cell?.state === 'BLOCKED') {
                      return <td key={r.id} className="border border-slate-400/50 bg-slate-500 p-0 text-center text-white"><div className="flex min-h-[60px] flex-col items-center justify-center px-1 py-2"><span className="flex items-center gap-1.5 text-[13px] font-extrabold uppercase tracking-wide"><Ban className="h-4 w-4" />Blocked</span><span className="mt-1 text-[11px] opacity-90">Maintenance</span></div></td>;
                    }
                    const isSel = selected?.roomId === r.id && selected.dates.includes(d.date);
                    const price = d.isWeekend && r.weekendPrice ? r.weekendPrice : r.price;
                    const weekendDiff = d.isWeekend && r.weekendPrice && r.weekendPrice !== r.price ? r.weekendPrice - r.price : 0;
                    return (
                      <td key={r.id} className={`border p-0 align-top ${isSel ? 'border-emerald-500 bg-emerald-100' : 'border-emerald-200 bg-emerald-50/70'}`}>
                        <button type="button" data-cell="free" data-room={r.id} data-date={d.date} disabled={d.isPast} onClick={() => toggle(r.id, d.date)}
                          className={`flex min-h-[112px] w-full flex-col items-center px-1 py-1.5 text-center text-[11px] leading-[1.35] transition ${d.isPast ? 'cursor-default' : 'hover:bg-emerald-100'}`}>
                          {!d.isPast && (
                            <span className={`mb-1 flex h-[18px] w-[18px] items-center justify-center rounded-[3px] border-2 ${isSel ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400 bg-white'}`}>{isSel && <Check className="h-3 w-3" />}</span>
                          )}
                          <span className="flex items-center gap-1 text-[12px] font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Available</span>
                          <span className="flex max-w-full items-center gap-1 truncate text-blue-700"><BedDouble className="h-3 w-3 shrink-0" />{r.name}</span>
                          <span className="flex items-center gap-1 text-blue-700"><Users className="h-3 w-3" />{r.capacity} Persons</span>
                          <span className="flex items-center gap-0.5 font-semibold text-blue-700"><DollarSign className="h-3 w-3" />{bdt(price)}</span>
                          {weekendDiff !== 0 && <span className="flex items-center gap-1 text-red-600"><Tag className="h-3 w-3" />{weekendDiff > 0 ? `+${bdt(weekendDiff)} weekend` : `${bdt(-weekendDiff)} off`}</span>}
                          {d.isPast && <span className="flex items-center gap-1 text-slate-500"><Clock className="h-3 w-3" />Past date</span>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* ── Selection CTA ─────────────────────────────────────────────── */}
      {selection && (
        <div className="sticky bottom-3 z-30 mx-auto flex w-fit max-w-[calc(100%-1rem)] flex-wrap items-center gap-3 rounded-xl border bg-white/95 px-4 py-3 backdrop-blur" style={{ boxShadow: 'var(--shadow-dialog)' }}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><BedDouble className="h-4 w-4" /></span>
          <div className="text-sm">
            <div className="font-semibold">{selection.room.name} · {selection.nights} night{selection.nights === 1 ? '' : 's'} · <span className="tabular-nums">{fmt(selection.price)}</span></div>
            <div className={`text-xs ${selection.contiguous ? 'text-muted-foreground' : 'text-amber-700'}`}>{selection.contiguous ? `${fmtDate(selection.checkIn)} → ${fmtDate(selection.checkOut)}` : 'Select consecutive nights only'}</div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setSelected(null)} aria-label="Clear selection"><X className="h-4 w-4" /></Button>
          <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" disabled={!selection.contiguous} onClick={() => navigate(`/bookings/new?room=${selection.room.id}&checkIn=${selection.checkIn}&checkOut=${selection.checkOut}`)}><Plus className="mr-1 h-4 w-4" /> Book selected</Button>
        </div>
      )}

      {/* ── Booking detail sheet ──────────────────────────────────────── */}
      {active && createPortal(
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/20 md:bg-transparent" onClick={() => setActive(null)} />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border bg-white p-4 md:inset-auto md:bottom-6 md:right-6 md:w-[380px] md:rounded-2xl" style={{ boxShadow: 'var(--shadow-dialog)' }}>
            <div className="flex items-start gap-3">
              <InitialsAvatar name={active.guestName} className="h-11 w-11 !rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><p className="truncate text-base font-bold">{active.guestName}</p>
                  <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_META[active.status]?.cls ?? ''}`}><span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[active.status]?.dot ?? ''}`} />{STATUS_META[active.status]?.label ?? active.status}</span>
                </div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{active.guestPhone} · <span className="font-mono text-primary">{active.invoiceLabel}</span></p>
              </div>
              <button type="button" onClick={() => setActive(null)} className="rounded-md p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-muted/50 p-2"><dt className="text-[11px] text-muted-foreground">Stay</dt><dd className="font-medium">{fmtDate(active.checkInDate, { day: '2-digit', month: 'short' })} → {fmtDate(active.checkOutDate, { day: '2-digit', month: 'short' })}<span className="text-muted-foreground"> · {active.nights}n</span></dd></div>
              <div className="rounded-lg bg-muted/50 p-2"><dt className="text-[11px] text-muted-foreground">Amount</dt><dd className="font-semibold tabular-nums">{fmt(active.totalAmount)}</dd></div>
              <div className="rounded-lg bg-muted/50 p-2"><dt className="text-[11px] text-muted-foreground">Booked by</dt><dd className="font-medium">{active.staffName ?? 'Website'}</dd></div>
              <div className="rounded-lg bg-muted/50 p-2"><dt className="text-[11px] text-muted-foreground">Tags</dt><dd className="flex flex-wrap gap-1">
                {active.isVip && <span className="rounded bg-yellow-100 px-1.5 text-[10px] font-bold text-yellow-800">VIP</span>}
                {active.isForeigner && <span className="rounded bg-sky-100 px-1.5 text-[10px] font-bold text-sky-800">FOREIGNER</span>}
                {active.isStakeholder && <span className="rounded bg-fuchsia-100 px-1.5 text-[10px] font-bold text-fuchsia-800">STAKEHOLDER</span>}
                {active.source === 'WEB' && <span className="rounded bg-violet-100 px-1.5 text-[10px] font-bold text-violet-800">WEBSITE</span>}
                {!active.isVip && !active.isForeigner && !active.isStakeholder && active.source !== 'WEB' && <span className="text-xs text-muted-foreground">—</span>}
              </dd></div>
            </dl>
            <div className="mt-3 flex gap-2">
              <Button size="sm" className="flex-1 bg-blue-600 text-white hover:bg-blue-700" onClick={() => navigate(`/bookings/${active.id}/invoice`)}><FileText className="mr-1 h-4 w-4" /> Invoice</Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/bookings/${active.id}/edit`)}><Pencil className="mr-1 h-4 w-4" /> Edit</Button>
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
};

export default MonthlyCalendar;
