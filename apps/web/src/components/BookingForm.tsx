'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { format, startOfDay } from 'date-fns';
import { BedDouble, CalendarDays, Mail, Phone, UserRound, Users } from 'lucide-react';
import 'react-day-picker/style.css';

import { getRoomAvailabilityCalendar, submitPublicBooking } from '@/lib/resort-api';
import type { Room, RoomAvailabilityCalendar } from '@/types/resort';
import { cn } from '@/lib/utils';

type Props = {
  rooms: Room[];
};

const CALENDAR_DAYS = 90;
const BKASH_NUMBER = process.env.NEXT_PUBLIC_BKASH_NUMBER || '017XXXXXXXX';
const BANK_ACCOUNT_NAME = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || "Nirjon Nature's Hideout";
const BANK_ACCOUNT_NUMBER = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || '1234567890123';
const BANK_NAME = process.env.NEXT_PUBLIC_BANK_NAME || 'Dutch-Bangla Bank';
const BANK_BRANCH = process.env.NEXT_PUBLIC_BANK_BRANCH || 'Sreemangal Branch';

export default function BookingForm({ rooms }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const defaultRoom = sp.get('room') || '';

  const [roomId, setRoomId] = useState(defaultRoom || rooms[0]?.id || '');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [preferredPaymentTiming, setPreferredPaymentTiming] = useState<'INSTANT' | 'LATER'>('LATER');
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<'BKASH' | 'BANK_TRANSFER'>('BKASH');
  const [paymentTransactionId, setPaymentTransactionId] = useState('');
  const [paymentProofImage, setPaymentProofImage] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [message, setMessage] = useState('');
  const [calendar, setCalendar] = useState<RoomAvailabilityCalendar | null>(null);
  const [calLoading, setCalLoading] = useState(false);

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
    async function loadCalendar() {
      if (!roomId) {
        setCalendar(null);
        return;
      }
      setCalLoading(true);
      try {
        const rows = await getRoomAvailabilityCalendar({ roomId, days: CALENDAR_DAYS });
        setCalendar(rows[0] || null);
      } finally {
        setCalLoading(false);
      }
    }
    loadCalendar();
  }, [roomId]);

  useEffect(() => {
    setRange(undefined);
  }, [roomId]);

  async function onProofUpload(file: File | undefined) {
    if (!file) {
      setPaymentProofImage(undefined);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setStatus('err');
      setMessage('Please upload an image file for transaction proof.');
      return;
    }
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read image'));
      reader.readAsDataURL(file);
    });
    setPaymentProofImage(url);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!range?.from || !range?.to) {
      setStatus('err');
      setMessage('Please select check-in and check-out dates.');
      return;
    }
    const checkInDate = format(range.from, 'yyyy-MM-dd');
    const checkOutDate = format(range.to, 'yyyy-MM-dd');
    if (preferredPaymentTiming === 'INSTANT' && paymentTransactionId.trim().length < 4) {
      setStatus('err');
      setMessage('Please enter a valid transaction ID.');
      return;
    }

    setStatus('loading');
    setMessage('');
    const res = await submitPublicBooking({
      roomId,
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim(),
      guestEmail: guestEmail.trim() || undefined,
      adults,
      children,
      preferredPaymentTiming,
      preferredPaymentMethod: preferredPaymentTiming === 'INSTANT' ? preferredPaymentMethod : undefined,
      paymentTransactionId: preferredPaymentTiming === 'INSTANT' ? paymentTransactionId.trim() : undefined,
      paymentProofImage: preferredPaymentTiming === 'INSTANT' ? paymentProofImage : undefined,
      checkInDate,
      checkOutDate,
    });
    if (res.ok) {
      setStatus('ok');
      setMessage(res.message);
      setPaymentTransactionId('');
      setPaymentProofImage(undefined);
      router.refresh();
    } else {
      setStatus('err');
      setMessage(res.message);
    }
  }

  const glassField =
    'rounded-2xl border border-white/50 bg-white/45 shadow-inner shadow-white/20 outline-none backdrop-blur-sm ring-forest-500/30 transition focus:border-forest-400/80 focus:bg-white/60 focus:ring-2';

  return (
    <form
      onSubmit={onSubmit}
      className="relative overflow-hidden rounded-[2rem] border border-white/55 bg-white/40 p-6 shadow-[0_24px_80px_-28px_rgba(27,94,32,0.18),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-2xl sm:rounded-[2.25rem] sm:p-9"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-forest-400/18 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-forest-200/25 blur-3xl" aria-hidden />
      <div className="relative z-[1]">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-700">
            <BedDouble className="h-4 w-4 text-forest-700" />
            Room
          </span>
          <select
            required
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className={cn('w-full px-4 py-3 text-stone-900', glassField)}
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} — ${r.price.toLocaleString()}/night
              </option>
            ))}
          </select>
        </label>

        <div className="sm:col-span-2 space-y-3 rounded-2xl border border-white/50 bg-white/35 p-4 shadow-inner backdrop-blur-sm">
          <p className="text-sm font-semibold text-stone-700">Payment preference</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="paymentTiming"
                checked={preferredPaymentTiming === 'LATER'}
                onChange={() => setPreferredPaymentTiming('LATER')}
              />
              <span>Pay Later</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="paymentTiming"
                checked={preferredPaymentTiming === 'INSTANT'}
                onChange={() => setPreferredPaymentTiming('INSTANT')}
              />
              <span>Instant Payment</span>
            </label>
          </div>
          {preferredPaymentTiming === 'INSTANT' && (
            <div className="space-y-2">
              <p className="text-xs text-stone-500">Choose a payment method</p>
              <div className="flex flex-wrap gap-3 text-sm">
                <label className="flex items-center gap-2 rounded-full border px-3 py-1.5">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={preferredPaymentMethod === 'BKASH'}
                    onChange={() => setPreferredPaymentMethod('BKASH')}
                  />
                  <span>bKash</span>
                </label>
                <label className="flex items-center gap-2 rounded-full border px-3 py-1.5">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={preferredPaymentMethod === 'BANK_TRANSFER'}
                    onChange={() => setPreferredPaymentMethod('BANK_TRANSFER')}
                  />
                  <span>Bank Transfer</span>
                </label>
              </div>
              <div className="rounded-xl border border-forest-200/50 bg-forest-50/60 p-3 text-sm text-stone-700 backdrop-blur-sm">
                {preferredPaymentMethod === 'BKASH' ? (
                  <div className="space-y-1">
                    <p className="font-semibold text-forest-800">Send via bKash Personal</p>
                    <p>
                      Number: <span className="font-semibold">{BKASH_NUMBER}</span>
                    </p>
                    <p className="text-xs text-stone-600">Send money, then submit your transaction ID below.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-semibold text-forest-800">Send via Bank Transfer</p>
                    <p>
                      Bank: <span className="font-semibold">{BANK_NAME}</span>
                    </p>
                    <p>
                      Branch: <span className="font-semibold">{BANK_BRANCH}</span>
                    </p>
                    <p>
                      A/C Name: <span className="font-semibold">{BANK_ACCOUNT_NAME}</span>
                    </p>
                    <p>
                      A/C Number: <span className="font-semibold">{BANK_ACCOUNT_NUMBER}</span>
                    </p>
                  </div>
                )}
              </div>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-stone-700">Transaction ID</span>
                <input
                  required={preferredPaymentTiming === 'INSTANT'}
                  value={paymentTransactionId}
                  onChange={(e) => setPaymentTransactionId(e.target.value)}
                  className={cn('w-full px-3 py-2 text-sm', glassField.replace('rounded-2xl', 'rounded-xl'))}
                  placeholder="Enter transaction ID/reference"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-stone-700">Transaction Screenshot (optional)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    void onProofUpload(file);
                  }}
                  className={cn(
                    'w-full rounded-xl border border-dashed border-white/60 bg-white/40 px-3 py-2 text-xs text-stone-700 backdrop-blur-sm'
                  )}
                />
                {paymentProofImage && (
                  <img src={paymentProofImage} alt="Payment proof preview" className="mt-2 h-20 rounded-lg border object-cover" />
                )}
              </label>
            </div>
          )}
        </div>

        <div className="sm:col-span-2">
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-700">
            <CalendarDays className="h-4 w-4 text-forest-700" />
            Stay dates
          </span>
          <p className="mb-3 text-xs text-stone-500">
            Select check-in and check-out. Booked days cannot be selected.
          </p>
          {calLoading ? (
            <div className="h-64 animate-pulse rounded-2xl bg-stone-100" />
          ) : (
            <div className="flex justify-center overflow-x-auto rounded-2xl border border-white/50 bg-white/35 p-3 shadow-inner backdrop-blur-sm">
              <DayPicker
                mode="range"
                required={false}
                selected={range}
                onSelect={setRange}
                disabled={disabledMatchers}
                numberOfMonths={1}
                pagedNavigation
                defaultMonth={todayStart}
                classNames={{
                  month: 'space-y-3',
                  caption: 'flex items-center justify-between px-2',
                  caption_label: 'text-sm font-semibold text-stone-800',
                  nav_button:
                    'h-8 w-8 rounded-full border border-white/60 bg-white/50 text-stone-700 backdrop-blur-sm hover:bg-forest-100/90 hover:text-forest-800',
                  table: 'w-full border-collapse',
                  head_cell: 'text-[11px] font-semibold text-stone-500',
                  cell: 'text-center text-sm',
                  day: 'h-9 w-9 rounded-full text-stone-700 hover:bg-forest-100',
                  day_selected: 'bg-forest-700 text-white hover:bg-forest-700',
                  day_range_start: 'bg-forest-700 text-white',
                  day_range_end: 'bg-forest-700 text-white',
                  day_range_middle: 'bg-forest-200 text-forest-900',
                  day_disabled: 'text-stone-300 line-through',
                  day_today: 'ring-1 ring-forest-500',
                }}
              />
            </div>
          )}
        </div>

        <label>
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-700">
            <Users className="h-4 w-4 text-forest-700" />
            Adults
          </span>
          <input
            type="number"
            min={1}
            max={20}
            value={adults}
            onChange={(e) => setAdults(Number(e.target.value))}
            className={cn('w-full px-4 py-3', glassField)}
          />
        </label>
        <label>
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-700">
            <Users className="h-4 w-4 text-forest-700" />
            Children
          </span>
          <input
            type="number"
            min={0}
            max={20}
            value={children}
            onChange={(e) => setChildren(Number(e.target.value))}
            className={cn('w-full px-4 py-3', glassField)}
          />
        </label>

        <label className="sm:col-span-2">
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-700">
            <UserRound className="h-4 w-4 text-forest-700" />
            Full name
          </span>
          <input
            required
            minLength={2}
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className={cn('w-full px-4 py-3', glassField)}
            placeholder="Your name"
          />
        </label>

        <label>
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-700">
            <Phone className="h-4 w-4 text-forest-700" />
            Phone
          </span>
          <input
            required
            minLength={10}
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            className={cn('w-full px-4 py-3', glassField)}
            placeholder="+880…"
          />
        </label>
        <label>
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-700">
            <Mail className="h-4 w-4 text-forest-700" />
            Email (optional)
          </span>
          <input
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            className={cn('w-full px-4 py-3', glassField)}
            placeholder="you@example.com"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={status === 'loading' || rooms.length === 0}
        className={cn(
          'mt-8 w-full rounded-full border border-forest-600/40 bg-forest-700 py-4 font-semibold text-white shadow-lg shadow-forest-950/30 ring-1 ring-white/15 transition hover:bg-forest-800 hover:shadow-xl disabled:opacity-60'
        )}
      >
        {status === 'loading' ? 'Sending…' : 'Request booking'}
      </button>

      {message && (
        <p
          className={cn(
            'mt-4 text-center text-sm',
            status === 'ok' ? 'text-forest-800' : 'text-red-700'
          )}
          role="status"
        >
          {message}
        </p>
      )}

      <div className="mt-8 rounded-2xl border border-white/45 bg-forest-50/50 p-4 shadow-inner backdrop-blur-sm">
        <h3 className="text-sm font-semibold text-stone-800">Availability preview</h3>
        <p className="mt-1 text-xs text-stone-600">
          Green = free · Red = booked/pending (first 30 days shown)
        </p>
        {calLoading ? (
          <div className="mt-3 h-14 animate-pulse rounded-xl bg-stone-100" />
        ) : calendar ? (
          <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
            {calendar.availability.slice(0, 30).map((d) => (
              <div
                key={d.date}
                className={cn(
                  'rounded-lg px-2 py-1.5 text-center text-xs font-medium',
                  d.status === 'FREE'
                    ? 'bg-forest-100 text-forest-800'
                    : 'bg-rose-100 text-rose-800'
                )}
                title={d.bookingStatus ? `Booked (${d.bookingStatus})` : 'Free'}
              >
                {new Date(`${d.date}T12:00:00Z`).toLocaleDateString('en-GB', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-stone-500">Availability unavailable right now.</p>
        )}
      </div>
      </div>
    </form>
  );
}

