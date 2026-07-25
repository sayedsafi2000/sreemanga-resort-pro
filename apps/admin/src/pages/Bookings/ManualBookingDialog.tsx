import { useEffect, useMemo, useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { format, startOfDay } from 'date-fns';
import { BedDouble, CalendarDays, Loader2, Mail, Phone, UserRound, Users } from 'lucide-react';
import 'react-day-picker/style.css';

import api, { getApiBaseUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import GuestPicker, { type GuestPick } from '@/components/GuestPicker';

type RoomRow = { id: string; name: string; price: number; status?: string };
type GuestRow = { id: string; name: string; phone: string; email?: string | null };

type CalendarDay = { date: string; status: string; bookingStatus?: string | null };

const CALENDAR_DAYS = 90;

const ENV_BKASH_NUMBER = import.meta.env.VITE_PUBLIC_BKASH_NUMBER || '017XXXXXXXX';
const ENV_BANK_ACCOUNT_NAME = import.meta.env.VITE_PUBLIC_BANK_ACCOUNT_NAME || 'Resort';
const ENV_BANK_ACCOUNT_NUMBER = import.meta.env.VITE_PUBLIC_BANK_ACCOUNT_NUMBER || '—';
const ENV_BANK_NAME = import.meta.env.VITE_PUBLIC_BANK_NAME || 'Bank';
const ENV_BANK_BRANCH = import.meta.env.VITE_PUBLIC_BANK_BRANCH || 'Sreemangal';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: RoomRow[];
  guests: GuestRow[];
  onSuccess: () => void;
};

export default function ManualBookingDialog({ open, onOpenChange, rooms, guests: _guests, onSuccess }: Props) {
  const [useExistingGuest, setUseExistingGuest] = useState(false);
  const [pickedGuest, setPickedGuest] = useState<GuestPick | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [roomId, setRoomId] = useState(rooms[0]?.id || '');
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [preferredPaymentTiming, setPreferredPaymentTiming] = useState<'INSTANT' | 'LATER'>('LATER');
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<'BKASH' | 'BANK_TRANSFER'>('BKASH');
  const [paymentTransactionId, setPaymentTransactionId] = useState('');
  const [paymentProofImage, setPaymentProofImage] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<'PENDING' | 'CONFIRMED'>('PENDING');
  const [notes, setNotes] = useState('');
  const [calendar, setCalendar] = useState<{ availability: CalendarDay[] } | null>(null);
  const [calLoading, setCalLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherPreview, setVoucherPreview] = useState<{ discountAmount: number; netAmount: number } | null>(null);
  const [voucherChecking, setVoucherChecking] = useState(false);
  const [paymentAccounts, setPaymentAccounts] = useState({
    bkashNumber: ENV_BKASH_NUMBER,
    bankAccountName: ENV_BANK_ACCOUNT_NAME,
    bankAccountNumber: ENV_BANK_ACCOUNT_NUMBER,
    bankName: ENV_BANK_NAME,
    bankBranch: ENV_BANK_BRANCH,
  });

  useEffect(() => {
    if (!open) return;
    // Pull payment account details from public settings; fall back to env vars / placeholders.
    fetch(`${getApiBaseUrl()}/public/settings`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const s = d?.settings || {};
        setPaymentAccounts({
          bkashNumber: s.bkashNumber || ENV_BKASH_NUMBER,
          bankAccountName: s.bankAccountName || ENV_BANK_ACCOUNT_NAME,
          bankAccountNumber: s.bankAccountNumber || ENV_BANK_ACCOUNT_NUMBER,
          bankName: s.bankName || ENV_BANK_NAME,
          bankBranch: s.bankBranch || ENV_BANK_BRANCH,
        });
      })
      .catch(() => {
        /* keep env defaults */
      });
  }, [open]);

  const todayStart = useMemo(() => startOfDay(new Date()), []);

  const bookedDates = useMemo(() => {
    if (!calendar?.availability?.length) return [] as Date[];
    return calendar.availability
      .filter((d) => d.status === 'BOOKED')
      .map((d) => new Date(`${d.date}T12:00:00`));
  }, [calendar]);

  const disabledMatchers = useMemo(
    () => [{ before: todayStart }, ...bookedDates],
    [todayStart, bookedDates]
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setRoomId((id) => id || rooms[0]?.id || '');
  }, [open, rooms]);

  useEffect(() => {
    if (!open || !roomId) {
      setCalendar(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setCalLoading(true);
      try {
        const res = await api.get('/rooms/availability-calendar', {
          params: { roomId, days: CALENDAR_DAYS },
        });
        const data = res.data as { rooms?: { availability?: CalendarDay[] }[] };
        const row = (data.rooms || [])[0];
        if (!cancelled) setCalendar(row?.availability ? { availability: row.availability } : null);
      } catch {
        if (!cancelled) setCalendar(null);
      } finally {
        if (!cancelled) setCalLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, roomId]);

  useEffect(() => {
    setRange(undefined);
  }, [roomId]);

  const selectedRoom = rooms.find((r) => r.id === roomId);
  const nights =
    range?.from && range?.to
      ? Math.max(
          1,
          Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24))
        )
      : 0;
  const previewTotal = selectedRoom && nights > 0 ? selectedRoom.price * nights : 0;

  async function onProofUpload(file: File | undefined) {
    if (!file) {
      setPaymentProofImage(undefined);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Proof must be an image file.');
      return;
    }
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('read'));
      reader.readAsDataURL(file);
    });
    setPaymentProofImage(url);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!roomId) {
      setError('Select a room.');
      return;
    }
    if (!range?.from || !range?.to) {
      setError('Select check-in and check-out on the calendar.');
      return;
    }
    if (useExistingGuest) {
      if (!pickedGuest?.id) {
        setError('Search and select a guest, or switch to new guest and enter name + phone.');
        return;
      }
    } else {
      if (guestName.trim().length < 2 || guestPhone.trim().length < 10) {
        setError('Guest name (2+ chars) and phone (10+ chars) are required.');
        return;
      }
    }
    if (preferredPaymentTiming === 'INSTANT' && paymentTransactionId.trim().length < 4) {
      setError('Transaction ID is required for instant payment (min 4 characters).');
      return;
    }

    const checkInDate = format(range.from, 'yyyy-MM-dd');
    const checkOutDate = format(range.to, 'yyyy-MM-dd');

    const body: Record<string, unknown> = {
      roomId,
      adults,
      children,
      checkInDate,
      checkOutDate,
      status,
      notes: notes.trim() || undefined,
      preferredPaymentTiming,
      preferredPaymentMethod: preferredPaymentTiming === 'INSTANT' ? preferredPaymentMethod : undefined,
      paymentTransactionId: preferredPaymentTiming === 'INSTANT' ? paymentTransactionId.trim() : undefined,
      paymentProofImage: preferredPaymentTiming === 'INSTANT' ? paymentProofImage : undefined,
      ...(voucherCode.trim() ? { voucherCode: voucherCode.trim() } : {}),
    };

    if (useExistingGuest) {
      body.guestId = pickedGuest!.id;
    } else {
      body.guestName = guestName.trim();
      body.guestPhone = guestPhone.trim();
      if (guestEmail.trim()) body.guestEmail = guestEmail.trim();
    }

    setSaving(true);
    try {
      await api.post('/bookings', body);
      onSuccess();
      onOpenChange(false);
      setGuestName('');
      setGuestPhone('');
      setGuestEmail('');
      setPickedGuest(null);
      setRange(undefined);
      setPaymentTransactionId('');
      setPaymentProofImage(undefined);
      setNotes('');
      setPreferredPaymentTiming('LATER');
      setStatus('PENDING');
      setUseExistingGuest(false);
      setVoucherCode('');
      setVoucherPreview(null);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || 'Could not create booking.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New booking (same flow as website)</DialogTitle>
          <p className="text-sm text-muted-foreground">
            রুম, তারিখ, অতিথি ও পেমেন্ট—ওয়েবসাইটের মতোই। চাইলে আগের গেস্ট রেকর্ড লিংক করতে পারবেন। ডিফল্ট স্ট্যাটাস Pending; ফোনে কনফার্ম হলে Confirmed বেছে নিন।
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={useExistingGuest ? 'default' : 'outline'}
              onClick={() => {
                setUseExistingGuest(true);
                setError(null);
              }}
            >
              Search existing guest
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!useExistingGuest ? 'default' : 'outline'}
              onClick={() => {
                setUseExistingGuest(false);
                setPickedGuest(null);
                setError(null);
              }}
            >
              New guest
            </Button>
          </div>

          {useExistingGuest ? (
            <GuestPicker
              value={pickedGuest}
              onChange={setPickedGuest}
              label="Find guest by name, phone, or email"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label className="flex items-center gap-2">
                  <UserRound className="h-4 w-4" aria-hidden />
                  Full name
                </Label>
                <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Guest name" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4" aria-hidden />
                  Phone
                </Label>
                <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+880…" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" aria-hidden />
                  Email (optional)
                </Label>
                <Input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <BedDouble className="h-4 w-4" aria-hidden />
              Room
            </Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger>
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} — ৳{Number(r.price).toLocaleString()}/night ({r.status || '—'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">Payment (website rules)</p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="pay"
                  checked={preferredPaymentTiming === 'LATER'}
                  onChange={() => setPreferredPaymentTiming('LATER')}
                />
                Pay later
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="pay"
                  checked={preferredPaymentTiming === 'INSTANT'}
                  onChange={() => setPreferredPaymentTiming('INSTANT')}
                />
                Instant payment
              </label>
            </div>
            {preferredPaymentTiming === 'INSTANT' && (
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="pm"
                      checked={preferredPaymentMethod === 'BKASH'}
                      onChange={() => setPreferredPaymentMethod('BKASH')}
                    />
                    bKash
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="pm"
                      checked={preferredPaymentMethod === 'BANK_TRANSFER'}
                      onChange={() => setPreferredPaymentMethod('BANK_TRANSFER')}
                    />
                    Bank
                  </label>
                </div>
                <div className="rounded-md border bg-muted/50 p-3 text-xs leading-relaxed">
                  {preferredPaymentMethod === 'BKASH' ? (
                    <>
                      <p className="font-semibold">bKash</p>
                      <p>Number: {paymentAccounts.bkashNumber}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">Bank transfer</p>
                      <p>
                        {paymentAccounts.bankName}, {paymentAccounts.bankBranch}
                      </p>
                      <p>
                        A/C: {paymentAccounts.bankAccountName} — {paymentAccounts.bankAccountNumber}
                      </p>
                    </>
                  )}
                </div>
                <div>
                  <Label>Transaction ID</Label>
                  <Input
                    className="mt-1"
                    value={paymentTransactionId}
                    onChange={(e) => setPaymentTransactionId(e.target.value)}
                    placeholder="Txn reference"
                  />
                </div>
                <div>
                  <Label>Proof screenshot (optional)</Label>
                  <Input
                    className="mt-1"
                    type="file"
                    accept="image/*"
                    onChange={(e) => void onProofUpload(e.target.files?.[0])}
                  />
                  {paymentProofImage ? (
                    <img
                      src={paymentProofImage}
                      alt=""
                      className="mt-2 h-16 rounded border object-cover"
                    />
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" aria-hidden />
              Stay dates
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">Booked days are disabled (same calendar as the website).</p>
            {calLoading ? (
              <div className="mt-2 h-56 animate-pulse rounded-lg bg-muted" />
            ) : (
              <div className="mt-2 flex justify-center overflow-x-auto rounded-lg border bg-background p-2">
                <DayPicker
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  disabled={disabledMatchers}
                  numberOfMonths={1}
                  pagedNavigation
                  defaultMonth={todayStart}
                  classNames={{
                    month: 'space-y-3',
                    caption: 'flex items-center justify-between px-2',
                    caption_label: 'text-sm font-semibold',
                    nav_button: 'h-8 w-8 rounded-md border bg-background hover:bg-muted',
                    table: 'w-full border-collapse',
                    head_cell: 'text-[11px] font-medium text-muted-foreground',
                    cell: 'text-center text-sm p-0',
                    day: 'h-9 w-9 rounded-full',
                    day_selected: 'bg-primary text-primary-foreground',
                    day_range_start: 'bg-primary text-primary-foreground',
                    day_range_end: 'bg-primary text-primary-foreground',
                    day_range_middle: 'bg-accent text-accent-foreground',
                    day_disabled: 'text-muted-foreground line-through opacity-50',
                    day_today: 'ring-1 ring-primary',
                  }}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" aria-hidden />
                Adults
              </Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" aria-hidden />
                Children
              </Label>
              <Input
                type="number"
                min={0}
                max={20}
                value={children}
                onChange={(e) => setChildren(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Booking status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as 'PENDING' | 'CONFIRMED')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending (like website request)</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed (walk-in / phone confirmed)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes" rows={2} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Voucher code (optional)</Label>
            <div className="flex gap-2">
              <Input
                value={voucherCode}
                onChange={(e) => {
                  setVoucherCode(e.target.value.toUpperCase());
                  setVoucherPreview(null);
                }}
                placeholder="e.g. SUMMER10"
              />
              <Button
                type="button"
                variant="outline"
                disabled={!voucherCode.trim() || previewTotal <= 0 || voucherChecking}
                onClick={async () => {
                  if (!selectedRoom || previewTotal <= 0) return;
                  setVoucherChecking(true);
                  setError(null);
                  try {
                    const res = await api.post('/vouchers/validate', {
                      code: voucherCode.trim(),
                      channel: 'ROOM',
                      grossAmount: previewTotal,
                      lineItems: [{ itemType: 'ROOM', itemId: selectedRoom.id, amount: previewTotal }],
                      guestId: useExistingGuest ? pickedGuest?.id : undefined,
                      guestEmail: useExistingGuest ? pickedGuest?.email : guestEmail || undefined,
                    });
                    setVoucherPreview({
                      discountAmount: res.data.discountAmount,
                      netAmount: res.data.netAmount,
                    });
                  } catch (err: unknown) {
                    const ax = err as { response?: { data?: { message?: string } } };
                    setVoucherPreview(null);
                    setError(ax.response?.data?.message || 'Invalid voucher');
                  } finally {
                    setVoucherChecking(false);
                  }
                }}
              >
                {voucherChecking ? '…' : 'Apply'}
              </Button>
            </div>
            {voucherPreview && (
              <p className="text-sm text-green-700">
                Save ৳{voucherPreview.discountAmount.toLocaleString()} — net ৳
                {voucherPreview.netAmount.toLocaleString()}
              </p>
            )}
          </div>

          {previewTotal > 0 && (
            <p className="text-sm font-medium">
              Estimated total: ৳
              {(voucherPreview?.netAmount ?? previewTotal).toLocaleString()}
              {voucherPreview ? (
                <span className="text-muted-foreground font-normal">
                  {' '}
                  (was ৳{previewTotal.toLocaleString()})
                </span>
              ) : (
                <>
                  {' '}
                  ({nights} night{nights !== 1 ? 's' : ''} × ৳
                  {selectedRoom ? Number(selectedRoom.price).toLocaleString() : '—'})
                </>
              )}
            </p>
          )}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || rooms.length === 0}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Create booking'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
