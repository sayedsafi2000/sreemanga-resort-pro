import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { useAuth } from '@/contexts/AuthContext';
import { canEditPayments } from '@/config/rbac';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Pencil, Wallet, Clock, Hash, RotateCcw, Undo2, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { InitialsAvatar } from '@/components/ui/avatar';
import { fmt, fmtDate, METHOD_LABEL, errMsg } from '@/pages/Bookings/shared';
import RefundDialog, { invoiceLabelOf, paymentLabel } from './RefundDialog';

const paymentMethods = ['CASH', 'CARD', 'BKASH', 'NAGAD'];
// REFUNDED is no longer set by hand — the Refund action records the amount and date instead.
// Legacy rows that already carry the status keep their badge colour (see statusColor).
const paymentStatuses = ['PENDING', 'COMPLETED', 'FAILED'];

/** Amount of a payment that is still in the till: what was received minus what went back to the guest. */
const netOf = (p: any) => (Number(p?.amount) || 0) - (Number(p?.refundedAmount) || 0);

const Payments: React.FC = () => {
  const { user } = useAuth();
  const editPayments = canEditPayments(user?.role);
  const [payments, setPayments] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [refundTarget, setRefundTarget] = useState<any>(null);
  const [form, setForm] = useState({ bookingId: '', amount: '', method: 'CASH', transactionId: '', notes: '' });
  const [editForm, setEditForm] = useState({ status: 'COMPLETED', transactionId: '', notes: '' });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [refundsLoading, setRefundsLoading] = useState(true);
  const [refundsError, setRefundsError] = useState<string | null>(null);

  const rangeQs = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    return params.toString() ? `?${params.toString()}` : '';
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, bRes] = await Promise.all([api.get(`/payments${rangeQs()}`), api.get('/bookings')]);
      setPayments(unwrapList(pRes, ['payments']));
      setBookings(unwrapList(bRes, ['bookings']));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Refunds are listed by the day the money went back (not by the original payment date),
  // so they are a separate request with their own loading / empty / error states.
  const fetchRefunds = async () => {
    setRefundsLoading(true);
    setRefundsError(null);
    try {
      const res = await api.get(`/payments/refunds${rangeQs()}`);
      setRefunds(unwrapList(res, ['refunds']));
    } catch (err: any) {
      console.error(err);
      setRefunds([]);
      setRefundsError(errMsg(err, 'Could not load refunds'));
    } finally {
      setRefundsLoading(false);
    }
  };

  const refresh = () => { fetchData(); fetchRefunds(); };

  // Undo a mis-keyed refund (SUPER_ADMIN only on the API): restores paid/due and reverses the ledger.
  const canUndoRefund = user?.role === 'SUPER_ADMIN';
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const undoRefund = async (r: any) => {
    if (!window.confirm(`Undo the refund of ${fmt(r.amount)}? The payment will count as collected again.`)) return;
    setUndoingId(r.id);
    try {
      await api.delete(`/payments/refunds/${r.id}`);
      refresh();
    } catch (err: any) {
      setRefundsError(errMsg(err, 'Could not undo the refund'));
    } finally {
      setUndoingId(null);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dateFrom, dateTo]);

  const openNew = () => {
    setForm({ bookingId: '', amount: '', method: 'CASH', transactionId: '', notes: '' });
    setSaveError(null);
    setOpen(true);
  };

  const openEditPayment = (p: any) => {
    setEditingPayment(p);
    setEditForm({
      status: p.status,
      transactionId: p.transactionId || '',
      notes: p.notes || '',
    });
    setSaveError(null);
    setEditOpen(true);
  };

  // Refunded money is subtracted so it can be collected again.
  const completedPaidForBooking = (bookingId: string) =>
    payments
      .filter((p: any) => p.bookingId === bookingId && p.status === 'COMPLETED')
      .reduce((s: number, p: any) => s + netOf(p), 0);

  const remainingForBooking = (b: any) =>
    Math.max(0, (b.totalAmount || 0) - completedPaidForBooking(b.id));

  const handleSave = async () => {
    const data = {
      bookingId: form.bookingId,
      amount: Number(form.amount),
      method: form.method,
      transactionId: form.transactionId.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    setSaving(true);
    setSaveError(null);
    try {
      await api.post('/payments', data);
      setOpen(false);
      refresh();
    } catch (err: any) {
      setSaveError(errMsg(err, 'Failed to record payment'));
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingPayment) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.put(`/payments/${editingPayment.id}`, {
        // Only send the status when it changed — a legacy REFUNDED row can't be re-submitted as REFUNDED.
        status: editForm.status !== editingPayment.status ? editForm.status : undefined,
        transactionId: editForm.transactionId.trim() || null,
        notes: editForm.notes.trim() || null,
      });
      setEditOpen(false);
      setEditingPayment(null);
      refresh();
    } catch (err: any) {
      setSaveError(errMsg(err, 'Failed to update payment'));
    } finally {
      setSaving(false);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'COMPLETED': return 'success';
      case 'PENDING': return 'warning';
      case 'FAILED': return 'destructive';
      case 'REFUNDED': return 'secondary';
      default: return 'outline';
    }
  };

  // Collected = completed payments net of refunds; Refunded = everything handed back on the listed rows.
  const totalCompleted = payments
    .filter((p: any) => p.status === 'COMPLETED')
    .reduce((sum: number, p: any) => sum + netOf(p), 0);
  const totalRefunded = payments.reduce((sum: number, p: any) => sum + (Number(p.refundedAmount) || 0), 0);
  const refundsTotal = refunds.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);

  // Breakdown of payment methods by count — drives the tracking panel bars.
  const methodBreakdown = (() => {
    const counts: Record<string, number> = {};
    payments.forEach((p: any) => {
      const m = p.method || 'OTHER';
      counts[m] = (counts[m] || 0) + 1;
    });
    const total = payments.length || 1;
    const palette: Record<string, string> = {
      CARD: 'bg-blue-500',
      CASH: 'bg-amber-500',
      BKASH: 'bg-pink-500',
      NAGAD: 'bg-orange-500',
      OTHER: 'bg-slate-400',
    };
    return Object.entries(counts)
      .map(([method, count]) => ({
        method,
        count,
        pct: Math.round((count / total) * 100),
        color: palette[method] || 'bg-slate-400',
      }))
      .sort((a, b) => b.count - a.count);
  })();

  const bookingLabel = (b: any) => {
    const guest = b.guest?.name || b.guestId?.slice(0, 8);
    const due = remainingForBooking(b);
    return `${guest} — ৳${b.totalAmount}${due > 0 ? ` (due ৳${due})` : ' (paid)'}`;
  };

  const selectedBooking = bookings.find((b: any) => b.id === form.bookingId);
  const selectedDue = selectedBooking ? remainingForBooking(selectedBooking) : null;
  const editingHasRefunds = (Number(editingPayment?.refundedAmount) || 0) > 0;
  const editStatusOptions = editingPayment && !paymentStatuses.includes(editingPayment.status)
    ? [...paymentStatuses, editingPayment.status] // legacy REFUNDED rows keep their current value selectable
    : paymentStatuses;
  const rangeActive = Boolean(dateFrom || dateTo);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Payments & Revenue"
        description="Real-time financial performance and transaction monitoring."
        actions={
          <Button variant="default" onClick={openNew}>
            <DollarSign className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        }
      />
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
        {rangeActive && (
          <Button variant="outline" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>
            Clear
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="card-base card-lift p-5 fade-up fade-up-1">
          <div className="flex items-start justify-between">
            <p className="eyebrow">Total Collected</p>
            <span className="stat-green stat-icon-bg flex h-9 w-9 items-center justify-center rounded-lg"><Wallet className="h-[18px] w-[18px]" /></span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight value-pop">{fmt(totalCompleted)}</p>
          <p className="mt-2 text-xs text-muted-foreground">Completed payments, net of refunds</p>
        </div>
        <div className="card-base card-lift p-5 fade-up fade-up-2">
          <div className="flex items-start justify-between">
            <p className="eyebrow">Total Payments</p>
            <span className="stat-blue stat-icon-bg flex h-9 w-9 items-center justify-center rounded-lg"><Hash className="h-[18px] w-[18px]" /></span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight value-pop">{payments.length}</p>
          <p className="mt-2 text-xs text-muted-foreground">All transactions</p>
        </div>
        <div className="card-base card-lift p-5 fade-up fade-up-3">
          <div className="flex items-start justify-between">
            <p className="eyebrow">Pending</p>
            <span className="stat-amber stat-icon-bg flex h-9 w-9 items-center justify-center rounded-lg"><Clock className="h-[18px] w-[18px]" /></span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight value-pop">{payments.filter((p: any) => p.status === 'PENDING').length}</p>
          <p className="mt-2 text-xs text-muted-foreground">Awaiting completion</p>
        </div>
        <div className="card-base card-lift p-5 fade-up fade-up-4">
          <div className="flex items-start justify-between">
            <p className="eyebrow">Refunded</p>
            <span className="stat-rose stat-icon-bg flex h-9 w-9 items-center justify-center rounded-lg"><RotateCcw className="h-[18px] w-[18px]" /></span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight value-pop">{fmt(totalRefunded)}</p>
          <p className="mt-2 text-xs text-muted-foreground">Returned to guests from listed payments</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card className="min-w-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-base font-semibold text-foreground">Transaction History</h3>
              <span className="text-xs text-muted-foreground">{payments.length} records</span>
            </div>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Txn ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    {editPayments && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => {
                    const refunded = Number(p.refundedAmount) || 0;
                    const invoice = p.booking?.invoiceLabel ?? invoiceLabelOf(p.booking?.invoiceNo);
                    const canRefund = editPayments && p.status === 'COMPLETED' && netOf(p) > 0.005;
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <InitialsAvatar name={p.booking?.guest?.name || 'Guest'} className="h-8 w-8" />
                            <div className="min-w-0">
                              <div className="font-medium">{p.booking?.guest?.name || p.bookingId?.slice(0, 8)}</div>
                              {invoice && <div className="font-mono text-[11px] text-muted-foreground">{invoice}</div>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold tabular">
                          <div>{fmt(p.amount)}</div>
                          {refunded > 0 && <Badge variant="warning" className="mt-1 whitespace-nowrap">Refunded {fmt(refunded)}</Badge>}
                        </TableCell>
                        <TableCell>{p.method}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.transactionId ? <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">{p.transactionId}</span> : '—'}
                        </TableCell>
                        <TableCell><Badge variant={statusColor(p.status) as any}>{p.status}</Badge></TableCell>
                        <TableCell>{fmtDate(p.paidAt ?? p.createdAt)}</TableCell>
                        {editPayments && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-0.5">
                              {canRefund && (
                                <Button variant="ghost" size="icon" title="Refund" aria-label="Refund" onClick={() => setRefundTarget(p)}>
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" title="Edit" aria-label="Edit" onClick={() => openEditPayment(p)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={editPayments ? 7 : 6} className="text-center py-8 text-muted-foreground">
                        {loading
                          ? 'Loading payments...'
                          : rangeActive
                            ? 'No payments in selected range.'
                            : 'No payments yet. Click Record Payment to add one.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Refunds</h3>
                <p className="text-xs text-muted-foreground">{rangeActive ? 'Money returned to guests in the selected range' : 'Money returned to guests'}</p>
              </div>
              <span className="text-sm font-semibold tabular text-rose-700">{refunds.length > 0 ? `−${fmt(refundsTotal)}` : `${refunds.length} records`}</span>
            </div>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Guest / invoice</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    {canUndoRefund && <TableHead className="text-right">Undo</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refunds.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>{fmtDate(r.refundedAt)}</TableCell>
                      <TableCell className="font-medium">
                        {paymentLabel({ ...(r.payment ?? {}), referenceType: r.referenceType ?? r.payment?.referenceType })}
                      </TableCell>
                      <TableCell>{METHOD_LABEL[r.method] ?? r.method}</TableCell>
                      <TableCell className="text-right font-semibold tabular text-rose-700">−{fmt(r.amount)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.reason || '—'}</TableCell>
                      {canUndoRefund && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" title="Undo this refund" aria-label="Undo refund" disabled={undoingId === r.id} onClick={() => undoRefund(r)}>
                            {undoingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4 text-rose-700" />}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {refunds.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canUndoRefund ? 6 : 5} className="text-center py-8 text-muted-foreground">
                        {refundsLoading
                          ? 'Loading refunds...'
                          : refundsError
                            ? <span className="text-rose-700">{refundsError}</span>
                            : rangeActive
                              ? 'No refunds in selected range.'
                              : 'No refunds recorded yet.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-base font-semibold text-foreground">Payment Method Tracking</h3>
            <p className="text-xs text-muted-foreground">Share of recorded transactions</p>
          </div>
          <CardContent className="space-y-4 p-5">
            {methodBreakdown.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No data yet.</p>
            ) : (
              methodBreakdown.map((m) => (
                <div key={m.method}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{m.method}</span>
                    <span className="tabular text-muted-foreground">{m.pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className={`progress-animated h-full rounded-full ${m.color}`} style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Booking</Label><Select value={form.bookingId} onValueChange={(v) => {
              const b = bookings.find((x: any) => x.id === v);
              const due = b ? remainingForBooking(b) : 0;
              setForm({ ...form, bookingId: v, amount: due > 0 ? String(due) : '' });
              setSaveError(null);
            }}><SelectTrigger><SelectValue placeholder="Select booking" /></SelectTrigger><SelectContent>{bookings.map((b: any) => <SelectItem key={b.id} value={b.id}>{bookingLabel(b)}</SelectItem>)}</SelectContent></Select></div>
            {selectedDue != null && (
              <p className="text-sm text-muted-foreground">
                Remaining balance: <span className="font-medium text-foreground">৳{selectedDue.toLocaleString()}</span>
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Amount (৳)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="space-y-2"><Label>Method</Label><Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{paymentMethods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2">
              <Label>Transaction ID (optional)</Label>
              <Input
                value={form.transactionId}
                onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
                placeholder="e.g. bKash TXN ID"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Internal note"
              />
            </div>
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            <p className="text-xs text-muted-foreground">Posts to Cash/Bank and Room Revenue accounts. Day Long payments are recorded from the Day Long page.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.bookingId || !Number(form.amount)}>
              {saving ? 'Saving…' : 'Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })} disabled={editingHasRefunds}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{editStatusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              {editingHasRefunds && (
                <p className="text-xs text-muted-foreground">This payment has refunds recorded, so it stays COMPLETED. Use the Refund action to return more.</p>
              )}
            </div>
            <div className="space-y-2"><Label>Transaction ID</Label><Input value={editForm.transactionId} onChange={(e) => setEditForm({ ...editForm, transactionId: e.target.value })} placeholder="e.g. bKash TXN ID" /></div>
            <div className="space-y-2"><Label>Notes</Label><Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RefundDialog payment={refundTarget} onClose={() => setRefundTarget(null)} onDone={refresh} />
    </div>
  );
};

export default Payments;
