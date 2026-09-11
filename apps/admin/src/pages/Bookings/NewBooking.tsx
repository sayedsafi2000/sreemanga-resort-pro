import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import GuestPicker, { type GuestPick } from '@/components/GuestPicker';
import { Users, Save, Loader2, ArrowLeft, Check, Star, Crown, Globe2, X, Wallet, Info, Handshake, BedDouble, CalendarDays, Mail } from 'lucide-react';
import {
  type Booking, type Room, type CellState, STATE_META, TYPE_LABEL, PAY_METHODS, METHOD_LABEL,
  fmt, fmtDate, todayYmd, addDaysYmd, nightsBetween, facilitiesOf, errMsg,
} from './shared';

type AvailRoom = Room & {
  state: Exclude<CellState, 'SELECTED'>;
  conflicts: { id: string; invoiceLabel: string; status: string; guestName: string; checkInDate: string; checkOutDate: string }[];
};
type Line = { rate: string; extraPersons: number; discount: string };
type PayMode = 'NONE' | 'ADVANCE' | 'FULL';
const round2 = (n: number) => Math.round(n * 100) / 100;
const GENDERS = [['MALE', 'Male'], ['FEMALE', 'Female'], ['OTHER', 'Other']] as const;

const NewBooking: React.FC = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const [sp] = useSearchParams();
  const isEdit = Boolean(editId);

  // Stay
  const [checkIn, setCheckIn] = useState(sp.get('checkIn') || todayYmd());
  const [checkOut, setCheckOut] = useState(sp.get('checkOut') || addDaysYmd(sp.get('checkIn') || todayYmd(), 1));
  const nights = nightsBetween(checkIn, checkOut);
  const datesValid = Boolean(checkIn && checkOut && checkOut > checkIn);

  // Rooms
  const [rooms, setRooms] = useState<AvailRoom[]>([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [availError, setAvailError] = useState<string | null>(null);
  const [tab, setTab] = useState<string>('ALL');
  const [selected, setSelected] = useState<string[]>(sp.get('room') ? [sp.get('room')!] : []);
  const [lines, setLines] = useState<Record<string, Line>>({});
  const [facilityRoomId, setFacilityRoomId] = useState<string | null>(sp.get('room'));

  // Booking details
  const [bookingType, setBookingType] = useState<'CONFIRMED' | 'PENDING'>('CONFIRMED');
  const [sendEmail, setSendEmail] = useState(true);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [extraCharge, setExtraCharge] = useState('');
  const [extraChargeNote, setExtraChargeNote] = useState('');
  const [notes, setNotes] = useState('');

  // Customer
  const [picked, setPicked] = useState<GuestPick | null>(null);
  const [gName, setGName] = useState(''); const [gPhone, setGPhone] = useState(''); const [gEmail, setGEmail] = useState('');
  const [gAddress, setGAddress] = useState(''); const [gNid, setGNid] = useState(''); const [gGender, setGGender] = useState(''); const [gDob, setGDob] = useState('');
  const [isVip, setIsVip] = useState(false); const [isForeigner, setIsForeigner] = useState(false);

  // Payment
  const [payMode, setPayMode] = useState<PayMode>('ADVANCE');
  const [advAmount, setAdvAmount] = useState('');
  const [advMethod, setAdvMethod] = useState<string>('CASH');
  const [advTxn, setAdvTxn] = useState('');
  const [advNote, setAdvNote] = useState('');

  const [editing, setEditing] = useState<Booking | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Edit mode: prefill from the booking ───────────────────────────────
  useEffect(() => {
    if (!editId) return;
    api.get(`/bookings/${editId}`).then((r) => {
      const b: Booking = r.data.booking;
      setEditing(b);
      setCheckIn(b.checkInDate.slice(0, 10)); setCheckOut(b.checkOutDate.slice(0, 10));
      setSelected([b.roomId]); setFacilityRoomId(b.roomId);
      setLines({ [b.roomId]: { rate: String(b.rate ?? b.room.price), extraPersons: b.extraPersons, discount: String(b.staffDiscount) } });
      setBookingType(b.status === 'PENDING' ? 'PENDING' : 'CONFIRMED');
      setAdults(b.adults); setChildren(b.children);
      setExtraCharge(b.extraCharge ? String(b.extraCharge) : ''); setExtraChargeNote(b.extraChargeNote ?? ''); setNotes(b.notes ?? '');
      setGName(b.guest.name); setGPhone(b.guest.phone); setGEmail(b.guest.email ?? ''); setGAddress(b.guest.address ?? ''); setGNid(b.guest.nid ?? '');
      setGGender(b.guest.gender ?? ''); setGDob(b.guest.dateOfBirth ? b.guest.dateOfBirth.slice(0, 10) : '');
      setIsVip(b.isVip); setIsForeigner(b.isForeigner); setSendEmail(false); setPayMode('NONE');
    }).catch((e) => setError(errMsg(e, 'Could not load the booking')));
  }, [editId]);

  // ── Availability for the chosen stay ─────────────────────────────────
  useEffect(() => {
    if (!datesValid) return;
    let cancelled = false;
    setAvailLoading(true); setAvailError(null);
    const params = new URLSearchParams({ checkIn, checkOut });
    if (editId) params.set('excludeBookingId', editId);
    api.get(`/bookings/room-availability?${params}`)
      .then((r) => {
        if (cancelled) return;
        const list = unwrapList<AvailRoom>(r, ['rooms']);
        setRooms(list);
        // Drop selections that are no longer free for the new dates.
        setSelected((cur) => cur.filter((id) => list.find((x) => x.id === id)?.state === 'AVAILABLE'));
      })
      .catch((e) => { if (!cancelled) setAvailError(errMsg(e, 'Could not load availability')); })
      .finally(() => { if (!cancelled) setAvailLoading(false); });
    return () => { cancelled = true; };
  }, [checkIn, checkOut, datesValid, editId]);

  const types = useMemo(() => ['ALL', ...Array.from(new Set(rooms.map((r) => r.type)))], [rooms]);
  const visibleRooms = rooms.filter((r) => tab === 'ALL' || r.type === tab);
  const selectedRooms = selected.map((id) => rooms.find((r) => r.id === id)).filter((r): r is AvailRoom => Boolean(r));
  const facilityRoom = rooms.find((r) => r.id === facilityRoomId) ?? selectedRooms[selectedRooms.length - 1] ?? null;

  const lineOf = (r: AvailRoom): Line => lines[r.id] ?? { rate: String(r.price), extraPersons: 0, discount: '0' };
  const setLine = (id: string, patch: Partial<Line>, room: AvailRoom) => setLines((cur) => ({ ...cur, [id]: { ...lineOf(room), ...(cur[id] ?? {}), ...patch } }));
  const priceOf = (r: AvailRoom) => {
    const l = lineOf(r);
    const rate = Math.max(0, Number(l.rate) || 0);
    const extra = round2(l.extraPersons * (r.extraGuestCharge ?? 0) * nights);
    const gross = round2(rate * nights + extra);
    const discount = Math.min(gross, Math.max(0, Number(l.discount) || 0));
    return { rate, extra, gross, discount, amount: round2(gross - discount) };
  };
  const roomCharges = round2(selectedRooms.reduce((s, r) => s + priceOf(r).gross, 0));
  const discountTotal = round2(selectedRooms.reduce((s, r) => s + priceOf(r).discount, 0));
  const extraChargeNum = Math.max(0, Number(extraCharge) || 0);
  const total = round2(roomCharges - discountTotal + extraChargeNum);
  const advance = isEdit ? 0 : payMode === 'FULL' ? total : payMode === 'ADVANCE' ? Math.max(0, Number(advAmount) || 0) : 0;
  const due = round2(Math.max(0, total - advance));

  const toggleRoom = (r: AvailRoom) => {
    setFacilityRoomId(r.id);
    if (r.state !== 'AVAILABLE' && !(isEdit && editing?.roomId === r.id)) return;
    if (isEdit) { setSelected([r.id]); return; }
    setSelected((cur) => (cur.includes(r.id) ? cur.filter((x) => x !== r.id) : [...cur, r.id]));
  };
  const pickGuest = (g: GuestPick | null) => {
    setPicked(g);
    if (g) { setGName(g.name ?? ''); setGPhone(g.phone ?? g.shareholder?.phone ?? ''); setGEmail(g.email ?? g.shareholder?.email ?? g.user?.email ?? ''); }
  };
  const existingGuestId = picked && !picked.id.includes(':') ? picked.id : null;

  const validate = (): string | null => {
    if (!datesValid) return 'Check-out must be after check-in';
    if (selectedRooms.length === 0) return 'Select at least one available room';
    if (!existingGuestId) {
      if (gName.trim().length < 2) return 'Guest name is required';
      if (gPhone.replace(/\D/g, '').length < 10) return 'Guest phone must be at least 10 digits';
    }
    if (gEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gEmail)) return 'Enter a valid email';
    if (sendEmail && !gEmail && !isEdit) return 'Add the guest email or untick "Send confirmation email"';
    if (advance > total + 0.005) return `Advance (${fmt(advance)}) exceeds the total (${fmt(total)})`;
    for (const r of selectedRooms) if (priceOf(r).rate <= 0) return `Enter a nightly rate for ${r.name}`;
    return null;
  };

  const guestPayload = () => ({
    ...(existingGuestId ? { guestId: existingGuestId } : {}),
    guestName: gName.trim(), guestPhone: gPhone.trim(), guestEmail: gEmail.trim(),
    guestNid: gNid.trim() || null, guestAddress: gAddress.trim() || null, guestGender: gGender || null, guestDob: gDob || null,
  });

  const save = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true); setError(null);
    try {
      if (isEdit && editing) {
        const r = selectedRooms[0]; const p = priceOf(r);
        const keepStatus = !['PENDING', 'CONFIRMED'].includes(editing.status);
        await api.put(`/bookings/${editing.id}`, {
          roomId: r.id, checkInDate: checkIn, checkOutDate: checkOut, adults, children,
          extraPersons: lineOf(r).extraPersons, rate: p.rate, staffDiscount: p.discount,
          extraCharge: extraChargeNum, extraChargeNote: extraChargeNote.trim() || null,
          isVip, isForeigner, notes: notes.trim() || null,
          ...(keepStatus ? {} : { status: bookingType }),
          guest: { name: gName.trim(), phone: gPhone.trim(), email: gEmail.trim(), nid: gNid.trim() || null, address: gAddress.trim() || null, gender: gGender || null, dateOfBirth: gDob || null },
        });
        navigate(`/bookings/${editing.id}/invoice`);
        return;
      }
      // One invoice per room; the advance is split in proportion to each room's total.
      const created: { id: string; invoiceLabel: string }[] = [];
      let guestId: string | undefined = existingGuestId ?? undefined;
      let advanceLeft = advance;
      for (let i = 0; i < selectedRooms.length; i++) {
        const r = selectedRooms[i]; const p = priceOf(r); const l = lineOf(r);
        const thisTotal = round2(p.amount + (i === 0 ? extraChargeNum : 0));
        const last = i === selectedRooms.length - 1;
        const thisAdvance = advance > 0 && total > 0 ? (last ? round2(advanceLeft) : Math.min(thisTotal, round2((advance * thisTotal) / total))) : 0;
        advanceLeft = round2(advanceLeft - thisAdvance);
        const res = await api.post('/bookings', {
          roomId: r.id, checkInDate: checkIn, checkOutDate: checkOut, adults, children,
          extraPersons: l.extraPersons, rate: p.rate, staffDiscount: p.discount,
          extraCharge: i === 0 ? extraChargeNum : 0, extraChargeNote: i === 0 ? extraChargeNote.trim() || null : null,
          isVip, isForeigner, status: bookingType, notes: notes.trim() || undefined, sendEmail,
          ...(guestId ? { guestId, guestName: gName.trim(), guestPhone: gPhone.trim(), guestEmail: gEmail.trim(), guestNid: gNid.trim() || null, guestAddress: gAddress.trim() || null, guestGender: gGender || null, guestDob: gDob || null } : guestPayload()),
          ...(thisAdvance > 0 ? { advance: { amount: thisAdvance, method: advMethod, transactionId: advTxn.trim() || null, notes: advNote.trim() || null } } : {}),
        });
        const b = res.data?.booking;
        created.push({ id: b.id, invoiceLabel: b.invoiceLabel });
        guestId = b.guestId;
      }
      if (created.length === 1) navigate(`/bookings/${created[0].id}/invoice`);
      else navigate(`/bookings?created=${encodeURIComponent(created.map((c) => c.invoiceLabel).join(', '))}`);
    } catch (e: any) { setError(errMsg(e, 'Failed to save the booking')); }
    finally { setSaving(false); }
  };

  const RoomCard = ({ r }: { r: AvailRoom }) => {
    const isSel = selected.includes(r.id);
    const own = isEdit && editing?.roomId === r.id;
    const state: CellState = isSel ? 'SELECTED' : own ? 'AVAILABLE' : r.state;
    const disabled = !isSel && !own && r.state !== 'AVAILABLE';
    const meta = STATE_META[state];
    return (
      <button type="button" onClick={() => toggleRoom(r)} disabled={disabled && !own}
        className={`relative flex min-h-[104px] flex-col rounded-xl border-2 p-3 text-left transition ${meta.card} ${disabled ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'} ${facilityRoomId === r.id && !isSel ? 'ring-2 ring-primary/40' : ''}`}>
        {isSel && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-emerald-600"><Check className="h-3.5 w-3.5" /></span>}
        <div className="pr-6 text-sm font-bold leading-tight">{r.name}</div>
        <div className={`text-[11px] ${isSel || r.state !== 'AVAILABLE' ? 'opacity-90' : 'text-muted-foreground'}`}>{TYPE_LABEL[r.type] ?? r.type}</div>
        <div className="mt-auto flex items-center justify-between pt-2 text-xs">
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{r.capacity}</span>
          <span className="font-semibold">{fmt(r.price)}<span className="font-normal opacity-80">/night</span></span>
        </div>
        {r.state !== 'AVAILABLE' && !own && (
          <div className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wide opacity-90">{meta.label}{r.conflicts[0] ? ` · ${r.conflicts[0].guestName}` : ''}</div>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={isEdit ? <>Edit booking {editing && <span className="font-mono text-primary">{editing.invoiceLabel}</span>}</> : 'New Booking'}
        description={isEdit ? 'Change dates, room, guests, pricing or guest details. Availability is re-checked on save.' : 'Pick the stay, choose rooms, enter the guest and any advance — each room gets its own invoice.'}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
            <Button variant="booking" onClick={save} disabled={saving || selectedRooms.length === 0}>{saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} {isEdit ? 'Save changes' : bookingType === 'PENDING' ? 'Save reservation' : 'Save booking'}</Button>
          </>
        }
      />
      {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        {/* ── Left: stay + rooms ─────────────────────────────────────── */}
        <div className="min-w-0 space-y-4">
          <Card><CardContent className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div className="min-w-0"><Label className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Check-in</Label><Input className="min-w-0" type="date" value={checkIn} min={isEdit ? undefined : todayYmd()} onChange={(e) => { setCheckIn(e.target.value); if (e.target.value >= checkOut) setCheckOut(addDaysYmd(e.target.value, 1)); }} /></div>
              <div className="min-w-0"><Label className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Check-out</Label><Input className="min-w-0" type="date" value={checkOut} min={addDaysYmd(checkIn, 1)} onChange={(e) => setCheckOut(e.target.value)} /></div>
              <div className="flex items-end"><div className="rounded-lg bg-primary/10 px-3 py-2 text-center text-sm font-semibold text-primary">{datesValid ? `${nights} night${nights === 1 ? '' : 's'}` : 'Invalid dates'}</div></div>
            </div>
            <p className="break-words rounded-lg bg-slate-50 px-3 py-2 text-sm"><BedDouble className="mr-1 inline h-4 w-4 text-primary" /> Stay: <span className="font-semibold">{fmtDate(checkIn)} → {fmtDate(checkOut)}</span>{datesValid && <span className="text-muted-foreground"> · checkout day is free for the next guest</span>}</p>
            <div className="flex flex-wrap gap-2 text-[11px]">
              {(['AVAILABLE', 'SELECTED', 'RESERVED', 'BOOKED', 'BLOCKED'] as CellState[]).map((s) => <span key={s} className={`rounded-md px-2 py-1 font-semibold ${STATE_META[s].chip}`}>{STATE_META[s].label}</span>)}
            </div>
            <div className="flex flex-wrap gap-1 border-b">
              {types.map((t) => <button key={t} type="button" onClick={() => setTab(t)} className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{t === 'ALL' ? 'All rooms' : TYPE_LABEL[t] ?? t}</button>)}
            </div>
            {availError && <p className="text-sm text-rose-700">{availError}</p>}
            {availLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {visibleRooms.map((r) => <RoomCard key={r.id} r={r} />)}
                {visibleRooms.length === 0 && <p className="col-span-full py-6 text-center text-sm text-muted-foreground">No rooms in this category.</p>}
              </div>
            )}
          </CardContent></Card>

          {facilityRoom && (
            <Card><CardContent className="p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold"><Star className="h-4 w-4 text-amber-500" /> {facilityRoom.name} — facilities</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {facilitiesOf(facilityRoom).map((f) => <span key={f} className="rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-200/70"><Check className="mr-1 inline h-3 w-3" />{f}</span>)}
                {facilitiesOf(facilityRoom).length === 0 && <span className="text-xs text-muted-foreground">No facilities listed for this room.</span>}
              </div>
              {facilityRoom.conflicts?.length > 0 && !(isEdit && editing?.roomId === facilityRoom.id) && (
                <div className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900"><Info className="mr-1 inline h-3.5 w-3.5" />Conflicting: {facilityRoom.conflicts.map((c) => `${c.invoiceLabel} ${c.guestName} (${fmtDate(c.checkInDate)}→${fmtDate(c.checkOutDate)})`).join(', ')}</div>
              )}
            </CardContent></Card>
          )}
        </div>

        {/* ── Right: booking details, customer, payment ─────────────── */}
        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden"><CardContent className="p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-white">
              <h3 className="text-sm font-semibold">Booking details</h3>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="flex cursor-pointer items-center gap-1.5"><input type="radio" name="btype" checked={bookingType === 'CONFIRMED'} onChange={() => setBookingType('CONFIRMED')} disabled={isEdit && editing ? !['PENDING', 'CONFIRMED'].includes(editing.status) : false} /> Booking</label>
                <label className="flex cursor-pointer items-center gap-1.5"><input type="radio" name="btype" checked={bookingType === 'PENDING'} onChange={() => setBookingType('PENDING')} disabled={isEdit && editing ? !['PENDING', 'CONFIRMED'].includes(editing.status) : false} /> Reservation</label>
                {!isEdit && <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} /><Mail className="h-3.5 w-3.5" /> Send confirmation email</label>}
              </div>
            </div>
            <div className="space-y-3 p-4">
              {selectedRooms.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Select one or more available rooms on the left.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="py-1">Room</th><th className="py-1 text-center">Nights</th><th className="py-1">Rate/night</th><th className="py-1">Extra person</th><th className="py-1">Discount</th><th className="py-1 text-right">Amount</th><th /></tr></thead>
                    <tbody>
                      {selectedRooms.map((r) => { const l = lineOf(r); const p = priceOf(r); return (
                        <tr key={r.id} className="border-t">
                          <td className="py-2 font-semibold">{r.name}<div className="text-[10px] font-normal text-muted-foreground">{TYPE_LABEL[r.type] ?? r.type}</div></td>
                          <td className="py-2 text-center tabular-nums">{nights}</td>
                          <td className="py-2"><Input type="number" min={0} className="h-8 w-24" value={l.rate} onChange={(e) => setLine(r.id, { rate: e.target.value }, r)} /></td>
                          <td className="py-2">
                            <Select value={String(l.extraPersons)} onValueChange={(v) => setLine(r.id, { extraPersons: Number(v) }, r)}>
                              <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                              <SelectContent>{[0, 1, 2, 3, 4].map((n) => <SelectItem key={n} value={String(n)}>{n === 0 ? '—' : `+${n}${r.extraGuestCharge ? ` (${fmt(r.extraGuestCharge)})` : ''}`}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="py-2"><Input type="number" min={0} className="h-8 w-24" value={l.discount} onChange={(e) => setLine(r.id, { discount: e.target.value }, r)} /></td>
                          <td className="py-2 text-right font-semibold tabular-nums">{fmt(p.amount)}</td>
                          <td className="py-2 text-right">{!isEdit && <button type="button" className="text-muted-foreground hover:text-rose-600" onClick={() => setSelected((c) => c.filter((x) => x !== r.id))}><X className="h-4 w-4" /></button>}</td>
                        </tr>
                      ); })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <div><Label>Extra charge note</Label><Input value={extraChargeNote} onChange={(e) => setExtraChargeNote(e.target.value)} placeholder="e.g. BBQ dinner, early check-in" /></div>
                <div><Label>Extra charge (৳)</Label><Input type="number" min={0} value={extraCharge} onChange={(e) => setExtraCharge(e.target.value)} placeholder="0" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Adults</Label><Input type="number" min={1} max={20} value={adults} onChange={(e) => setAdults(Math.max(1, Number(e.target.value) || 1))} /></div>
                <div><Label className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Children</Label><Input type="number" min={0} max={20} value={children} onChange={(e) => setChildren(Math.max(0, Number(e.target.value) || 0))} /></div>
              </div>
              <dl className="overflow-hidden rounded-xl border text-sm">
                <div className="flex justify-between px-3 py-1.5"><dt>Room charges</dt><dd className="tabular-nums">{fmt(roomCharges)}</dd></div>
                {extraChargeNum > 0 && <div className="flex justify-between px-3 py-1.5"><dt>Extra charge</dt><dd className="tabular-nums">{fmt(extraChargeNum)}</dd></div>}
                {discountTotal > 0 && <div className="flex justify-between px-3 py-1.5 text-rose-700"><dt>Discount</dt><dd className="tabular-nums">− {fmt(discountTotal)}</dd></div>}
                <div className="flex justify-between bg-emerald-600 px-3 py-2 font-bold text-white"><dt>Invoice total</dt><dd className="tabular-nums">{fmt(total)}</dd></div>
                {isEdit && editing ? (
                  <>
                    <div className="flex justify-between bg-teal-600 px-3 py-1.5 text-white"><dt>Paid so far</dt><dd className="tabular-nums">{fmt(editing.paid)}</dd></div>
                    <div className="flex justify-between bg-amber-400 px-3 py-1.5 font-semibold text-amber-950"><dt>Due after save</dt><dd className="tabular-nums">{fmt(Math.max(0, total - editing.paid))}</dd></div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between bg-teal-600 px-3 py-1.5 text-white"><dt>Advance</dt><dd className="tabular-nums">{fmt(advance)}</dd></div>
                    <div className="flex justify-between bg-amber-400 px-3 py-1.5 font-semibold text-amber-950"><dt>Due</dt><dd className="tabular-nums">{fmt(due)}</dd></div>
                  </>
                )}
              </dl>
              {selectedRooms.length > 1 && <p className="text-xs text-muted-foreground"><Info className="mr-1 inline h-3.5 w-3.5" />{selectedRooms.length} rooms → {selectedRooms.length} invoices. Extra charge goes on the first room; the advance is split in proportion to each room's total.</p>}
              <div><Label>Additional notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special requirements, arrival time, requests…" /></div>
            </div>
          </CardContent></Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="overflow-hidden"><CardContent className="p-0">
              <h3 className="border-l-4 border-teal-500 bg-slate-50 px-4 py-2.5 text-sm font-semibold">Customer information</h3>
              <div className="space-y-3 p-4">
                {!isEdit && (
                  <div>
                    <GuestPicker value={picked} onChange={pickGuest} label="Find existing guest (phone / name / email)" />
                    {picked && (
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded bg-teal-50 px-2 py-0.5 font-semibold text-teal-800">{existingGuestId ? 'Existing guest — details below update their record' : 'Known contact — a guest record will be created'}</span>
                        {picked.shareholder && <span className="flex items-center gap-1 rounded bg-fuchsia-100 px-2 py-0.5 font-semibold text-fuchsia-800"><Handshake className="h-3 w-3" /> Stakeholder</span>}
                        <button type="button" className="underline" onClick={() => pickGuest(null)}>new guest instead</button>
                      </div>
                    )}
                  </div>
                )}
                <div><Label>Mobile no *</Label><Input value={gPhone} onChange={(e) => setGPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" /></div>
                <div><Label>Guest name *</Label><Input value={gName} onChange={(e) => setGName(e.target.value)} /></div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={isVip} onChange={(e) => setIsVip(e.target.checked)} /><Crown className="h-4 w-4 text-yellow-500" /> VIP booking</label>
                  <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={isForeigner} onChange={(e) => setIsForeigner(e.target.checked)} /><Globe2 className="h-4 w-4 text-sky-600" /> Foreigner guest</label>
                </div>
                <div><Label>Email{!isEdit && sendEmail ? ' *' : ''}</Label><Input type="email" value={gEmail} onChange={(e) => setGEmail(e.target.value)} placeholder="guest@example.com" /></div>
                <div><Label>Address</Label><Textarea rows={2} value={gAddress} onChange={(e) => setGAddress(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>NID / Passport</Label><Input value={gNid} onChange={(e) => setGNid(e.target.value)} /></div>
                  <div>
                    <Label>Gender</Label>
                    <Select value={gGender || 'none'} onValueChange={(v) => setGGender(v === 'none' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent><SelectItem value="none">—</SelectItem>{GENDERS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="min-w-0"><Label>Birth date</Label><Input className="min-w-0" type="date" value={gDob} onChange={(e) => setGDob(e.target.value)} /></div>
              </div>
            </CardContent></Card>

            <Card className="overflow-hidden"><CardContent className="p-0">
              <h3 className="flex items-center gap-2 border-l-4 border-emerald-500 bg-slate-50 px-4 py-2.5 text-sm font-semibold"><Wallet className="h-4 w-4" /> Payment details</h3>
              {isEdit && editing ? (
                <div className="space-y-2 p-4 text-sm">
                  <p>Payments are recorded on the invoice page, so edits here never touch money.</p>
                  <div className="rounded-lg bg-slate-50 p-3"><div className="flex justify-between"><span>Paid</span><span className="font-semibold text-emerald-700">{fmt(editing.paid)}</span></div><div className="flex justify-between"><span>Due now</span><span className="font-semibold text-rose-700">{fmt(editing.due)}</span></div></div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/bookings/${editing.id}/invoice`)}><Wallet className="mr-1 h-4 w-4" /> Open invoice / collect due</Button>
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  <div>
                    <Label>Payment type</Label>
                    <Select value={payMode} onValueChange={(v) => setPayMode(v as PayMode)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="ADVANCE">Advance</SelectItem><SelectItem value="FULL">Full payment</SelectItem><SelectItem value="NONE">No payment now</SelectItem></SelectContent>
                    </Select>
                  </div>
                  {payMode !== 'NONE' && (
                    <>
                      <div><Label>{payMode === 'FULL' ? 'Amount (full)' : 'Advance amount (৳)'}</Label><Input type="number" min={0} value={payMode === 'FULL' ? String(total) : advAmount} disabled={payMode === 'FULL'} onChange={(e) => setAdvAmount(e.target.value)} placeholder={total ? `up to ${total}` : '0'} /></div>
                      <div>
                        <Label>Fund</Label>
                        <Select value={advMethod} onValueChange={setAdvMethod}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{PAY_METHODS.map((m) => <SelectItem key={m} value={m}>{METHOD_LABEL[m]}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Transaction ID</Label><Input value={advTxn} onChange={(e) => setAdvTxn(e.target.value)} placeholder={advMethod === 'CASH' ? 'optional' : 'e.g. bKash TrxID'} /></div>
                      <div><Label>Payment note</Label><Input value={advNote} onChange={(e) => setAdvNote(e.target.value)} placeholder="Payment reference…" /></div>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground">Payment date is recorded as today. A reservation without advance stays in the Reserved list until confirmed.</p>
                </div>
              )}
            </CardContent></Card>
          </div>

          <div className="flex justify-end">
            <Button size="lg" variant="booking" onClick={save} disabled={saving || selectedRooms.length === 0}>{saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} {isEdit ? 'Save changes' : bookingType === 'PENDING' ? 'Save reservation' : 'Save booking'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewBooking;
