'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { addDays, differenceInCalendarDays, eachDayOfInterval, format, isAfter, isSameDay, startOfDay } from 'date-fns';
import { BedDouble, CalendarDays, Mail, Phone, UserRound, Users } from 'lucide-react';
import 'react-day-picker/style.css';

import { getRoomAvailabilityCalendar, submitPublicBooking, sendBookingOtp, verifyBookingOtp, validatePublicVoucher, fetchVouchersForEmail, type PublicMineVoucher } from '@/lib/resort-api';
import type { Room, RoomAvailabilityCalendar } from '@/types/resort';
import { cn } from '@/lib/utils';

type Props = {
  rooms: Room[];
  variant?: 'light' | 'dark';
  paymentAccounts?: {
    bkashNumber?: string;
    nagadNumber?: string;
    bankAccountName?: string;
    bankAccountNumber?: string;
    bankName?: string;
    bankBranch?: string;
  };
};

const CALENDAR_DAYS = 90;

// Online bookings are pay-now only: the guest sends the money first and
// submits the transaction ID. "Pay later" is not offered on the website.
type PaymentMethod = 'BKASH' | 'NAGAD' | 'BANK_TRANSFER';
const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'BKASH', label: 'bKash' },
  { value: 'NAGAD', label: 'Nagad' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
];

// Optional build-time fallbacks; values from admin Settings → Payment Accounts
// win. No made-up defaults: an unset account shows a "call us" note instead
// of a fake number a guest could send money to.
const ENV_BKASH = process.env.NEXT_PUBLIC_BKASH_NUMBER || '';
const ENV_NAGAD = process.env.NEXT_PUBLIC_NAGAD_NUMBER || '';
const ENV_BANK_ACCOUNT_NAME = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || '';
const ENV_BANK_ACCOUNT_NUMBER = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || '';
const ENV_BANK_NAME = process.env.NEXT_PUBLIC_BANK_NAME || '';
const ENV_BANK_BRANCH = process.env.NEXT_PUBLIC_BANK_BRANCH || '';
const NOT_SET = 'Not set yet — please call us before paying';

/**
 * The calendar selects NIGHTS: tapping one date books that night (check-in that
 * day, check-out the next morning); tapping a later date extends the stay to
 * cover every night in between. Checkout is always the morning after the last
 * selected night, which matches the server's half-open [checkIn, checkOut) rule.
 */
// Always pass an object so DayPicker stays controlled; with `selected={undefined}`
// v9 silently switches to its own internal state and "Clear" would leave a stale highlight.
const EMPTY_RANGE: DateRange = { from: undefined, to: undefined };

function stayFromRange(range: DateRange | undefined) {
  if (!range?.from) return null;
  const from = startOfDay(range.from);
  const to = startOfDay(range.to ?? range.from);
  return { checkIn: from, checkOut: addDays(to, 1), nights: differenceInCalendarDays(to, from) + 1 };
}

