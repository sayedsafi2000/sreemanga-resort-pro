import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';
import logoMark from '@/assets/logo-mark.png';
import { Button } from '@/components/ui/button';
import { Printer, Copy, Check, ArrowLeft, Pencil, Wallet, Loader2, MapPin, Phone, Mail, User, CalendarCheck, LogIn, LogOut, ShieldCheck, AlertTriangle } from 'lucide-react';
import DueCollectDialog from './DueCollectDialog';
import { type Booking, STATUS_META, METHOD_LABEL, fmt, fmtDate, fmtDateTime, copyText, errMsg } from './shared';

type Settings = Record<string, string>;

const BookingInvoice: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [settings, setSettings] = useState<Settings>({});
  const [logo, setLogo] = useState<string>(logoMark);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dueOpen, setDueOpen] = useState(false);

  const load = async () => {
    try {
      const [b, s, br] = await Promise.all([
        api.get(`/bookings/${id}`),
        api.get('/public/settings').catch(() => ({ data: {} })),
        api.get('/branding').catch(() => ({ data: {} })),
      ]);
      setBooking(b.data?.booking ?? null);
      setSettings((s.data?.settings as Settings) ?? {});
      const brand = (br.data?.settings ?? br.data ?? {}) as Record<string, string>;
      if (brand.site_logo) setLogo(brand.site_logo);
    } catch (e: any) { setError(errMsg(e, 'Could not load this invoice')); }
  };
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800">{error}</div>;
  if (!booking) return <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;

  const b = booking;
  const st = STATUS_META[b.status] ?? { label: b.status, cls: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' };
  const resortName = settings.resortName || 'Pina Vista';
  const policy = (settings.cancellationPolicy || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const nights: string[] = [];
  for (let i = 0; i < b.nights; i++) { const d = new Date(b.checkInDate); d.setDate(d.getDate() + i); nights.push(d.toISOString()); }
  const p = b.pricing;
  const completed = b.payments.filter((x) => x.status === 'COMPLETED');

  const copyLink = async () => { if (await copyText(window.location.href)) { setCopied(true); window.setTimeout(() => setCopied(false), 1500); } };

  return (
    <div className="mx-auto max-w-5xl space-y-4 print:max-w-none print:space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h1 className="text-xl font-bold tracking-tight">Booking Invoice <span className="font-mono text-primary">{b.invoiceLabel}</span></h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
          <Button variant="outline" onClick={() => navigate(`/bookings/${b.id}/edit`)}><Pencil className="mr-1 h-4 w-4" /> Edit</Button>
          {b.due > 0 && b.status !== 'CANCELLED' && <Button variant="expense" onClick={() => setDueOpen(true)}><Wallet className="mr-1 h-4 w-4" /> Collect due {fmt(b.due)}</Button>}
          <Button variant="outline" onClick={copyLink}>{copied ? <Check className="mr-1 h-4 w-4 text-emerald-600" /> : <Copy className="mr-1 h-4 w-4" />} Copy link</Button>
          <Button variant="ink" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" /> Print</Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-card print:rounded-none print:border-0 print:p-0 print:shadow-none sm:p-8">
        {/* Header */}
        <div className="flex flex-col gap-6 border-b pb-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <img src={logo} alt={resortName} className="h-20 w-20 rounded-2xl bg-black object-contain p-1.5" />
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-primary">{resortName}</h2>
              {settings.tagline && <p className="text-xs uppercase tracking-widest text-muted-foreground">{settings.tagline}</p>}
              {(settings.resortAddress || settings.address) && <p className="flex items-start gap-1.5 text-sm text-slate-600"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{settings.resortAddress || settings.address}</p>}
              <p className="flex flex-wrap gap-x-4 text-sm text-slate-600">
                {(settings.resortPhone || settings.phone) && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{settings.resortPhone || settings.phone}</span>}
                {(settings.resortEmail || settings.email) && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{settings.resortEmail || settings.email}</span>}
              </p>
              {settings.invoiceNote && <p className="mt-2 inline-block rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-900"><AlertTriangle className="mr-1 inline h-3 w-3" />{settings.invoiceNote}</p>}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-right text-sm md:min-w-[240px]">
            <p className="text-lg font-bold tracking-wide text-primary">BOOKING INVOICE</p>
            <p><span className="text-muted-foreground">Invoice #:</span> <span className="font-mono font-semibold">{b.invoiceLabel}</span></p>
            <p className="mt-1"><span className="text-muted-foreground">Type:</span> <span className={`ml-1 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase ${st.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{st.label}</span></p>
            <p><span className="text-muted-foreground">Booked:</span> {fmtDate(b.createdAt)}</p>
            <p><span className="text-muted-foreground">Printed:</span> {fmtDate(new Date())}</p>
            <div className="mt-1 flex flex-wrap justify-end gap-1">
              {b.isVip && <span className="rounded bg-yellow-100 px-1.5 text-[10px] font-bold text-yellow-800">VIP</span>}
              {b.isForeigner && <span className="rounded bg-sky-100 px-1.5 text-[10px] font-bold text-sky-800">FOREIGNER</span>}
              {b.isStakeholder && <span className="rounded bg-fuchsia-100 px-1.5 text-[10px] font-bold text-fuchsia-800">STAKEHOLDER</span>}
            </div>
          </div>
        </div>

        {/* Guest + booking details */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="overflow-hidden rounded-xl border">
            <h3 className="flex items-center gap-2 bg-teal-600 px-4 py-2 text-sm font-semibold text-white"><User className="h-4 w-4" /> Guest information</h3>
            <div className="space-y-1 p-4 text-sm">
              <p className="text-lg font-bold">{b.guest.name}</p>
              <p className="flex items-center gap-1.5 text-slate-600"><Phone className="h-3.5 w-3.5" />{b.guest.phone}</p>
              {b.guest.email && <p className="flex items-center gap-1.5 text-slate-600"><Mail className="h-3.5 w-3.5" />{b.guest.email}</p>}
              {b.guest.address && <p className="flex items-start gap-1.5 text-slate-600"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{b.guest.address}</p>}
              {b.guest.nid && <p className="text-slate-600">NID / Passport: {b.guest.nid}</p>}
            </div>
          </section>
          <section className="overflow-hidden rounded-xl border">
            <h3 className="flex items-center gap-2 bg-slate-700 px-4 py-2 text-sm font-semibold text-white"><CalendarCheck className="h-4 w-4" /> Booking details</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 p-4 text-sm">
              <dt className="text-muted-foreground">Generated by</dt><dd className="font-medium">{b.staff?.name ?? 'Website booking'}</dd>
              <dt className="text-muted-foreground">Created</dt><dd className="font-medium">{fmtDateTime(b.createdAt)}</dd>
              <dt className="text-muted-foreground"><LogIn className="mr-1 inline h-3.5 w-3.5" />Check-in</dt><dd className="font-medium">{fmtDate(b.checkInDate, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}{settings.checkInTime ? ` · ${settings.checkInTime}` : ''}</dd>
              <dt className="text-muted-foreground"><LogOut className="mr-1 inline h-3.5 w-3.5" />Check-out</dt><dd className="font-medium">{fmtDate(b.checkOutDate, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}{settings.checkOutTime ? ` · ${settings.checkOutTime}` : ''}</dd>
              <dt className="text-muted-foreground">Guests</dt><dd className="font-medium">{b.adults} adult{b.adults === 1 ? '' : 's'}{b.children ? `, ${b.children} child${b.children === 1 ? '' : 'ren'}` : ''}{b.extraPersons ? `, ${b.extraPersons} extra` : ''}</dd>
              {b.notes && <><dt className="text-muted-foreground">Notes</dt><dd className="font-medium">{b.notes}</dd></>}
            </dl>
          </section>
        </div>

        {/* Room details */}
        <section className="mt-6 overflow-hidden rounded-xl border">
          <h3 className="bg-primary px-4 py-2 text-sm font-semibold text-white">Room details</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-4 py-2">#</th><th className="px-4 py-2">Room</th><th className="px-4 py-2">Night</th><th className="px-4 py-2 text-right">Rate</th><th className="px-4 py-2 text-right">Extra persons</th><th className="px-4 py-2 text-right">Subtotal</th></tr>
              </thead>
              <tbody>
                {nights.map((d, i) => {
                  const extra = b.extraPersons * (b.room.extraGuestCharge ?? 0);
                  return (
                    <tr key={d} className="border-t">
                      <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-2 font-medium">{b.room.name}<div className="text-xs text-muted-foreground">{b.adults + b.children} persons</div></td>
                      <td className="px-4 py-2"><span className="rounded bg-teal-600 px-2 py-0.5 text-xs font-semibold text-white">{fmtDate(d)}</span></td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmt(p.rate)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{extra ? fmt(extra) : '—'}</td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums">{fmt(p.rate + extra)}</td>
                    </tr>
                  );
                })}
                {b.extraCharge > 0 && (
                  <tr className="border-t"><td className="px-4 py-2 text-muted-foreground">+</td><td className="px-4 py-2 font-medium" colSpan={4}>Extra charge{b.extraChargeNote ? ` — ${b.extraChargeNote}` : ''}</td><td className="px-4 py-2 text-right font-semibold tabular-nums">{fmt(b.extraCharge)}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Payment summary */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="overflow-hidden rounded-xl border">
            <h3 className="bg-slate-100 px-4 py-2 text-sm font-semibold">Payments received</h3>
            {completed.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No payment received yet.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {completed.map((x) => (
                    <tr key={x.id} className="border-t">
                      <td className="px-4 py-2">{fmtDate(x.createdAt)}</td>
                      <td className="px-4 py-2">{METHOD_LABEL[x.method] ?? x.method}{x.transactionId ? <span className="ml-1 font-mono text-xs text-muted-foreground">{x.transactionId}</span> : null}</td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums text-emerald-700">{fmt(x.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          <section className="overflow-hidden rounded-xl border">
            <h3 className="bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Payment summary</h3>
            <dl className="space-y-1.5 p-4 text-sm">
              <div className="flex justify-between"><dt>Room subtotal ({b.nights} night{b.nights === 1 ? '' : 's'})</dt><dd className="tabular-nums">{fmt(p.roomSubtotal)}</dd></div>
              {p.extraPersonTotal > 0 && <div className="flex justify-between"><dt>Extra persons</dt><dd className="tabular-nums">{fmt(p.extraPersonTotal)}</dd></div>}
              {p.extraCharge > 0 && <div className="flex justify-between"><dt>Extra charge</dt><dd className="tabular-nums">{fmt(p.extraCharge)}</dd></div>}
              {p.voucherDiscount > 0 && <div className="flex justify-between text-rose-700"><dt>Voucher discount{b.voucher ? ` (${b.voucher.name})` : ''}</dt><dd className="tabular-nums">− {fmt(p.voucherDiscount)}</dd></div>}
              {p.staffDiscount > 0 && <div className="flex justify-between text-rose-700"><dt>Discount</dt><dd className="tabular-nums">− {fmt(p.staffDiscount)}</dd></div>}
              <div className="flex justify-between border-t pt-2 text-base font-bold"><dt>Invoice amount</dt><dd className="tabular-nums text-primary">{fmt(b.totalAmount)}</dd></div>
              <div className="flex justify-between"><dt>Paid</dt><dd className="tabular-nums text-emerald-700">{fmt(b.paid)}</dd></div>
              <div className="flex justify-between text-base font-bold"><dt className={b.due > 0 ? 'text-rose-700' : 'text-emerald-700'}>{b.due > 0 ? 'Due amount' : 'Fully paid'}</dt><dd className={`tabular-nums ${b.due > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{fmt(b.due)}</dd></div>
            </dl>
          </section>
        </div>

        {/* Policy */}
        {policy.length > 0 && (
          <section className="mt-6 overflow-hidden rounded-xl border">
            <h3 className="flex items-center gap-2 bg-rose-600 px-4 py-2 text-sm font-semibold text-white"><AlertTriangle className="h-4 w-4" /> Cancellation policy</h3>
            <ul className="space-y-1.5 p-4 text-sm text-slate-700">
              {policy.map((line, i) => <li key={i} className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{line}</li>)}
            </ul>
          </section>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />This is a computer-generated document. No signature is required.</p>
      </div>

      <DueCollectDialog booking={dueOpen ? b : null} onClose={() => setDueOpen(false)} onDone={load} />
    </div>
  );
};

export default BookingInvoice;
