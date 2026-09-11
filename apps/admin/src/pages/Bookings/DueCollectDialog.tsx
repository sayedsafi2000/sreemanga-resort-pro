import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wallet } from 'lucide-react';
import { type Booking, PAY_METHODS, METHOD_LABEL, fmt, errMsg } from './shared';

type Props = { booking: Booking | null; onClose: () => void; onDone: () => void };

/** Collect (part of) the outstanding balance of a booking; optional extra discount. */
const DueCollectDialog: React.FC<Props> = ({ booking, onClose, onDone }) => {
  const [amount, setAmount] = useState('');
  const [discount, setDiscount] = useState('0');
  const [method, setMethod] = useState<string>('CASH');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (booking) { setAmount(String(booking.due)); setDiscount('0'); setMethod('CASH'); setTransactionId(''); setNotes(''); setError(null); }
  }, [booking]);

  if (!booking) return null;
  const disc = Number(discount) || 0;
  const dueAfterDiscount = Math.max(0, booking.due - disc);
  const amt = Number(amount) || 0;
  const remaining = Math.max(0, dueAfterDiscount - amt);

  const save = async () => {
    if (disc < 0 || disc > booking.due) { setError('Discount must be between 0 and the due amount'); return; }
    if (amt <= 0 && disc <= 0) { setError('Enter an amount or a discount'); return; }
    if (amt > dueAfterDiscount + 0.005) { setError(`Amount exceeds the due (${fmt(dueAfterDiscount)})`); return; }
    setSaving(true); setError(null);
    try {
      if (disc > 0) await api.put(`/bookings/${booking.id}`, { staffDiscount: booking.staffDiscount + disc });
      if (amt > 0) await api.post('/payments', { bookingId: booking.id, amount: amt, method, transactionId: transactionId || undefined, notes: notes || undefined });
      onDone(); onClose();
    } catch (e: any) { setError(errMsg(e, 'Failed to record payment')); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={!!booking} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Due collection — {booking.invoiceLabel}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-3 text-sm">
            <div><div className="text-xs text-muted-foreground">Invoice</div><div className="font-semibold tabular-nums">{fmt(booking.totalAmount)}</div></div>
            <div><div className="text-xs text-muted-foreground">Paid</div><div className="font-semibold tabular-nums text-emerald-700">{fmt(booking.paid)}</div></div>
            <div><div className="text-xs text-muted-foreground">Due</div><div className="font-semibold tabular-nums text-rose-700">{fmt(booking.due)}</div></div>
          </div>
          <p className="text-sm text-muted-foreground">{booking.guest.name} · {booking.guest.phone} · {booking.room.name}</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount (৳)</Label><Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><Label>Extra discount (৳)</Label><Input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fund / method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAY_METHODS.map((m) => <SelectItem key={m} value={m}>{METHOD_LABEL[m]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Transaction ID</Label><Input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="optional" /></div>
          </div>
          <div><Label>Note</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment reference…" /></div>
          <p className="text-xs text-muted-foreground">After saving: <span className={`font-semibold ${remaining > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{remaining > 0 ? `${fmt(remaining)} still due` : 'fully paid'}</span></p>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DueCollectDialog;