export default function BookingForm({ rooms, variant = 'light', paymentAccounts }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const defaultRoom = sp.get('room') || '';
  const isDark = variant === 'dark';

  const BKASH_NUMBER = paymentAccounts?.bkashNumber?.trim() || ENV_BKASH;
  const NAGAD_NUMBER = paymentAccounts?.nagadNumber?.trim() || ENV_NAGAD;
  const BANK_ACCOUNT_NAME = paymentAccounts?.bankAccountName?.trim() || ENV_BANK_ACCOUNT_NAME;
  const BANK_ACCOUNT_NUMBER = paymentAccounts?.bankAccountNumber?.trim() || ENV_BANK_ACCOUNT_NUMBER;
  const BANK_NAME = paymentAccounts?.bankName?.trim() || ENV_BANK_NAME;
  const BANK_BRANCH = paymentAccounts?.bankBranch?.trim() || ENV_BANK_BRANCH;

  const [roomId, setRoomId] = useState(defaultRoom || rooms[0]?.id || '');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<PaymentMethod>('BKASH');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherPreview, setVoucherPreview] = useState<string | null>(null);
  const [emailVouchers, setEmailVouchers] = useState<PublicMineVoucher[]>([]);
  const [paymentTransactionId, setPaymentTransactionId] = useState('');
  const [paymentProofImage, setPaymentProofImage] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [message, setMessage] = useState('');
  const [calendar, setCalendar] = useState<RoomAvailabilityCalendar | null>(null);
  const [calLoading, setCalLoading] = useState(false);
  const [calHint, setCalHint] = useState('');

  // OTP state
  const [otpStep, setOtpStep] = useState<'idle' | 'sending' | 'input' | 'verifying' | 'verified'>('idle');
  const [otpValue, setOtpValue] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [otpResendTimer, setOtpResendTimer] = useState(0);

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

  const bookedKeys = useMemo(
    () => new Set((calendar?.availability ?? []).filter((d) => d.status === 'BOOKED').map((d) => d.date)),
    [calendar]
  );
  const stay = useMemo(() => stayFromRange(range), [range]);

  function handleDayClick(day: Date, modifiers: { disabled?: boolean }) {
    if (modifiers.disabled) return;
    const d = startOfDay(day);
    setCalHint('');
    setRange((prev) => {
      if (!prev?.from) return { from: d, to: d };
      const from = startOfDay(prev.from);
      const to = startOfDay(prev.to ?? prev.from);
      const single = isSameDay(from, to);
      // Tap the only selected night again → clear.
      if (single && isSameDay(d, from)) return undefined;
      // Tap a later date while one night is selected → extend the stay, but a
      // stay can't run across a night someone else has booked.
      if (single && isAfter(d, from)) {
        const crossesBooked = eachDayOfInterval({ start: from, end: d }).some((x) =>
          bookedKeys.has(format(x, 'yyyy-MM-dd'))
        );
        if (crossesBooked) {
          setCalHint('That stay would cross a booked night — pick a shorter range or a different start date.');
          return { from: d, to: d };
        }
        return { from, to: d };
      }
      // Anything else (earlier date, or a range already chosen) → start over on the tapped night.
      return { from: d, to: d };
    });
  }

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

  // OTP resend countdown
  useEffect(() => {
    if (otpResendTimer <= 0) return;
    const t = setTimeout(() => setOtpResendTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [otpResendTimer]);

  // Load personal vouchers for guest email (Guest / User / Shareholder identities)
  useEffect(() => {
    const email = guestEmail.trim();
    if (!email || !email.includes('@')) {
      setEmailVouchers([]);
      return;
    }
    const t = setTimeout(() => {
      fetchVouchersForEmail(email).then((res) => {
        setEmailVouchers(
          res.ok
            ? res.vouchers.filter(
                (v) =>
                  !v.expired &&
                  !v.exhausted &&
                  (v.remaining == null || v.remaining > 0)
              )
            : []
        );
      });
    }, 500);
    return () => clearTimeout(t);
  }, [guestEmail, otpStep]);

  async function handleSendOtp() {
    if (!guestEmail.trim()) {
      setOtpMessage('Please enter your email first.');
      return;
    }
    setOtpStep('sending');
    setOtpMessage('');
    const res = await sendBookingOtp(guestEmail.trim());
    if (res.ok) {
      // The code arrives by email only; the guest types it in.
      setOtpValue('');
      setOtpStep('input');
      setOtpResendTimer(60);
      setOtpMessage(res.message);
    } else {
      setOtpStep('idle');
      setOtpMessage(res.message);
    }
  }

  async function handleVerifyOtp() {
    if (!otpValue.trim()) return;
    setOtpStep('verifying');
    setOtpMessage('');
    const res = await verifyBookingOtp(guestEmail.trim(), otpValue.trim());
    if (res.ok) {
      setOtpStep('verified');
      setOtpMessage('✓ Email verified');
    } else {
      setOtpStep('input');
      setOtpMessage(res.message);
    }
  }

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
    if (!stay) {
      setStatus('err');
      setMessage('Please select the night(s) of your stay on the calendar.');
      return;
    }
    // Email is mandatory: the server only accepts bookings from an OTP-verified address.
    if (!guestEmail.trim()) {
      setStatus('err');
      setMessage('Please enter your email — we send a one-time code to verify it.');
      return;
    }
    if (otpStep !== 'verified') {
      setStatus('err');
      setMessage('Please verify your email with OTP before submitting.');
      return;
    }
    const checkInDate = format(stay.checkIn, 'yyyy-MM-dd');
    const checkOutDate = format(stay.checkOut, 'yyyy-MM-dd');
    // Pay-now only: the transaction ID is what staff verify against bKash/Nagad/bank.
    if (paymentTransactionId.trim().length < 4) {
      setStatus('err');
      setMessage('Please enter a valid transaction ID.');
      return;
    }
    if (guestPhone.replace(/\D/g, '').length < 10) {
      setStatus('err');
      setMessage('Phone must be at least 10 digits.');
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
      preferredPaymentTiming: 'INSTANT',
      preferredPaymentMethod,
      paymentTransactionId: paymentTransactionId.trim(),
      paymentProofImage,
      checkInDate,
      checkOutDate,
      ...(voucherCode.trim() ? { voucherCode: voucherCode.trim() } : {}),
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

  const glassField = isDark
    ? 'rounded-xl border border-forest-900/60 bg-[#0a130b] text-forest-100 shadow-inner outline-none ring-forest-500/40 transition placeholder:text-forest-700 focus:border-forest-600 focus:bg-[#0d1a0e] focus:ring-2'
    : 'rounded-2xl border border-white/50 bg-white/45 shadow-inner shadow-white/20 outline-none backdrop-blur-sm ring-forest-500/30 transition focus:border-forest-400/80 focus:bg-white/60 focus:ring-2';

  const labelClass = isDark
    ? 'mb-2 flex items-center gap-2 text-sm font-semibold text-forest-200'
    : 'mb-2 flex items-center gap-2 text-sm font-semibold text-stone-700';

  const iconClass = isDark ? 'h-4 w-4 text-forest-400' : 'h-4 w-4 text-forest-700';

  const formClass = isDark
    ? 'relative overflow-hidden border border-forest-900/60 bg-[#0a130b] p-6 shadow-[0_24px_80px_-28px_rgba(0,0,0,0.6)] sm:p-9'
    : 'relative overflow-hidden rounded-[2rem] border border-white/55 bg-white/40 p-6 shadow-[0_24px_80px_-28px_rgba(27,94,32,0.18),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-2xl sm:rounded-[2.25rem] sm:p-9';

  return (
    <form
      onSubmit={onSubmit}
      className={formClass}
    >
      {!isDark && (
        <>
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-forest-400/18 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-forest-200/25 blur-3xl" aria-hidden />
        </>
      )}
      <div className="relative z-[1]">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className={labelClass}>
            <BedDouble className={iconClass} />
            Room
          </span>
          <select
            required
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className={cn('w-full px-4 py-3', isDark ? 'text-forest-100' : 'text-stone-900', glassField)}
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id} className={isDark ? 'bg-[#0a130b] text-forest-100' : ''}>
                {r.name} — ৳{r.price.toLocaleString()}/night
              </option>
            ))}
          </select>
        </label>

        <div className={cn(
          'sm:col-span-2 space-y-3 p-4 shadow-inner',
          isDark
            ? 'border border-forest-900/60 bg-[#0d1a0e]'
            : 'rounded-2xl border border-white/50 bg-white/35 backdrop-blur-sm'
        )}>
          <p className={cn('text-sm font-semibold', isDark ? 'text-forest-200' : 'text-stone-700')}>Payment</p>
          <p className={cn('text-xs', isDark ? 'text-forest-400' : 'text-stone-500')}>
            Pay now via bKash, Nagad or bank transfer, then enter the transaction ID to confirm your booking.
          </p>
          <div className={cn('flex flex-wrap gap-3 text-sm', isDark ? 'text-forest-200' : '')}>
            {PAYMENT_METHODS.map((m) => (
              <label
                key={m.value}
                className={cn(
                  'flex items-center gap-2 rounded-full px-3 py-1.5',
                  isDark ? 'border border-forest-900/60 bg-[#0a130b]' : 'border'
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={preferredPaymentMethod === m.value}
                  onChange={() => setPreferredPaymentMethod(m.value)}
                />
                <span>{m.label}</span>
              </label>
            ))}
          </div>
          <div className={cn(
            'p-3 text-sm',
            isDark
              ? 'border border-forest-900/60 bg-[#0a130b] text-forest-200'
              : 'rounded-xl border border-forest-200/50 bg-forest-50/60 text-stone-700 backdrop-blur-sm'
          )}>
            {preferredPaymentMethod === 'BANK_TRANSFER' ? (
              <div className="space-y-1">
                <p className={cn('font-semibold', isDark ? 'text-forest-100' : 'text-forest-800')}>
                  Send via Bank Transfer
                </p>
                <p>Bank: <span className="font-semibold">{BANK_NAME || NOT_SET}</span></p>
                <p>Branch: <span className="font-semibold">{BANK_BRANCH || NOT_SET}</span></p>
                <p>A/C Name: <span className="font-semibold">{BANK_ACCOUNT_NAME || NOT_SET}</span></p>
                <p>A/C Number: <span className="font-semibold">{BANK_ACCOUNT_NUMBER || NOT_SET}</span></p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className={cn('font-semibold', isDark ? 'text-forest-100' : 'text-forest-800')}>
                  Send via {preferredPaymentMethod === 'NAGAD' ? 'Nagad' : 'bKash'} Personal
                </p>
                <p>
                  Number:{' '}
                  <span className="font-semibold">
                    {(preferredPaymentMethod === 'NAGAD' ? NAGAD_NUMBER : BKASH_NUMBER) || NOT_SET}
                  </span>
                </p>
                <p className={cn('text-xs', isDark ? 'text-forest-400' : 'text-stone-600')}>
                  Send money, then submit your transaction ID below.
                </p>
              </div>
            )}
          </div>
          <label className="block">
            <span className={cn(
              'mb-2 block text-xs font-semibold',
              isDark ? 'text-forest-200' : 'text-stone-700'
            )}>
              Transaction ID
            </span>
            <input
              required
              value={paymentTransactionId}
              onChange={(e) => setPaymentTransactionId(e.target.value)}
              className={cn('w-full px-3 py-2 text-sm', glassField.replace('rounded-2xl', 'rounded-xl'))}
              placeholder="Enter transaction ID/reference"
            />
          </label>
          <label className="block">
            <span className={cn(
              'mb-2 block text-xs font-semibold',
              isDark ? 'text-forest-200' : 'text-stone-700'
            )}>
              Transaction Screenshot (optional)
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                void onProofUpload(file);
              }}
              className={cn(
                'w-full px-3 py-2 text-xs',
                isDark
                  ? 'rounded-xl border border-dashed border-forest-900/60 bg-[#0a130b] text-forest-300'
                  : 'rounded-xl border border-dashed border-white/60 bg-white/40 text-stone-700 backdrop-blur-sm'
              )}
            />
            {paymentProofImage && (
              <img src={paymentProofImage} alt="Payment proof preview" className="mt-2 h-20 rounded-lg border object-cover" />
            )}
          </label>
        </div>

        <div className="sm:col-span-2">
          <span className={labelClass}>
            <CalendarDays className={iconClass} />
            Stay dates
          </span>
          <p className={cn(
            'mb-3 text-xs',
            isDark ? 'text-forest-400' : 'text-stone-500'
          )}>
            Tap a date to book that night. Tap a later date to extend your stay. Booked nights are crossed out.
          </p>
          {calLoading ? (
            <div className={cn(
              'h-64 animate-pulse',
              isDark ? 'rounded-xl bg-[#0d1a0e]' : 'rounded-2xl bg-stone-100'
            )} />
          ) : (
            <div className={cn(
              'flex justify-center overflow-x-auto p-3 shadow-inner',
              isDark
                ? 'border border-forest-900/60 bg-[#0d1a0e]'
                : 'rounded-2xl border border-white/50 bg-white/35 backdrop-blur-sm'
            )}>
              <DayPicker
                mode="range"
                selected={range ?? EMPTY_RANGE}
                onDayClick={handleDayClick}
                disabled={disabledMatchers}
                numberOfMonths={1}
                defaultMonth={todayStart}
                showOutsideDays={false}
                className={cn('pv-cal', isDark && 'pv-cal-dark')}
              />
            </div>
          )}
          {calHint && (
            <p className={cn('text-xs', isDark ? 'text-amber-300' : 'text-amber-700')}>{calHint}</p>
          )}
          {stay && (
            <div className={cn(
              'flex flex-wrap items-center justify-between gap-2 px-1 text-sm',
              isDark ? 'text-forest-200' : 'text-stone-700'
            )}>
              <span>
                <span className="font-semibold">Check-in</span> {format(stay.checkIn, 'EEE d MMM')}
                {' · '}
                <span className="font-semibold">Check-out</span> {format(stay.checkOut, 'EEE d MMM')}
                {' · '}
                {stay.nights} {stay.nights === 1 ? 'night' : 'nights'}
              </span>
              <button
                type="button"
                onClick={() => { setRange(undefined); setCalHint(''); }}
                className={cn('text-xs underline underline-offset-2', isDark ? 'text-forest-400 hover:text-forest-200' : 'text-stone-500 hover:text-stone-800')}
              >
                Clear dates
              </button>
            </div>
          )}
        </div>

        <label>
          <span className={labelClass}>
            <Users className={iconClass} />
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
          <span className={labelClass}>
            <Users className={iconClass} />
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
          <span className={labelClass}>
            <UserRound className={iconClass} />
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
          <span className={labelClass}>
            <Phone className={iconClass} />
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
          <span className={labelClass}>
            <Mail className={iconClass} />
            Email
          </span>
          <input
            type="email"
            required
            value={guestEmail}
            onChange={(e) => {
              setGuestEmail(e.target.value);
              // Reset OTP if email changes
              if (otpStep !== 'idle') {
                setOtpStep('idle');
                setOtpValue('');
                setOtpMessage('');
              }
            }}
            className={cn('w-full px-4 py-3', glassField)}
            placeholder="you@example.com"
          />
          {/* OTP section — always shown until verified so guests know the step is coming */}
          {otpStep !== 'verified' && (
            <div className="mt-2 space-y-2">
              {otpStep === 'idle' && (
                <>
                  <p className={cn('text-xs', isDark ? 'text-forest-400' : 'text-stone-500')}>
                    We email a 6-digit code to this address. Verify it once, then request your booking.
                  </p>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={!guestEmail.includes('@')}
                    className={cn(
                      'w-full rounded-lg py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
                      isDark
                        ? 'border border-forest-700 bg-forest-900/60 text-forest-200 hover:bg-forest-800'
                        : 'border border-forest-400 bg-forest-50 text-forest-800 hover:bg-forest-100'
                    )}
                  >
                    Send OTP to verify email
                  </button>
                </>
              )}
              {otpStep === 'sending' && (
                <p className={cn('text-xs text-center', isDark ? 'text-forest-400' : 'text-stone-500')}>
                  Sending OTP…
                </p>
              )}
              {(otpStep === 'input' || otpStep === 'verifying') && (
                <div className="space-y-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    className={cn('w-full px-4 py-2.5 text-center text-lg font-mono tracking-[0.5em]', glassField)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpValue.length !== 6 || otpStep === 'verifying'}
                      className={cn(
                        'flex-1 rounded-lg py-2 text-sm font-semibold transition disabled:opacity-50',
                        isDark
                          ? 'bg-forest-700 text-white hover:bg-forest-600'
                          : 'bg-forest-700 text-white hover:bg-forest-800'
                      )}
                    >
                      {otpStep === 'verifying' ? 'Verifying…' : 'Verify OTP'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpResendTimer > 0}
                      className={cn(
                        'rounded-lg px-3 py-2 text-xs font-medium transition disabled:opacity-40',
                        isDark
                          ? 'border border-forest-700 text-forest-300 hover:bg-forest-900'
                          : 'border border-forest-400 text-forest-700 hover:bg-forest-50'
                      )}
                    >
                      {otpResendTimer > 0 ? `Resend (${otpResendTimer}s)` : 'Resend'}
                    </button>
                  </div>
                </div>
              )}
              {otpMessage && (
                <p className={cn('text-xs text-center',
                  otpMessage.startsWith('✓')
                    ? isDark ? 'text-forest-300' : 'text-forest-700'
                    : isDark ? 'text-rose-400' : 'text-red-600'
                )}>
                  {otpMessage}
                </p>
              )}
            </div>
          )}
          {otpStep === 'verified' && (
            <p className={cn('mt-1.5 text-xs font-semibold', isDark ? 'text-forest-300' : 'text-forest-700')}>
              ✓ Email verified
            </p>
          )}
        </label>
      </div>

      <div className="mt-4 space-y-2">
        {emailVouchers.length > 0 && (
          <div
            className={cn(
              'rounded-lg border p-3 space-y-2',
              isDark ? 'border-forest-800 bg-forest-950/40' : 'border-forest-200 bg-white/60'
            )}
          >
            <p className={cn('text-xs font-semibold uppercase tracking-wide', isDark ? 'text-forest-400' : 'text-forest-700')}>
              Vouchers for you
            </p>
            <ul className="space-y-1.5">
              {emailVouchers.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className={isDark ? 'text-forest-100' : 'text-stone-800'}>
                    {v.name}{' '}
                    <span className="text-xs opacity-70">
                      ({v.discountType === 'PERCENT' ? `${v.discountValue}%` : `৳${v.discountValue}`})
                    </span>
                  </span>
                  <button
                    type="button"
                    className={cn(
                      'font-mono text-xs underline-offset-2 hover:underline',
                      isDark ? 'text-forest-300' : 'text-forest-700'
                    )}
                    onClick={() => {
                      setMessage(`Your code ends with ${v.codeHint} — enter the full code to apply.`);
                      setStatus('idle');
                      setVoucherPreview(null);
                    }}
                    title="Code ends with this hint — enter the full code to apply"
                  >
                    ••••{v.codeHint}
                  </button>
                </li>
              ))}
            </ul>
            <p className={cn('text-[11px]', isDark ? 'text-forest-500' : 'text-stone-500')}>
              Enter the full code below to apply (hint shown for reference).
            </p>
          </div>
        )}
        <label>
          <span className={labelClass}>Voucher code (optional)</span>
          <div className="flex gap-2">
            <input
              value={voucherCode}
              onChange={(e) => {
                setVoucherCode(e.target.value.toUpperCase());
                setVoucherPreview(null);
              }}
              className={cn('w-full px-4 py-3', glassField)}
              placeholder="Have a code?"
            />
            <button
              type="button"
              className={cn(
                'shrink-0 rounded-lg px-4 text-sm font-semibold',
                isDark
                  ? 'border border-forest-700 bg-forest-900/60 text-forest-200'
                  : 'border border-forest-400 bg-forest-50 text-forest-800'
              )}
              onClick={async () => {
                const room = rooms.find((r) => r.id === roomId);
                if (!room || !stay || !voucherCode.trim()) return;
                if (!guestEmail.trim()) {
                  setMessage('Enter your email so we can check personal vouchers.');
                  setStatus('err');
                  return;
                }
                const gross = room.price * stay.nights;
                const res = await validatePublicVoucher({
                  code: voucherCode.trim(),
                  channel: 'ROOM',
                  grossAmount: gross,
                  lineItems: [{ itemType: 'ROOM', itemId: room.id, amount: gross }],
                  guestEmail: guestEmail.trim() || undefined,
                });
                if (res.ok) {
                  setVoucherPreview(`Save ৳${res.discountAmount} — pay ৳${res.netAmount}`);
                  setStatus('idle');
                  setMessage('');
                } else {
                  setVoucherPreview(null);
                  setMessage(res.message);
                  setStatus('err');
                }
              }}
            >
              Apply
            </button>
          </div>
        </label>
        {voucherPreview && (
          <p className={cn('text-sm', isDark ? 'text-forest-300' : 'text-forest-700')}>{voucherPreview}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={status === 'loading' || rooms.length === 0}
        className={cn(
          'mt-8 w-full py-4 font-semibold transition disabled:opacity-60',
          isDark
            ? 'border border-forest-700 bg-forest-700 text-white hover:bg-forest-600'
            : 'rounded-full border border-forest-600/40 bg-forest-700 text-white shadow-lg shadow-forest-950/30 ring-1 ring-white/15 hover:bg-forest-800 hover:shadow-xl'
        )}
      >
        {status === 'loading' ? 'Sending…' : 'Request booking'}
      </button>

      {message && (
        <p
          className={cn(
            'mt-4 text-center text-sm',
            status === 'ok'
              ? isDark ? 'text-forest-300' : 'text-forest-800'
              : isDark ? 'text-rose-400' : 'text-red-700'
          )}
          role="status"
        >
          {message}
        </p>
      )}

      <div className={cn(
        'mt-8 p-4 shadow-inner',
        isDark
          ? 'border border-forest-900/60 bg-[#0a130b]'
          : 'rounded-2xl border border-white/45 bg-forest-50/50 backdrop-blur-sm'
      )}>
        <h3 className={cn(
          'text-sm font-semibold',
          isDark ? 'text-forest-100' : 'text-stone-800'
        )}>
          Availability preview
        </h3>
        <p className={cn(
          'mt-1 text-xs',
          isDark ? 'text-forest-400' : 'text-stone-600'
        )}>
          Green = free · Red = booked/pending (first 30 days shown)
        </p>
        {calLoading ? (
          <div className={cn(
            'mt-3 h-14 animate-pulse',
            isDark ? 'rounded-xl bg-[#0d1a0e]' : 'rounded-xl bg-stone-100'
          )} />
        ) : calendar ? (
          <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
            {calendar.availability.slice(0, 30).map((d) => (
              <div
                key={d.date}
                className={cn(
                  'rounded-lg px-2 py-1.5 text-center text-xs font-medium',
                  d.status === 'FREE'
                    ? isDark ? 'bg-forest-900/60 text-forest-200' : 'bg-forest-100 text-forest-800'
                    : isDark ? 'bg-rose-900/40 text-rose-300' : 'bg-rose-100 text-rose-800'
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
          <p className={cn(
            'mt-3 text-xs',
            isDark ? 'text-forest-500' : 'text-stone-500'
          )}>
            Availability unavailable right now.
          </p>
        )}
      </div>
      </div>
    </form>
  );
}

