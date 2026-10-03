'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { addDays, differenceInCalendarDays, eachDayOfInterval, format, isAfter, isSameDay, startOfDay } from 'date-fns';
import { BedDouble, CalendarDays, Mail, Minus, Phone, Plus, UserRound, Users } from 'lucide-react';
import 'react-day-picker/style.css';

import { getRoomAvailabilityCalendar, submitPublicBooking, sendBookingOtp, verifyBookingOtp, validatePublicVoucher, fetchVouchersForEmail, type PublicMineVoucher } from '@/lib/resort-api';
import type { Room, RoomAvailabilityCalendar } from '@/types/resort';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { fmtMoney } from '@/lib/format';

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
const PAYMENT_METHODS: { value: PaymentMethod; label: string; bn: string }[] = [
  { value: 'BKASH', label: 'bKash', bn: 'বিকাশ' },
  { value: 'NAGAD', label: 'Nagad', bn: 'নগদ' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', bn: 'ব্যাংক ট্রান্সফার' },
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
// Occupancy rules (mirrors the server): `capacity` guests are included in the rate; up to
// MAX_EXTRA_PERSONS more (extra adults, or children aged 8+) at the room's extra-guest charge per
// night. Children under 8 stay free.
const MAX_EXTRA_PERSONS = 2;
const DEFAULT_EXTRA_GUEST_CHARGE = 500;

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
  const { t } = useLanguage();
  const NOT_SET = t('Not set yet — please call us before paying', 'এখনো দেওয়া হয়নি — টাকা পাঠানোর আগে আমাদের কল করুন');

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
  const selectedRoom = rooms.find((r) => r.id === roomId) ?? null;
  const capacity = Math.max(1, selectedRoom?.capacity ?? 2);
  const extraGuestCharge = selectedRoom?.extraGuestCharge ?? DEFAULT_EXTRA_GUEST_CHARGE;
  const [adults, setAdults] = useState(capacity);
  const [childrenUnder8, setChildrenUnder8] = useState(0);
  const [childrenOver8, setChildrenOver8] = useState(0);
  const extraAdults = Math.max(0, adults - capacity);
  const extraPersons = extraAdults + childrenOver8;
  const extraOk = extraPersons <= MAX_EXTRA_PERSONS;
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
  // Pending (unconfirmed) requests still hold the night, but get their own colour.
  const pendingDates = useMemo(() => {
    if (!calendar?.availability?.length) return [] as Date[];
    return calendar.availability
      .filter((d) => d.status === 'BOOKED' && d.bookingStatus === 'PENDING')
      .map((d) => new Date(`${d.date}T12:00:00`));
  }, [calendar]);
  const confirmedDates = useMemo(() => {
    if (!calendar?.availability?.length) return [] as Date[];
    return calendar.availability
      .filter((d) => d.status === 'BOOKED' && d.bookingStatus !== 'PENDING')
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
          setCalHint(t('That stay would cross a booked night — pick a shorter range or a different start date.', 'এই থাকার মাঝে একটি রাত আগে থেকেই বুক করা — ছোট রেঞ্জ বা অন্য শুরুর তারিখ বেছে নিন।'));
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
    // Each room includes a different number of guests — reset the counters to its base.
    setAdults(capacity);
    setChildrenUnder8(0);
    setChildrenOver8(0);
  }, [roomId, capacity]);

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
      setOtpMessage(t('Please enter your email first.', 'আগে আপনার ইমেইল দিন।'));
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
      setOtpMessage('✓ ' + t('Email verified', 'ইমেইল যাচাই হয়েছে'));
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
      setMessage(t('Please upload an image file (screenshot) of your payment.', 'পেমেন্টের ছবি (screenshot) আপলোড করুন।'));
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
      setMessage(t('Please select the night(s) of your stay on the calendar.', 'ক্যালেন্ডারে আপনার থাকার রাত(গুলো) বেছে নিন।'));
      return;
    }
    // Email is mandatory: the server only accepts bookings from an OTP-verified address.
    if (!guestEmail.trim()) {
      setStatus('err');
      setMessage(t('Please enter your email — we send a one-time code to verify it.', 'আপনার ইমেইল দিন — যাচাইয়ের জন্য আমরা একটি one-time code পাঠাই।'));
      return;
    }
    if (otpStep !== 'verified') {
      setStatus('err');
      setMessage(t('Please verify your email with OTP before submitting.', 'জমা দেওয়ার আগে OTP দিয়ে ইমেইল যাচাই করুন।'));
      return;
    }
    const checkInDate = format(stay.checkIn, 'yyyy-MM-dd');
    const checkOutDate = format(stay.checkOut, 'yyyy-MM-dd');
    // Pay-now only: staff verify the payment screenshot (the transaction ID is optional).
    if (!paymentProofImage) {
      setStatus('err');
      setMessage(t('Please attach a screenshot of your payment.', 'আপনার পেমেন্টের screenshot যুক্ত করুন।'));
      return;
    }
    if (paymentTransactionId.trim() && paymentTransactionId.trim().length < 4) {
      setStatus('err');
      setMessage(t('The transaction ID looks too short.', 'Transaction ID টি খুব ছোট মনে হচ্ছে।'));
      return;
    }
    if (!extraOk) {
      setStatus('err');
      setMessage(t(`This room includes ${capacity} guests; you can add at most ${MAX_EXTRA_PERSONS} extra persons (adults or children aged 8+).`, `এই রুমে ${capacity} জন অন্তর্ভুক্ত; সর্বোচ্চ ${MAX_EXTRA_PERSONS} জন অতিরিক্ত (প্রাপ্তবয়স্ক বা ৮+ বছরের শিশু) যোগ করা যায়।`));
      return;
    }
    if (guestPhone.replace(/\D/g, '').length < 10) {
      setStatus('err');
      setMessage(t('Phone must be at least 10 digits.', 'ফোন নম্বর অন্তত ১০ অঙ্কের হতে হবে।'));
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
      children: childrenUnder8,
      childrenOver8,
      preferredPaymentTiming: 'INSTANT',
      preferredPaymentMethod,
      paymentTransactionId: paymentTransactionId.trim() || undefined,
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
            {t('Room', 'রুম')}
          </span>
          <select
            required
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className={cn('w-full px-4 py-3', isDark ? 'text-forest-100' : 'text-stone-900', glassField)}
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id} className={isDark ? 'bg-[#0a130b] text-forest-100' : ''}>
                {r.name} — {fmtMoney(r.price)}/{t('night', 'রাত')} · {r.capacity} {t('guests', 'জন')}
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
          <p className={cn('text-sm font-semibold', isDark ? 'text-forest-200' : 'text-stone-700')}>{t('Payment', 'পেমেন্ট')}</p>
          <p className={cn('text-xs', isDark ? 'text-forest-400' : 'text-stone-500')}>
            {t('Pay now via bKash, Nagad or bank transfer, then attach a screenshot of the payment to confirm your booking.', 'bKash, Nagad বা ব্যাংক ট্রান্সফারে এখনই টাকা পাঠান, তারপর পেমেন্টের screenshot যুক্ত করে বুকিং নিশ্চিত করুন।')}
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
                <span>{t(m.label, m.bn)}</span>
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
                  {t('Send via Bank Transfer', 'ব্যাংক ট্রান্সফারে পাঠান')}
                </p>
                <p>{t('Bank', 'ব্যাংক')}: <span className="font-semibold">{BANK_NAME || NOT_SET}</span></p>
                <p>{t('Branch', 'শাখা')}: <span className="font-semibold">{BANK_BRANCH || NOT_SET}</span></p>
                <p>{t('A/C Name', 'অ্যাকাউন্টের নাম')}: <span className="font-semibold">{BANK_ACCOUNT_NAME || NOT_SET}</span></p>
                <p>{t('A/C Number', 'অ্যাকাউন্ট নম্বর')}: <span className="font-semibold">{BANK_ACCOUNT_NUMBER || NOT_SET}</span></p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className={cn('font-semibold', isDark ? 'text-forest-100' : 'text-forest-800')}>
                  {t('Send via', 'পাঠান')} {preferredPaymentMethod === 'NAGAD' ? 'Nagad' : 'bKash'} {t('Personal', 'পার্সোনাল')}
                </p>
                <p>
                  {t('Number', 'নম্বর')}:{' '}
                  <span className="font-semibold">
                    {(preferredPaymentMethod === 'NAGAD' ? NAGAD_NUMBER : BKASH_NUMBER) || NOT_SET}
                  </span>
                </p>
                <p className={cn('text-xs', isDark ? 'text-forest-400' : 'text-stone-600')}>
                  {t('Send the money, then attach the payment screenshot below.', 'টাকা পাঠিয়ে নিচে পেমেন্টের screenshot যুক্ত করুন।')}
                </p>
              </div>
            )}
          </div>
          <label className="block">
            <span className={cn(
              'mb-2 block text-xs font-semibold',
              isDark ? 'text-forest-200' : 'text-stone-700'
            )}>
              {t('Transaction ID', 'Transaction ID')} <span className="font-normal opacity-70">({t('optional', 'ঐচ্ছিক')})</span>
            </span>
            <input
              value={paymentTransactionId}
              onChange={(e) => setPaymentTransactionId(e.target.value)}
              className={cn('w-full px-3 py-2 text-sm', glassField.replace('rounded-2xl', 'rounded-xl'))}
              placeholder={t('Transaction ID / reference, if you have it', 'Transaction ID / reference (থাকলে)')}
            />
          </label>
          <label className="block">
            <span className={cn(
              'mb-2 block text-xs font-semibold',
              isDark ? 'text-forest-200' : 'text-stone-700'
            )}>
              {t('Payment screenshot', 'পেমেন্টের screenshot')} <span className="text-rose-600">*</span>
            </span>
            <input
              type="file"
              accept="image/*"
              required
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
            {t('Stay dates', 'থাকার তারিখ')}
          </span>
          <p className={cn(
            'mb-3 text-xs',
            isDark ? 'text-forest-400' : 'text-stone-500'
          )}>
            {t('Tap a date to book that night. Tap a later date to extend your stay. Booked nights are crossed out.', 'একটি তারিখে চাপলে সেই রাত বুক হবে; পরের কোনো তারিখে চাপলে থাকা বাড়বে। বুক করা রাত কাটা দেখাবে।')}
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
                modifiers={{ pending: pendingDates, booked: confirmedDates }}
                modifiersClassNames={{ pending: 'pv-pending', booked: 'pv-booked' }}
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
                <span className="font-semibold">{t('Check-in', 'চেক-ইন')}</span> {format(stay.checkIn, 'EEE d MMM')}
                {' · '}
                <span className="font-semibold">{t('Check-out', 'চেক-আউট')}</span> {format(stay.checkOut, 'EEE d MMM')}
                {' · '}
                {stay.nights} {stay.nights === 1 ? t('night', 'রাত') : t('nights', 'রাত')}
              </span>
              <button
                type="button"
                onClick={() => { setRange(undefined); setCalHint(''); }}
                className={cn('text-xs underline underline-offset-2', isDark ? 'text-forest-400 hover:text-forest-200' : 'text-stone-500 hover:text-stone-800')}
              >
                {t('Clear dates', 'তারিখ মুছুন')}
              </button>
            </div>
          )}
        </div>

        {/* Guests: the room's capacity is included; up to 2 extra persons are charged per night. */}
        <div className="sm:col-span-2">
          <span className={labelClass}>
            <Users className={iconClass} />
            {t('Guests', 'অতিথি')}
          </span>
          <div className="grid gap-3 sm:grid-cols-3">
            <Counter
              label={t('Adults', 'প্রাপ্তবয়স্ক')}
              hint={t(`${capacity} included`, `${capacity} জন অন্তর্ভুক্ত`)}
              value={adults}
              min={1}
              max={capacity + Math.max(0, MAX_EXTRA_PERSONS - childrenOver8)}
              onChange={setAdults}
              dark={isDark}
              field={glassField}
            />
            <Counter
              label={t('Children under 8', '৮ বছরের নিচে শিশু')}
              hint={t('free', 'ফ্রি')}
              value={childrenUnder8}
              min={0}
              max={6}
              onChange={setChildrenUnder8}
              dark={isDark}
              field={glassField}
            />
            <Counter
              label={t('Children 8+', '৮+ বছরের শিশু')}
              hint={`${fmtMoney(extraGuestCharge)}/${t('night', 'রাত')}`}
              value={childrenOver8}
              min={0}
              max={Math.max(0, MAX_EXTRA_PERSONS - extraAdults)}
              onChange={setChildrenOver8}
              dark={isDark}
              field={glassField}
            />
          </div>
          <p className={cn('mt-2 text-xs', isDark ? 'text-forest-400' : 'text-stone-500')}>
            {t(
              `${capacity} guests are included in the room rate. Up to ${MAX_EXTRA_PERSONS} extra persons (adults or children aged 8+) can be added at ${fmtMoney(extraGuestCharge)} per person per night; children under 8 stay free.`,
              `রুমের ভাড়ায় ${capacity} জন অন্তর্ভুক্ত। সর্বোচ্চ ${MAX_EXTRA_PERSONS} জন অতিরিক্ত (প্রাপ্তবয়স্ক বা ৮+ বছরের শিশু) যোগ করা যায়, জনপ্রতি প্রতি রাতে ${fmtMoney(extraGuestCharge)}; ৮ বছরের নিচে শিশু ফ্রি।`,
            )}
          </p>
          {selectedRoom && stay && (
            <div className={cn('mt-3 space-y-1 rounded-xl px-4 py-3 text-sm', isDark ? 'border border-forest-900/60 bg-[#0d1a0e] text-forest-200' : 'border border-forest-200/60 bg-forest-50/70 text-stone-700')}>
              <div className="flex justify-between"><span>{selectedRoom.name} × {stay.nights} {t('night(s)', 'রাত')}</span><span className="font-semibold tabular-nums">{fmtMoney(selectedRoom.price * stay.nights)}</span></div>
              {extraPersons > 0 && (
                <div className="flex justify-between"><span>{t('Extra persons', 'অতিরিক্ত ব্যক্তি')} {extraPersons} × {fmtMoney(extraGuestCharge)} × {stay.nights}</span><span className="font-semibold tabular-nums">{fmtMoney(extraPersons * extraGuestCharge * stay.nights)}</span></div>
              )}
              <div className={cn('flex justify-between border-t pt-1 font-semibold', isDark ? 'border-forest-900/60' : 'border-forest-200/60')}><span>{t('Estimated total', 'আনুমানিক মোট')}</span><span className="tabular-nums">{fmtMoney(selectedRoom.price * stay.nights + extraPersons * extraGuestCharge * stay.nights)}</span></div>
            </div>
          )}
        </div>

        <label className="sm:col-span-2">
          <span className={labelClass}>
            <UserRound className={iconClass} />
            {t('Full name', 'পুরো নাম')}
          </span>
          <input
            required
            minLength={2}
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className={cn('w-full px-4 py-3', glassField)}
            placeholder={t('Your name', 'আপনার নাম')}
          />
        </label>

        <label>
          <span className={labelClass}>
            <Phone className={iconClass} />
            {t('Phone', 'ফোন')}
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
            {t('Email', 'ইমেইল')}
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
                    {t('We email a 6-digit code to this address. Verify it once, then request your booking.', 'এই ঠিকানায় আমরা ৬ অঙ্কের একটি কোড ইমেইল করি। একবার যাচাই করে বুকিং অনুরোধ করুন।')}
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
                    {t('Send OTP to verify email', 'ইমেইল যাচাইয়ে OTP পাঠান')}
                  </button>
                </>
              )}
              {otpStep === 'sending' && (
                <p className={cn('text-xs text-center', isDark ? 'text-forest-400' : 'text-stone-500')}>
                  {t('Sending OTP…', 'OTP পাঠানো হচ্ছে…')}
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
                    placeholder={t('Enter 6-digit OTP', '৬ অঙ্কের OTP দিন')}
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
                      {otpStep === 'verifying' ? t('Verifying…', 'যাচাই হচ্ছে…') : t('Verify OTP', 'OTP যাচাই করুন')}
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
                      {otpResendTimer > 0 ? `${t('Resend', 'আবার পাঠান')} (${otpResendTimer}s)` : t('Resend', 'আবার পাঠান')}
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
              ✓ {t('Email verified', 'ইমেইল যাচাই হয়েছে')}
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
              {t('Vouchers for you', 'আপনার জন্য ভাউচার')}
            </p>
            <ul className="space-y-1.5">
              {emailVouchers.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className={isDark ? 'text-forest-100' : 'text-stone-800'}>
                    {v.name}{' '}
                    <span className="text-xs opacity-70">
                      ({v.discountType === 'PERCENT' ? `${v.discountValue}%` : `${fmtMoney(v.discountValue)}`})
                    </span>
                  </span>
                  <button
                    type="button"
                    className={cn(
                      'font-mono text-xs underline-offset-2 hover:underline',
                      isDark ? 'text-forest-300' : 'text-forest-700'
                    )}
                    onClick={() => {
                      setMessage(t(`Your code ends with ${v.codeHint} — enter the full code to apply.`, `আপনার কোড ${v.codeHint} দিয়ে শেষ — পুরো কোড লিখে প্রয়োগ করুন।`));
                      setStatus('idle');
                      setVoucherPreview(null);
                    }}
                    title={t('Code ends with this hint — enter the full code to apply', 'কোডের শেষ অংশ — পুরো কোড লিখে প্রয়োগ করুন')}
                  >
                    ••••{v.codeHint}
                  </button>
                </li>
              ))}
            </ul>
            <p className={cn('text-[11px]', isDark ? 'text-forest-500' : 'text-stone-500')}>
              {t('Enter the full code below to apply (hint shown for reference).', 'প্রয়োগ করতে নিচে পুরো কোডটি লিখুন (ইঙ্গিত শুধু মনে করিয়ে দিতে)।')}
            </p>
          </div>
        )}
        <label>
          <span className={labelClass}>{t('Voucher code', 'ভাউচার কোড')} <span className="font-normal opacity-70">({t('optional', 'ঐচ্ছিক')})</span></span>
          <div className="flex gap-2">
            <input
              value={voucherCode}
              onChange={(e) => {
                setVoucherCode(e.target.value.toUpperCase());
                setVoucherPreview(null);
              }}
              className={cn('w-full px-4 py-3', glassField)}
              placeholder={t('Have a code?', 'কোড আছে?')}
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
                  setMessage(t('Enter your email so we can check personal vouchers.', 'ব্যক্তিগত ভাউচার দেখতে আপনার ইমেইল দিন।'));
                  setStatus('err');
                  return;
                }
                const gross = room.price * stay.nights + extraPersons * extraGuestCharge * stay.nights;
                const res = await validatePublicVoucher({
                  code: voucherCode.trim(),
                  channel: 'ROOM',
                  grossAmount: gross,
                  lineItems: [{ itemType: 'ROOM', itemId: room.id, amount: gross }],
                  guestEmail: guestEmail.trim() || undefined,
                });
                if (res.ok) {
                  setVoucherPreview(`${t('Save', 'সাশ্রয়')} ${fmtMoney(res.discountAmount)} — ${t('pay', 'দিতে হবে')} ${fmtMoney(res.netAmount)}`);
                  setStatus('idle');
                  setMessage('');
                } else {
                  setVoucherPreview(null);
                  setMessage(res.message);
                  setStatus('err');
                }
              }}
            >
              {t('Apply', 'প্রয়োগ')}
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
        {status === 'loading' ? t('Sending…', 'পাঠানো হচ্ছে…') : t('Request booking', 'বুকিং অনুরোধ করুন')}
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
          {t('Availability preview', 'খালি আছে কি না')}
        </h3>
        <p className={cn(
          'mt-1 text-xs',
          isDark ? 'text-forest-400' : 'text-stone-600'
        )}>
          {t('Green = free · Amber = pending request · Red = booked (first 30 days shown)', 'সবুজ = খালি · হলুদ = অনুরোধ অপেক্ষমাণ · লাল = বুক করা (প্রথম ৩০ দিন)')}
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
                    : d.bookingStatus === 'PENDING'
                      ? isDark ? 'bg-amber-900/40 text-amber-200' : 'bg-amber-100 text-amber-800'
                      : isDark ? 'bg-rose-900/40 text-rose-300' : 'bg-rose-100 text-rose-800'
                )}
                title={d.status === 'FREE' ? t('Free', 'খালি') : d.bookingStatus === 'PENDING' ? t('Pending request', 'অনুরোধ অপেক্ষমাণ') : t('Booked', 'বুক করা')}
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
            {t('Availability unavailable right now.', 'এই মুহূর্তে availability দেখানো যাচ্ছে না।')}
          </p>
        )}
      </div>
      </div>
    </form>
  );
}

/** Small − / + stepper used for the guest counts. */
function Counter({ label, hint, value, min, max, onChange, dark, field }: {
  label: string; hint?: string; value: number; min: number; max: number; onChange: (n: number) => void; dark: boolean; field: string;
}) {
  const btn = cn(
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-35',
    dark ? 'border-forest-800 bg-forest-900/60 text-forest-100 hover:bg-forest-800' : 'border-forest-300 bg-white text-forest-800 hover:bg-forest-50',
  );
  return (
    <div className={cn('flex items-center justify-between gap-2 px-3 py-2', field)}>
      <div className="min-w-0">
        <p className={cn('text-xs font-semibold', dark ? 'text-forest-200' : 'text-stone-700')}>{label}</p>
        {hint && <p className={cn('text-[11px]', dark ? 'text-forest-400' : 'text-stone-500')}>{hint}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`${label} −`} className={btn} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}><Minus className="h-4 w-4" /></button>
        <span className="w-5 text-center text-sm font-bold tabular-nums">{value}</span>
        <button type="button" aria-label={`${label} +`} className={btn} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
