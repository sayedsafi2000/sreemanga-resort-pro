'use client';

import { useMemo, useState } from 'react';
import { fmtMoney } from '@/lib/format';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  submitDayLongBooking,
  sendBookingOtp,
  verifyBookingOtp,
  validatePublicVoucher,
  type DayLongProduct,
} from '@/lib/resort-api';

type Props = { products: DayLongProduct[] };

export default function DayLongBookingForm({ products }: Props) {
  const { t } = useLanguage();
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [bookingDate, setBookingDate] = useState('');
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd] = useState('17:00');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherPreview, setVoucherPreview] = useState<string | null>(null);

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [done, setDone] = useState(false);

  const product = useMemo(() => products.find((p) => p.id === productId), [products, productId]);

  const total = useMemo(() => {
    if (!product) return 0;
    return product.basePrice + (product.pricePerPerson ?? 0) * (adults + children);
  }, [product, adults, children]);

  const canSubmit = productId && bookingDate && guestName && guestPhone && guestEmail && slotEnd > slotStart;

  const sendOtp = async () => {
    setBusy(true);
    setMessage(null);
    const r = await sendBookingOtp(guestEmail);
    setBusy(false);
    if (r.ok) {
      setStep('otp');
      setOtp('');
      setMessage({ ok: true, text: r.message });
    } else {
      setMessage({ ok: false, text: r.message });
    }
  };

  const confirm = async () => {
    setBusy(true);
    setMessage(null);
    const v = await verifyBookingOtp(guestEmail, otp);
    if (!v.ok) {
      setBusy(false);
      setMessage({ ok: false, text: v.message });
      return;
    }
    const r = await submitDayLongBooking({
      productId,
      guestName,
      guestPhone,
      guestEmail,
      bookingDate,
      slotStart,
      slotEnd,
      adults,
      children,
      notes: notes || undefined,
      ...(voucherCode.trim() ? { voucherCode: voucherCode.trim() } : {}),
    });
    setBusy(false);
    setMessage({ ok: r.ok, text: r.message });
    if (r.ok) setDone(true);
  };

  if (done) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-green-800">
        <p className="font-semibold">Booking received ✓</p>
        <p className="mt-1 text-sm">{message?.text}</p>
      </div>
    );
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">{t('Book a Day-Use', 'ডে-ইউজ বুক করুন')}</h3>

      {step === 'form' ? (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('Package', 'প্যাকেজ')}</label>
            <select className={inputCls} value={productId} onChange={(e) => setProductId(e.target.value)}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {fmtMoney(p.basePrice)}
                  {p.pricePerPerson ? ` + ${fmtMoney(p.pricePerPerson)}/person` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('Date', 'তারিখ')}</label>
              <input type="date" className={inputCls} value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('From', 'শুরু')}</label>
              <input type="time" className={inputCls} value={slotStart} onChange={(e) => setSlotStart(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">To</label>
              <input type="time" className={inputCls} value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('Adults', 'প্রাপ্তবয়স্ক')}</label>
              <input type="number" min={1} className={inputCls} value={adults} onChange={(e) => setAdults(Number(e.target.value))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('Children', 'শিশু')}</label>
              <input type="number" min={0} className={inputCls} value={children} onChange={(e) => setChildren(Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('Name', 'নাম')}</label>
              <input className={inputCls} value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('Phone', 'ফোন')}</label>
              <input className={inputCls} value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('Email', 'ইমেইল')}</label>
            <input type="email" className={inputCls} value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('Notes (optional)', 'নোট (ঐচ্ছিক)')}</label>
            <textarea className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('Voucher code (optional)', 'ভাউচার কোড (ঐচ্ছিক)')}</label>
            <div className="flex gap-2">
              <input
                className={inputCls}
                value={voucherCode}
                onChange={(e) => {
                  setVoucherCode(e.target.value.toUpperCase());
                  setVoucherPreview(null);
                }}
                placeholder={t('Have a code?', 'কোড আছে?')}
              />
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-3 text-sm"
                disabled={!voucherCode.trim() || !product || total <= 0}
                onClick={async () => {
                  if (!product) return;
                  const r = await validatePublicVoucher({
                    code: voucherCode.trim(),
                    channel: 'DAY_LONG',
                    grossAmount: total,
                    lineItems: [
                      { itemType: 'DAY_LONG_PRODUCT', itemId: product.id, amount: total },
                    ],
                    guestEmail: guestEmail || undefined,
                  });
                  if (r.ok) {
                    setVoucherPreview(`Save ${fmtMoney(r.discountAmount)} — pay ${fmtMoney(r.netAmount)}`);
                  } else {
                    setVoucherPreview(null);
                    setMessage({ ok: false, text: r.message });
                  }
                }}
              >
                Apply
              </button>
            </div>
            {voucherPreview && <p className="mt-1 text-sm text-green-700">{voucherPreview}</p>}
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm text-gray-600">
              Estimated total: <span className="text-base font-semibold text-gray-900">{fmtMoney(total)}</span>
            </span>
            <button
              disabled={!canSubmit || busy}
              onClick={sendOtp}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? t('Sending…', 'পাঠানো হচ্ছে…') : t('Continue', 'এগিয়ে যান')}
            </button>
          </div>
          {message && (
            <p className={`text-sm ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">We sent a 6-digit code to {guestEmail}. Enter it to confirm.</p>
          <input
            className={inputCls}
            placeholder={t('Enter OTP', 'OTP দিন')}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          {message && (
            <p className={`text-sm ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setStep('form')}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
            >
              Back
            </button>
            <button
              disabled={otp.length < 4 || busy}
              onClick={confirm}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? t('Confirming…', 'নিশ্চিত হচ্ছে…') : t('Confirm Booking', 'বুকিং নিশ্চিত করুন')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
