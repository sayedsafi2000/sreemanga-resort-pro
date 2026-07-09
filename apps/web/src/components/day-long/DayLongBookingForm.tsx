'use client';

import { useMemo, useState } from 'react';
import {
  submitDayLongBooking,
  sendBookingOtp,
  verifyBookingOtp,
  type DayLongProduct,
} from '@/lib/resort-api';

type Props = { products: DayLongProduct[] };

export default function DayLongBookingForm({ products }: Props) {
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
      setMessage({ ok: true, text: r.devOtp ? `OTP (dev): ${r.devOtp}` : r.message });
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
      <h3 className="mb-4 text-lg font-semibold">Book a Day-Use</h3>

      {step === 'form' ? (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Package</label>
            <select className={inputCls} value={productId} onChange={(e) => setProductId(e.target.value)}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ৳{p.basePrice}
                  {p.pricePerPerson ? ` + ৳${p.pricePerPerson}/person` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Date</label>
              <input type="date" className={inputCls} value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">From</label>
              <input type="time" className={inputCls} value={slotStart} onChange={(e) => setSlotStart(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">To</label>
              <input type="time" className={inputCls} value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Adults</label>
              <input type="number" min={1} className={inputCls} value={adults} onChange={(e) => setAdults(Number(e.target.value))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Children</label>
              <input type="number" min={0} className={inputCls} value={children} onChange={(e) => setChildren(Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input className={inputCls} value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Phone</label>
              <input className={inputCls} value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input type="email" className={inputCls} value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Notes (optional)</label>
            <textarea className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm text-gray-600">
              Estimated total: <span className="text-base font-semibold text-gray-900">৳{total}</span>
            </span>
            <button
              disabled={!canSubmit || busy}
              onClick={sendOtp}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Continue'}
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
            placeholder="Enter OTP"
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
              {busy ? 'Confirming…' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
