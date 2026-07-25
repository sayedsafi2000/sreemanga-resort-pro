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
import { DollarSign, Pencil, Wallet, Clock, Hash } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { InitialsAvatar } from '@/components/ui/avatar';

const paymentMethods = ['CASH', 'CARD', 'BKASH', 'NAGAD'];
const paymentStatuses = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];

const Payments: React.FC = () => {
  const { user } = useAuth();
  const editPayments = canEditPayments(user?.role);
  const [payments, setPayments] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [form, setForm] = useState({ bookingId: '', amount: '', method: 'CASH', transactionId: '', notes: '' });
  const [editForm, setEditForm] = useState({ status: 'COMPLETED', transactionId: '', notes: '' });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const [pRes, bRes] = await Promise.all([api.get(`/payments${qs}`), api.get('/bookings')]);
      setPayments(unwrapList(pRes, ['payments']));
      setBookings(unwrapList(bRes, ['bookings']));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dateFrom, dateTo]);

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

  const completedPaidForBooking = (bookingId: string) =>
    payments
      .filter((p: any) => p.bookingId === bookingId && p.status === 'COMPLETED')
      .reduce((s: number, p: any) => s + (p.amount || 0), 0);

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
      fetchData();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || 'Failed to record payment');
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
        status: editForm.status,
        transactionId: editForm.transactionId.trim() || null,
        notes: editForm.notes.trim() || null,
      });
      setEditOpen(false);
      setEditingPayment(null);
      fetchData();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || 'Failed to update payment');
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

  const totalCompleted = payments.filter((p: any) => p.status === 'COMPLETED').reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

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
        {(dateFrom || dateTo) && (
          <Button variant="outline" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>
            Clear
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card-base card-lift p-5 fade-up fade-up-1">
          <div className="flex items-start justify-between">
            <p className="eyebrow">Total Collected</p>
            <span className="stat-green stat-icon-bg flex h-9 w-9 items-center justify-center rounded-lg"><Wallet className="h-[18px] w-[18px]" /></span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight value-pop">৳{totalCompleted.toLocaleString()}</p>
          <p className="mt-2 text-xs text-muted-foreground">Completed payments</p>
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
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <InitialsAvatar name={p.booking?.guest?.name || 'Guest'} className="h-8 w-8" />
                      <span className="font-medium">{p.booking?.guest?.name || p.bookingId?.slice(0, 8)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold tabular">৳{p.amount?.toLocaleString?.() ?? p.amount}</TableCell>
                  <TableCell>{p.method}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.transactionId ? <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">{p.transactionId}</span> : '—'}
                  </TableCell>
                  <TableCell><Badge variant={statusColor(p.status) as any}>{p.status}</Badge></TableCell>
                  <TableCell>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-'}</TableCell>
                  {editPayments && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditPayment(p)}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={editPayments ? 7 : 6} className="text-center py-8 text-muted-foreground">
                    {loading
                      ? 'Loading payments...'
                      : dateFrom || dateTo
                        ? 'No payments in selected range.'
                        : 'No payments yet. Click Record Payment to add one.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
            <div className="space-y-2"><Label>Status</Label><Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{paymentStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
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
    </div>
  );
};

export default Payments;
