import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Plus, Search, Copy, Check, FileText, Pencil, Trash2, Banknote, LogIn, LogOut, CalendarDays, Crown, Globe2, Handshake, MonitorSmartphone,
  Loader2, ChevronLeft, ChevronRight, ChevronDown, MoreHorizontal, Filter, BedDouble, User, Phone, Hash, Inbox, CheckCircle2, Ban, ReceiptText,
  DollarSign, Percent, Calculator, Wallet, AlertTriangle, Settings2, Clock, RotateCcw,
} from 'lucide-react';
import DueCollectDialog from './DueCollectDialog';
import { type Booking, type Room, STATUS_META, fmt, fmtDate, copyText, errMsg, resortTitle } from './shared';

type Props = { mode?: 'all' | 'reserved' };
type Stats = Record<string, number>;
type Filters = { from: string; to: string; name: string; phone: string; invoice: string; status: string; room: string; flag: string };
const PAGE = 20;
const STATUS_OPTIONS = [
  { key: '', label: 'All statuses' }, { key: 'CONFIRMED', label: 'Booked' }, { key: 'PENDING', label: 'Reserved' },
  { key: 'CHECKED_IN', label: 'In-house' }, { key: 'CHECKED_OUT', label: 'Checked-out' }, { key: 'CANCELLED', label: 'Cancelled' },
];
const FLAGS = [
  { key: 'due', label: 'Has due', stat: 'due', Icon: Wallet, on: 'bg-orange-500 text-white', off: 'bg-orange-50 text-orange-800 ring-1 ring-orange-200' },
  { key: 'vip', label: 'VIP', stat: 'vip', Icon: Crown, on: 'bg-yellow-400 text-slate-900', off: 'bg-yellow-50 text-yellow-800 ring-1 ring-yellow-200' },
  { key: 'foreigner', label: 'Foreigner', stat: 'foreigner', Icon: Globe2, on: 'bg-orange-600 text-white', off: 'bg-orange-50 text-orange-900 ring-1 ring-orange-200' },
  { key: 'stakeholder', label: 'Stakeholder', stat: 'stakeholder', Icon: Handshake, on: 'bg-green-600 text-white', off: 'bg-green-50 text-green-800 ring-1 ring-green-200' },
  { key: 'web', label: 'Website', stat: 'web', Icon: MonitorSmartphone, on: 'bg-violet-600 text-white', off: 'bg-violet-50 text-violet-800 ring-1 ring-violet-200' },
];
const ymd = (d?: string) => fmtDate(d, { day: '2-digit', month: '2-digit', year: 'numeric' });
const money = (n: number) => (n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const discountOf = (b: Booking) => (b.pricing?.voucherDiscount ?? 0) + (b.pricing?.staffDiscount ?? 0);
const grossOf = (b: Booking) => b.pricing?.gross ?? b.totalAmount + discountOf(b);
const dueOf = (b: Booking) => (b.status === 'CANCELLED' ? 0 : b.due);
const canCollect = (b: Booking) => b.due > 0 && b.status !== 'CANCELLED';
const hasStatusActions = (b: Booking) => b.status === 'PENDING' || b.status === 'CONFIRMED' || b.status === 'CHECKED_IN';

// ── Presentational pieces (module-level so they keep identity across renders — an inline
//    component would remount its inputs/menus on every keystroke) ──────────────────────
type Tone = 'navy' | 'red' | 'green' | 'grey';
const TONE: Record<Tone, string> = { navy: 'bg-slate-800 text-white', red: 'bg-red-600 text-white', green: 'bg-emerald-600 text-white', grey: 'bg-slate-200 text-slate-600' };
/** Solid coloured amount pill — the resortsbd look. */
const Pill: React.FC<{ tone: Tone; children: React.ReactNode; className?: string }> = ({ tone, children, className = '' }) => (
  <span className={`inline-block rounded-md px-2 py-1 text-[11px] font-bold tabular-nums shadow-sm min-[1700px]:px-2.5 min-[1700px]:text-xs ${TONE[tone]} ${className}`}>{children}</span>
);
const amountCells = (b: Booking): { l: string; v: number; tone: Tone }[] => [
  { l: 'Amount', v: grossOf(b), tone: 'navy' },
  { l: 'Discount', v: discountOf(b), tone: discountOf(b) > 0 ? 'red' : 'grey' },
  { l: 'Total', v: b.totalAmount, tone: 'green' },
  { l: 'Paid', v: b.paid, tone: b.paid > 0 ? 'green' : 'grey' },
  { l: 'Due', v: dueOf(b), tone: dueOf(b) > 0 ? 'red' : 'grey' },
];
const StatusPill: React.FC<{ s: string }> = ({ s }) => {
  const m = STATUS_META[s] ?? { label: s, cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
  return <span className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${m.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />{m.label}</span>;
};
const Flags: React.FC<{ b: Booking }> = ({ b }) => (
  <>
    {b.isVip && <span title="VIP" className="inline-flex items-center gap-0.5 rounded bg-yellow-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-900"><Crown className="h-3 w-3" />VIP</span>}
    {b.isForeigner && <span title="Foreigner" className="inline-flex items-center gap-0.5 rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white"><Globe2 className="h-3 w-3" />Foreigner</span>}
    {b.isStakeholder && <span title="Stakeholder" className="inline-flex items-center gap-0.5 rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-bold text-white"><Handshake className="h-3 w-3" />Stakeholder</span>}
    {b.source === 'WEB' && <span title="Booked on the website" className="inline-flex items-center gap-0.5 rounded bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white"><MonitorSmartphone className="h-3 w-3" />Website</span>}
  </>
);
const Customer: React.FC<{ b: Booking }> = ({ b }) => (
  <div className="min-w-0">
    <p className="truncate text-sm font-bold leading-tight text-slate-900 min-[1700px]:text-[15px]">{b.guest.name}</p>
    <p className="mt-0.5 flex items-center gap-1 whitespace-nowrap text-xs text-slate-600"><Phone className="h-3 w-3" />{b.guest.phone}</p>
  </div>
);
const Details: React.FC<{ b: Booking; resortName: string }> = ({ b, resortName }) => (
  <div className="whitespace-nowrap text-xs leading-5">
    <div className="font-bold text-emerald-700">{ymd(b.checkInDate)} <span className="font-normal text-slate-400">→</span> {ymd(b.checkOutDate)} <span className="font-normal text-slate-500">· {b.nights} night{b.nights === 1 ? '' : 's'}</span></div>
    <div className="font-bold text-emerald-700"><BedDouble className="mr-1 inline h-3 w-3 align-[-2px]" />{b.room.name} <span className="font-normal text-slate-500">· {b.adults}A {b.children}C{b.extraPersons ? ` +${b.extraPersons}` : ''}</span></div>
    <div className="font-bold text-blue-700">{resortName}</div>
  </div>
);
type ActionHandlers = { invoice: (b: Booking) => void; edit: (b: Booking) => void; remove: (b: Booking) => void; due: (b: Booking) => void; copy: (b: Booking) => void; status: (b: Booking, next: string) => void };
/** The resortsbd action strip: square coloured icon buttons. `big` = touch size on cards. */
const Actions: React.FC<{ b: Booking; on: ActionHandlers; copied: boolean; canDelete: boolean; big?: boolean }> = ({ b, on, copied, canDelete, big = false }) => {
  const sz = big ? 'h-10 w-10' : 'h-7 w-7 min-[1700px]:h-8 min-[1700px]:w-8';
  const ic = big ? 'h-4 w-4' : 'h-3.5 w-3.5';
  const base = `inline-flex ${sz} shrink-0 items-center justify-center rounded-md text-white shadow-sm transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:brightness-100`;
  const mayDelete = canDelete || b.status === 'PENDING';
  return (
    <div className={`flex items-center ${big ? 'justify-between gap-2' : 'justify-center gap-1'}`}>
      <button type="button" title="View invoice" aria-label="View invoice" className={`${base} bg-cyan-600`} onClick={() => on.invoice(b)}><FileText className={ic} /></button>
      <button type="button" title="Edit booking" aria-label="Edit booking" className={`${base} bg-blue-600`} onClick={() => on.edit(b)}><Pencil className={ic} /></button>
      <button type="button" title={mayDelete ? 'Delete booking' : 'Only managers can delete confirmed bookings'} aria-label="Delete booking" className={`${base} bg-red-600`} disabled={!mayDelete} onClick={() => on.remove(b)}><Trash2 className={ic} /></button>
      <button type="button" title={canCollect(b) ? `Collect due · ${fmt(b.due)}` : 'Nothing due'} aria-label="Collect due" className={`${base} bg-emerald-600`} disabled={!canCollect(b)} onClick={() => on.due(b)}><Banknote className={ic} /></button>
      <button type="button" title="Copy invoice number" aria-label="Copy invoice number" className={`${base} bg-slate-800`} onClick={() => on.copy(b)}>{copied ? <Check className={ic} /> : <Copy className={ic} />}</button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" title="Change status" aria-label="Change status" className={`${base} bg-slate-500`} disabled={!hasStatusActions(b)}><MoreHorizontal className={ic} /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{b.invoiceLabel} · {STATUS_META[b.status]?.label ?? b.status}</DropdownMenuLabel>
          {b.status === 'PENDING' && <DropdownMenuItem onSelect={() => on.status(b, 'CONFIRMED')}><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Confirm reservation</DropdownMenuItem>}
          {b.status === 'CONFIRMED' && <DropdownMenuItem onSelect={() => on.status(b, 'CHECKED_IN')}><LogIn className="h-4 w-4 text-blue-600" /> Check in guest</DropdownMenuItem>}
          {b.status === 'CHECKED_IN' && <DropdownMenuItem onSelect={() => on.status(b, 'CHECKED_OUT')}><LogOut className="h-4 w-4 text-slate-600" /> Check out guest</DropdownMenuItem>}
          {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (<><DropdownMenuSeparator /><DropdownMenuItem destructive onSelect={() => on.status(b, 'CANCELLED')}><Ban className="h-4 w-4" /> Cancel booking</DropdownMenuItem></>)}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
const Th: React.FC<{ icon: React.ElementType; children: React.ReactNode; className?: string }> = ({ icon: Icon, children, className = '' }) => (
  <th className={`whitespace-nowrap border-r border-slate-700 px-2 py-3 text-center text-xs font-bold text-white last:border-r-0 min-[1700px]:px-3 min-[1700px]:text-[13px] ${className}`}><span className="inline-flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" />{children}</span></th>
);
const Field: React.FC<{ icon: React.ElementType; label: string; children: React.ReactNode; className?: string }> = ({ icon: Icon, label, children, className = '' }) => (
  <label className={`block min-w-0 ${className}`}><span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-800"><Icon className="h-4 w-4 text-slate-600" />{label}</span>{children}</label>
);

const BookingList: React.FC<Props> = ({ mode = 'all' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const canDelete = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [rooms, setRooms] = useState<Room[]>([]);
  const [resortName, setResortName] = useState('Pina Vista');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(sp.get('created') ? `Created ${sp.get('created')}` : null);
  const [copied, setCopied] = useState<string | null>(null);
  const [dueFor, setDueFor] = useState<Booking | null>(null);
  const [page, setPage] = useState(1);

  // Applied filters live in the URL (links / refresh keep them); the form holds a draft until "Search".
  const spKey = sp.toString();
  const applied: Filters = useMemo(() => ({
    from: sp.get('from') ?? '', to: sp.get('to') ?? '', name: sp.get('name') ?? '', phone: sp.get('phone') ?? '', invoice: sp.get('inv') ?? '',
    status: mode === 'reserved' ? 'PENDING' : sp.get('status') ?? '', room: sp.get('room') ?? '', flag: sp.get('flag') ?? '',
  }), [spKey, mode]); // eslint-disable-line react-hooks/exhaustive-deps
  const [draft, setDraft] = useState<Filters>(applied);
  useEffect(() => { setDraft(applied); }, [applied]);
  const hasFilters = Object.entries(applied).some(([k, v]) => v && !(k === 'status' && mode === 'reserved'));
  const [filtersOpen, setFiltersOpen] = useState(() => hasFilters || (typeof window !== 'undefined' && window.innerWidth >= 640));
  const apply = (next: Filters) => {
    const n = new URLSearchParams();
    if (next.from) n.set('from', next.from); if (next.to) n.set('to', next.to); if (next.name) n.set('name', next.name);
    if (next.phone) n.set('phone', next.phone); if (next.invoice) n.set('inv', next.invoice); if (next.room) n.set('room', next.room);
    if (next.flag) n.set('flag', next.flag); if (mode === 'all' && next.status) n.set('status', next.status);
    setSp(n, { replace: true }); setPage(1);
  };
  const reset = () => { setSp(new URLSearchParams(), { replace: true }); setPage(1); };

  useEffect(() => { api.get('/public/settings').then((r) => { const t = resortTitle(r.data?.settings); if (t) setResortName(t); }).catch(() => {}); }, []);
  const load = async () => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams();
      if (applied.name) p.set('name', applied.name); if (applied.phone) p.set('phone', applied.phone); if (applied.invoice) p.set('invoice', applied.invoice);
      if (applied.status) p.set('status', applied.status); if (applied.room) p.set('roomId', applied.room);
      if (applied.from) p.set('from', applied.from); if (applied.to) p.set('to', applied.to);
      if (applied.flag === 'vip') p.set('vip', '1'); if (applied.flag === 'foreigner') p.set('foreigner', '1');
      if (applied.flag === 'stakeholder') p.set('stakeholder', '1'); if (applied.flag === 'web') p.set('source', 'WEB'); if (applied.flag === 'due') p.set('due', '1');
      const [b, r] = await Promise.all([api.get(`/bookings?${p.toString()}`), rooms.length ? Promise.resolve(null) : api.get('/rooms')]);
      setBookings(unwrapList<Booking>(b, ['bookings'])); setStats(b.data?.stats ?? {});
      if (r) setRooms(unwrapList<Room>(r, ['rooms']));
    } catch (e: any) { setError(errMsg(e, 'Failed to load bookings')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [applied]); // eslint-disable-line react-hooks/exhaustive-deps

  const pageRows = useMemo(() => bookings.slice((page - 1) * PAGE, page * PAGE), [bookings, page]);
  const pages = Math.max(1, Math.ceil(bookings.length / PAGE));

  const on: ActionHandlers = {
    invoice: (b) => navigate(`/bookings/${b.id}/invoice`),
    edit: (b) => navigate(`/bookings/${b.id}/edit`),
    due: (b) => setDueFor(b),
    copy: async (b) => { if (await copyText(b.invoiceLabel)) { setCopied(b.id); window.setTimeout(() => setCopied(null), 1500); } },
    status: async (b, next) => {
      if (next === 'CANCELLED' && !window.confirm(`Cancel ${b.invoiceLabel} for ${b.guest.name}?`)) return;
      try { await api.put(`/bookings/${b.id}`, { status: next }); await load(); }
      catch (e: any) { setError(errMsg(e, 'Failed to update status')); }
    },
    remove: async (b) => {
      if (!window.confirm(`Delete ${b.invoiceLabel} (${b.guest.name}, ${b.room.name})? Payments on it are removed too. This cannot be undone.`)) return;
      try { await api.delete(`/bookings/${b.id}`); setNotice(`${b.invoiceLabel} deleted`); await load(); }
      catch (e: any) { setError(errMsg(e, 'Failed to delete')); }
    },
  };

  return (
    <div className="space-y-4">
      {/* ── Title bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-800 px-4 py-3 text-white shadow-md">
        <ReceiptText className="h-6 w-6" />
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight">{mode === 'reserved' ? 'Reserved Bookings' : 'Resort Booking Invoices'}</h1>
          <p className="text-xs text-slate-300">{mode === 'reserved' ? 'Reservations waiting to be confirmed' : 'All room bookings with invoice, payment and due status'}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 bg-white text-slate-800 hover:bg-slate-100" onClick={() => navigate('/bookings/calendar')}><CalendarDays className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Calendar</span></Button>
          <Button size="sm" className="h-8 bg-blue-600 text-white hover:bg-blue-700" onClick={() => navigate('/bookings/new')}><Plus className="mr-1 h-4 w-4" /> New Booking</Button>
        </div>
      </div>

      {/* ── Search & Filter panel ─────────────────────────────────────── */}
      <form className="overflow-hidden rounded-xl border bg-white shadow-md" onSubmit={(e) => { e.preventDefault(); apply(draft); }}>
        <button type="button" className="flex w-full items-center gap-2 bg-slate-800 px-4 py-2.5 text-left text-[15px] font-bold text-white" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen}>
          <Filter className="h-4 w-4" /> Search &amp; Filter Options
          {hasFilters && <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold uppercase">active</span>}
          <ChevronDown className={`ml-auto h-4 w-4 transition ${filtersOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className={`grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4 ${filtersOpen ? '' : 'hidden'}`}>
          <Field icon={CalendarDays} label="Check-in Date Range" className="sm:col-span-2">
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" className="h-11 min-w-0" value={draft.from} max={draft.to || undefined} onChange={(e) => setDraft({ ...draft, from: e.target.value })} aria-label="Start date" />
              <Input type="date" className="h-11 min-w-0" value={draft.to} min={draft.from || undefined} onChange={(e) => setDraft({ ...draft, to: e.target.value })} aria-label="End date" />
            </div>
          </Field>
          <Field icon={User} label="Customer Name"><Input className="h-11" placeholder="Enter customer name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
          <Field icon={Phone} label="Mobile Number"><Input className="h-11" inputMode="tel" placeholder="Enter mobile number" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
          <Field icon={Hash} label="Invoice Number"><Input className="h-11 font-mono" placeholder="INV-00042 or 42" value={draft.invoice} onChange={(e) => setDraft({ ...draft, invoice: e.target.value })} /></Field>
          <Field icon={BedDouble} label="Room">
            <Select value={draft.room || 'all'} onValueChange={(v) => setDraft({ ...draft, room: v === 'all' ? '' : v })}>
              <SelectTrigger className="h-11"><SelectValue placeholder="All rooms" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All rooms</SelectItem>{rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          {mode === 'all' && (
            <Field icon={Clock} label="Status">
              <Select value={draft.status || 'all'} onValueChange={(v) => setDraft({ ...draft, status: v === 'all' ? '' : v })}>
                <SelectTrigger className="h-11"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.key || 'all'} value={o.key || 'all'}>{o.label}{o.key ? ` (${stats[o.key] ?? 0})` : ''}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          )}
          <div className="flex items-end gap-2">
            <Button type="submit" className="h-11 flex-1 bg-emerald-600 px-5 text-[15px] font-bold text-white hover:bg-emerald-700 sm:flex-none"><Search className="mr-2 h-4 w-4" /> Search Invoices</Button>
            {hasFilters && <Button type="button" variant="outline" className="h-11" onClick={reset} title="Reset filters"><RotateCcw className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Reset</span></Button>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t bg-slate-50 px-4 py-2.5">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Quick filters</span>
          {FLAGS.map((f) => {
            const isOn = applied.flag === f.key; const Icon = f.Icon;
            return (
              <button key={f.key} type="button" onClick={() => apply({ ...applied, flag: isOn ? '' : f.key })}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm transition ${isOn ? f.on : f.off}`}>
                <Icon className="h-3.5 w-3.5" />{f.label}<span className={`rounded px-1.5 text-[11px] font-bold tabular-nums ${isOn ? 'bg-black/20' : 'bg-white'}`}>{stats[f.stat] ?? 0}</span>
              </button>
            );
          })}
          <span className="ml-auto text-xs text-slate-500">{loading ? 'Loading…' : `${bookings.length} invoice${bookings.length === 1 ? '' : 's'}${hasFilters ? ' match' : ''}`}</span>
        </div>
      </form>

      {notice && <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><span><CheckCircle2 className="mr-1 inline h-4 w-4" />{notice}</span><button className="text-xs underline" onClick={() => setNotice(null)}>dismiss</button></div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-white px-6 py-14 text-center shadow-md">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Inbox className="h-6 w-6" /></span>
          <p className="font-semibold">No invoices found</p>
          <p className="max-w-sm text-sm text-slate-500">{hasFilters ? 'Try another search or reset the filters.' : 'Create the first booking from the calendar or the New Booking form.'}</p>
          <div className="flex gap-2">{hasFilters && <Button variant="outline" onClick={reset}>Reset filters</Button>}<Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => navigate('/bookings/new')}><Plus className="mr-1 h-4 w-4" /> New Booking</Button></div>
        </div>
      ) : (
        <>
          {/* ── Table from 1400px (fits a 1440 laptop next to the sidebar); roomier + Date column from 1700px. Actions stay pinned on the right if it ever scrolls. ── */}
          <div className="hidden overflow-hidden rounded-xl border shadow-md min-[1400px]:block">
            <div className="overflow-x-auto bg-white">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-800">
                  <tr>
                    <Th icon={Hash} className="text-left">Invoice</Th><Th icon={CalendarDays} className="hidden min-[1700px]:table-cell">Date</Th><Th icon={User} className="text-left">Customer</Th><Th icon={BedDouble} className="text-left">Booking Details</Th>
                    <Th icon={DollarSign}>Amount</Th><Th icon={Percent}>Discount</Th><Th icon={Calculator}>Total</Th><Th icon={Wallet}>Paid</Th><Th icon={AlertTriangle}>Due</Th>
                    <Th icon={Settings2} className="sticky right-0 z-10 bg-slate-800">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((b, i) => (
                    <tr key={b.id} className={`border-b border-slate-100 transition hover:bg-blue-50 ${i % 2 ? 'bg-slate-50' : 'bg-white'} ${b.status === 'CANCELLED' ? 'opacity-60' : ''}`}>
                      <td className="whitespace-nowrap px-2 py-3 align-middle min-[1700px]:px-3">
                        <button type="button" className="font-mono text-sm font-bold text-slate-900 hover:text-blue-700 min-[1700px]:text-[15px]" title="Copy invoice number" onClick={() => on.copy(b)}>{b.invoiceLabel}</button>
                        <div className="mt-1 flex flex-wrap gap-1"><StatusPill s={b.status} /><Flags b={b} /></div>
                        <div className="mt-1 text-[11px] text-slate-500 min-[1700px]:hidden">{ymd(b.createdAt)} · {b.staff?.name ?? 'Website'}</div>
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-3 text-center align-middle text-slate-700 min-[1700px]:table-cell"><div>{ymd(b.createdAt)}</div><div className="text-[11px] text-slate-500">{b.staff?.name ?? 'Website'}</div></td>
                      <td className="max-w-[170px] px-2 py-3 align-middle min-[1700px]:max-w-[220px] min-[1700px]:px-3"><Customer b={b} /></td>
                      <td className="px-2 py-3 align-middle min-[1700px]:px-3"><Details b={b} resortName={resortName} /></td>
                      {amountCells(b).map((c) => <td key={c.l} className="whitespace-nowrap px-1 py-3 text-center align-middle min-[1700px]:px-2"><Pill tone={c.tone}>{money(c.v)}</Pill></td>)}
                      <td className="sticky right-0 whitespace-nowrap bg-inherit px-2 py-3 align-middle shadow-[-10px_0_12px_-12px_rgba(15,23,42,0.45)] min-[1700px]:px-3"><Actions b={b} on={on} copied={copied === b.id} canDelete={canDelete} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Cards: phones, tablets and laptops under 1400px ──────────── */}
          <div className="grid gap-3 md:grid-cols-2 min-[1400px]:hidden">
            {pageRows.map((b) => (
              <div key={b.id} className={`overflow-hidden rounded-xl border bg-white shadow-md ${b.status === 'CANCELLED' ? 'opacity-70' : ''}`}>
                <div className="flex items-center justify-between gap-2 bg-slate-800 px-3 py-2 text-white">
                  <button type="button" className="font-mono text-[15px] font-bold" onClick={() => on.copy(b)}>{copied === b.id ? 'Copied!' : b.invoiceLabel}</button>
                  <span className="flex items-center gap-1 text-xs text-slate-300"><CalendarDays className="h-3.5 w-3.5" />{ymd(b.createdAt)}</span>
                </div>
                <div className="space-y-3 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <Customer b={b} />
                    <div className="flex flex-wrap justify-end gap-1"><StatusPill s={b.status} /><Flags b={b} /></div>
                  </div>
                  <div className="overflow-x-auto"><Details b={b} resortName={resortName} /></div>
                  <div className="grid grid-cols-5 gap-1 text-center">
                    {amountCells(b).map((c) => (
                      <div key={c.l} className="min-w-0">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{c.l}</div>
                        <Pill tone={c.tone} className="w-full truncate !px-1 text-[11px]">{money(c.v)}</Pill>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t pt-3">
                    <span className="hidden text-[11px] text-slate-500 sm:block">{b.staff?.name ?? 'Website'}</span>
                    <div className="flex-1 sm:flex-none"><Actions b={b} on={on} copied={copied === b.id} canDelete={canDelete} big /></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm">
            <span className="text-slate-500">Showing {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, bookings.length)} of {bookings.length}</span>
            {pages > 1 && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /> Previous</Button>
                <span className="text-slate-600">Page {page} / {pages}</span>
                <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
        </>
      )}

      <DueCollectDialog booking={dueFor} onClose={() => setDueFor(null)} onDone={load} />
    </div>
  );
};

export default BookingList;
