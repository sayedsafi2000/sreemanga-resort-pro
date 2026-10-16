import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RotateCcw } from 'lucide-react';
import { PAY_METHODS, METHOD_LABEL, fmt, todayYmd, errMsg } from '@/pages/Bookings/shared';

type Props = { payment: any | null; onClose: () => void; onDone: () => void };

/** "INV-00042" from a booking's sequential number; null when the payment isn't tied to a booking. */
export const invoiceLabelOf = (invoiceNo: number | null | undefined): string | null =>
  invoiceNo == null ? null : `INV-${String(invoiceNo).padStart(5, '0')}`;

/** "Guest name · INV-00042", or what the payment was for when it isn't a room booking. */
export function paymentLabel(p: any): string {
  const guest: string | undefined = p?.booking?.guest?.name || undefined;
  const inv: string | null = p?.booking?.invoiceLabel ?? invoiceLabelOf(p?.booking?.invoiceNo);
  if (guest || inv) return [guest, inv].filter(Boolean).join(' · ');
  if (p?.referenceType === 'RESTAURANT_ORDER') return 'Restaurant order';
  if (p?.referenceType === 'DAY_LONG_BOOKING') return 'Day-long booking';
  return p?.bookingId ? `Booking ${String(p.bookingId).slice(0, 8)}` : 'Payment';
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Staff can hand money back by any collectable method; Stripe (card) refunds are booked as a bank transfer. */
const defaultRefundMethod = (m: string | undefined): string =>
  m && (PAY_METHODS as readonly string[]).includes(m) ? m : 'BANK_TRANSFER';

/** Return (part of) a COMPLETED payment to the guest. Posts a cash OUT; the payment stays COMPLETED. */
const RefundDialog: React.FC<Props> = ({ payment, onClose, onDone }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('CASH');
  const [date, setDate] = useState(todayYmd());
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!payment) return;
    const left = round2(Math.max(0, (Number(payment.amount) || 0) - (Number(payment.refundedAmount) || 0)));
    setAmount(String(left));
    setMethod(defaultRefundMethod(payment.method));
    setDate(todayYmd());
    setReason('');
    setError(null);
  }, [payment]);

  if (!payment) return null;

  const original = Number(payment.amount) || 0;
  const already = Number(payment.refundedAmount) || 0;
  const remaining = round2(Math.max(0, original - already));
  const amt = Number(amount) || 0;
  const leftAfter = round2(Math.max(0, remaining - amt));

  const save = async () => {
    if (amt <= 0) { setError('Enter the amount to refund'); return; }
    if (amt > remaining + 0.005) { setError(`Refund exceeds the refundable balance (${fmt(remaining)})`); return; }
    if (!date) { setError('Pick the date the money went back'); return; }
    setSaving(true); setError(null);
    try {
      await api.post(`/payments/${payment.id}/refund`, { amount: amt, method, date, reason: reason.trim() || undefined });
      onDone(); onClose();
    } catch (e: any) { setError(errMsg(e, 'Could not record the refund')); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={!!payment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><RotateCcw className="h-4 w-4" /> Refund payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{paymentLabel(payment)}</span>
            {' · '}{METHOD_LABEL[payment.method] ?? payment.method}
            {payment.transactionId ? <span className="ml-1 font-mono text-xs">{payment.transactionId}</span> : null}
          </p>
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-3 text-sm">
            <div><div className="text-xs text-muted-foreground">Original amount</div><div className="font-semibold tabular-nums">{fmt(original)}</div></div>
            <div><div className="text-xs text-muted-foreground">Already refunded</div><div className={`font-semibold tabular-nums ${already > 0 ? 'text-amber-700' : ''}`}>{fmt(already)}</div></div>
            <div><div className="text-xs text-muted-foreground">Remaining</div><div className="font-semibold tabular-nums text-emerald-700">{fmt(remaining)}</div></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Refund amount (৳)</Label>
              <Input type="number" min={0} max={remaining} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Refund method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAY_METHODS.map((m) => <SelectItem key={m} value={m}>{METHOD_LABEL[m]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} max={todayYmd()} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="optional — e.g. early check-out" maxLength={500} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            After saving: <span className={`font-semibold ${leftAfter > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{leftAfter > 0 ? `${fmt(leftAfter)} still refundable` : 'fully refunded'}</span>
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <p className="text-xs text-muted-foreground">
            Posts a cash OUT and reduces the invoice's paid amount. Stripe refunds are recorded here only — issue the card refund in Stripe separately.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="expense" onClick={save} disabled={saving || amt <= 0}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-1 h-4 w-4" />}
            Refund{amt > 0 ? ` ${fmt(amt)}` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RefundDialog;
