import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { useAuth } from '@/contexts/AuthContext';
import { canEditPayments } from '@/config/rbac';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Pencil } from 'lucide-react';

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
    setOpen(true);
  };

  const openEditPayment = (p: any) => {
    setEditingPayment(p);
    setEditForm({
      status: p.status,
      transactionId: p.transactionId || '',
      notes: p.notes || '',
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    const data = {
      bookingId: form.bookingId,
      amount: Number(form.amount),
      method: form.method,
      transactionId: form.transactionId.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    try {
      await api.post('/payments', data);
      setOpen(false);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleEditSave = async () => {
    if (!editingPayment) return;
    try {
      await api.put(`/payments/${editingPayment.id}`, {
        status: editForm.status,
        transactionId: editForm.transactionId.trim() || null,
        notes: editForm.notes.trim() || null,
      });
      setEditOpen(false);
      setEditingPayment(null);
      fetchData();
    } catch (err) { console.error(err); }
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

  const bookingLabel = (b: any) => {
    const guest = b.guest?.name || b.guestId?.slice(0, 8);
    return `${guest} — ৳${b.totalAmount}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Payments</h1>
        <Button onClick={openNew}>Record Payment</Button>
      </div>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Collected</CardTitle><DollarSign className="h-4 w-4 text-emerald-600" /></CardHeader><CardContent><div className="text-2xl font-bold">৳{totalCompleted.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Payments</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{payments.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Pending</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{payments.filter((p: any) => p.status === 'PENDING').length}</div></CardContent></Card>
      </div>
      <Card>
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
                  <TableCell>{p.booking?.guest?.name || p.bookingId?.slice(0, 8)}</TableCell>
                  <TableCell>৳{p.amount?.toLocaleString?.() ?? p.amount}</TableCell>
                  <TableCell>{p.method}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.transactionId || '—'}</TableCell>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Booking</Label><Select value={form.bookingId} onValueChange={(v) => setForm({ ...form, bookingId: v })}><SelectTrigger><SelectValue placeholder="Select booking" /></SelectTrigger><SelectContent>{bookings.map((b: any) => <SelectItem key={b.id} value={b.id}>{bookingLabel(b)}</SelectItem>)}</SelectContent></Select></div>
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
            <p className="text-xs text-muted-foreground">New payments are recorded as completed on the server.</p>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave}>Record</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Status</Label><Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{paymentStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Transaction ID</Label><Input value={editForm.transactionId} onChange={(e) => setEditForm({ ...editForm, transactionId: e.target.value })} placeholder="e.g. bKash TXN ID" /></div>
            <div className="space-y-2"><Label>Notes</Label><Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={handleEditSave}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
