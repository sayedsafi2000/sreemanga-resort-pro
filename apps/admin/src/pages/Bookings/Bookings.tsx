import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import ManualBookingDialog from '@/pages/Bookings/ManualBookingDialog';

const bookingStatuses = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'];

const Bookings: React.FC = () => {
  const { user } = useAuth();
  const canAcceptReject = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER' || user?.role === 'RECEPTIONIST';
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    adults: 1,
    children: 0,
    status: 'PENDING' as string,
    notes: '',
  });

  const fetchData = async () => {
    try {
      const [bRes, rRes, gRes] = await Promise.all([api.get('/bookings'), api.get('/rooms'), api.get('/guests')]);
      setBookings(unwrapList(bRes, ['bookings']));
      setRooms(unwrapList(rRes, ['rooms']));
      setGuests(unwrapList(gRes, ['guests']));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setCreateOpen(true);
    }
  }, [searchParams]);

  const openNew = () => setCreateOpen(true);

  const openEdit = (b: any) => {
    setEditing(b);
    setEditForm({
      adults: b.adults ?? 1,
      children: b.children ?? 0,
      status: b.status,
      notes: b.notes || '',
    });
    setEditOpen(true);
  };

  const handleQuickStatus = async (id: string, status: string) => {
    try {
      await api.put(`/bookings/${id}`, { status });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSave = async () => {
    if (!editing) return;
    try {
      await api.put(`/bookings/${editing.id}`, {
        adults: editForm.adults,
        children: editForm.children,
        status: editForm.status,
        notes: editForm.notes || undefined,
      });
      setEditOpen(false);
      setEditing(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this booking?')) return;
    try {
      await api.delete(`/bookings/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'CONFIRMED':
        return 'success';
      case 'CHECKED_IN':
        return 'default';
      case 'PENDING':
        return 'warning';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getRoomName = (id: string) => rooms.find((r: any) => r.id === id)?.name || id;
  const getGuestName = (id: string) => guests.find((g: any) => g.id === id)?.name || id;
  const getGuestPhone = (b: any) => b.guest?.phone || guests.find((g: any) => g.id === b.guestId)?.phone || '-';
  const getGuestEmail = (b: any) => b.guest?.email || guests.find((g: any) => g.id === b.guestId)?.email || '-';
  const getPaymentPref = (b: any) => {
    if (!b.preferredPaymentTiming) return '—';
    if (b.preferredPaymentTiming === 'INSTANT') {
      const method =
        b.preferredPaymentMethod === 'BKASH' ? 'bKash' : b.preferredPaymentMethod === 'BANK_TRANSFER' ? 'Bank' : '';
      return method ? `Instant (${method})` : 'Instant';
    }
    return 'Later';
  };
  const getPaymentMethodLabel = (b: any) => {
    if (b.preferredPaymentMethod === 'BKASH') return 'bKash';
    if (b.preferredPaymentMethod === 'BANK_TRANSFER') return 'Bank';
    return '—';
  };

  const formatDate = (d: string | undefined) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Bookings</h1>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          New booking
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="space-y-3 p-3 md:hidden">
            {bookings.map((b) => (
              <div key={b.id} className="space-y-2 rounded-xl border bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{getGuestName(b.guestId)}</p>
                  <Badge variant={statusColor(b.status) as any}>{b.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{getRoomName(b.roomId)}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p>
                    <span className="font-medium">Check-in:</span> {formatDate(b.checkInDate)}
                  </p>
                  <p>
                    <span className="font-medium">Check-out:</span> {formatDate(b.checkOutDate)}
                  </p>
                  <p>
                    <span className="font-medium">Pax:</span> {b.adults ?? 1}A / {b.children ?? 0}C
                  </p>
                  <p>
                    <span className="font-medium">Amount:</span> ৳{b.totalAmount?.toLocaleString?.() ?? b.totalAmount}
                  </p>
                  <p>
                    <span className="font-medium">Phone:</span> {getGuestPhone(b)}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span> {getGuestEmail(b)}
                  </p>
                  <p className="col-span-2">
                    <span className="font-medium">Payment:</span> {getPaymentPref(b)}
                  </p>
                  <p className="col-span-2">
                    <span className="font-medium">Txn ID:</span> {b.paymentTransactionId || '—'}
                  </p>
                  {b.paymentProofImage && (
                    <div className="col-span-2">
                      <p className="font-medium">Proof:</p>
                      <a href={b.paymentProofImage} target="_blank" rel="noreferrer" className="inline-block">
                        <img src={b.paymentProofImage} alt="Payment proof" className="mt-1 h-14 rounded-md border object-cover" />
                      </a>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {canAcceptReject && b.status === 'PENDING' && (
                    <>
                      <Button variant="ghost" className="h-8 px-2 text-emerald-700" onClick={() => handleQuickStatus(b.id, 'CONFIRMED')}>
                        Accept
                      </Button>
                      <Button variant="ghost" className="h-8 px-2 text-destructive" onClick={() => handleQuickStatus(b.id, 'CANCELLED')}>
                        Reject
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {bookings.length === 0 && <p className="py-8 text-center text-muted-foreground">No bookings found</p>}
          </div>
          <div className="hidden md:block">
            <Table className="w-max min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap px-3 py-2">Guest</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">Room</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">Check In</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">Check Out</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">Pax</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">Phone</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">Email</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">Payment</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">Txn ID</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">Proof</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">Amount</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">Status</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="whitespace-nowrap px-3 py-2">{getGuestName(b.guestId)}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2">{getRoomName(b.roomId)}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2">{formatDate(b.checkInDate)}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2">{formatDate(b.checkOutDate)}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2">
                      {b.adults ?? 1}A / {b.children ?? 0}C
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2">{getGuestPhone(b)}</TableCell>
                    <TableCell className="max-w-[14rem] truncate px-3 py-2" title={String(getGuestEmail(b))}>
                      {getGuestEmail(b)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2">
                      {getPaymentPref(b)}
                      {b.preferredPaymentTiming === 'INSTANT' ? ` / ${getPaymentMethodLabel(b)}` : ''}
                    </TableCell>
                    <TableCell className="max-w-[10rem] truncate px-3 py-2" title={b.paymentTransactionId || ''}>
                      {b.paymentTransactionId || '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2">
                      {b.paymentProofImage ? (
                        <a href={b.paymentProofImage} target="_blank" rel="noreferrer" className="inline-block shrink-0">
                          <img src={b.paymentProofImage} alt="" className="h-10 w-10 rounded-md border object-cover" />
                        </a>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2">৳{b.totalAmount?.toLocaleString?.() ?? b.totalAmount}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2">
                      <Badge className="shrink-0 whitespace-nowrap" variant={statusColor(b.status) as any}>
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2 text-right">
                      <div className="inline-flex items-center justify-end gap-0.5">
                        {canAcceptReject && b.status === 'PENDING' && (
                          <>
                            <Button variant="ghost" className="h-8 shrink-0 px-2 text-emerald-700" onClick={() => handleQuickStatus(b.id, 'CONFIRMED')}>
                              Accept
                            </Button>
                            <Button variant="ghost" className="h-8 shrink-0 px-2 text-destructive" onClick={() => handleQuickStatus(b.id, 'CANCELLED')}>
                              Reject
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => openEdit(b)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleDelete(b.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {bookings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={13} className="whitespace-normal py-8 text-center text-muted-foreground">
                      No bookings found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ManualBookingDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        rooms={rooms}
        guests={guests}
        onSuccess={fetchData}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit booking</DialogTitle>
            <p className="text-sm text-muted-foreground">Status, pax, and notes. Dates and guest are set at booking time.</p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {bookingStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Adults</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={editForm.adults}
                  onChange={(e) => setEditForm({ ...editForm, adults: Number(e.target.value || 1) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Children</Label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={editForm.children}
                  onChange={(e) => setEditForm({ ...editForm, children: Number(e.target.value || 0) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Optional"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Bookings;
