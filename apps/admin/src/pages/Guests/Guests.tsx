import React, { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, History, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { InitialsAvatar } from '@/components/ui/avatar';

type Guest = {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  nid?: string;
  passport?: string;
};

type Booking = {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  totalAmount: number;
  room?: { id: string; name: string; type: string };
};

type Payment = {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  bookingRoomName?: string | null;
  bookingCheckIn?: string;
};

type GuestStats = {
  totalBookings: number;
  completedStays: number;
  totalSpend: number;
  lastStay: string | null;
};

const Guests: React.FC = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', nid: '', passport: '' });
  const [search, setSearch] = useState('');

  // History dialog state
  const [historyGuest, setHistoryGuest] = useState<Guest | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyBookings, setHistoryBookings] = useState<Booking[]>([]);
  const [historyPayments, setHistoryPayments] = useState<Payment[]>([]);
  const [historyStats, setHistoryStats] = useState<GuestStats | null>(null);

  const fetchGuests = async () => {
    try {
      const res = await api.get('/guests');
      setGuests(unwrapList(res, ['guests']));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  const filteredGuests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter((g) => {
      const hay = [g.name, g.phone, g.email, g.nid, g.passport, g.address]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [guests, search]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', address: '', nid: '', passport: '' });
    setOpen(true);
  };

  const openEdit = (g: Guest) => {
    setEditing(g);
    setForm({
      name: g.name,
      email: g.email || '',
      phone: g.phone,
      address: g.address || '',
      nid: g.nid || '',
      passport: g.passport || '',
    });
    setOpen(true);
  };

  const payload = () => ({
    name: form.name,
    phone: form.phone,
    address: form.address || undefined,
    email: form.email || undefined,
    nid: form.nid || undefined,
    passport: form.passport || undefined,
  });

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/guests/${editing.id}`, payload());
      } else {
        await api.post('/guests', payload());
      }
      setOpen(false);
      fetchGuests();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this guest?')) return;
    try {
      await api.delete(`/guests/${id}`);
      fetchGuests();
    } catch (err) {
      console.error(err);
    }
  };

  const openHistory = async (g: Guest) => {
    setHistoryGuest(g);
    setHistoryLoading(true);
    setHistoryBookings([]);
    setHistoryPayments([]);
    setHistoryStats(null);
    try {
      const res = await api.get(`/guests/${g.id}/history`);
      const d = res.data as {
        bookings?: Booking[];
        payments?: Payment[];
        stats?: GuestStats;
      };
      setHistoryBookings(d.bookings || []);
      setHistoryPayments(d.payments || []);
      setHistoryStats(d.stats || null);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fmtCurrency = (n: number) => `৳${n.toLocaleString()}`;
  const fmtDate = (s: string | null | undefined) =>
    s ? new Date(s).toLocaleDateString() : '—';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Guests"
        description="Guest directory, stay history, and lifetime value."
        actions={
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, phone, NID, passport..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-72"
              />
            </div>
            <Button variant="default" onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add Guest
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>NID</TableHead>
                <TableHead>Passport</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGuests.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2.5">
                      <InitialsAvatar name={g.name} className="h-8 w-8" />
                      {g.name}
                    </div>
                  </TableCell>
                  <TableCell>{g.email || '-'}</TableCell>
                  <TableCell>{g.phone}</TableCell>
                  <TableCell>{g.nid || '-'}</TableCell>
                  <TableCell>{g.passport || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="View history"
                      onClick={() => openHistory(g)}
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(g)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      onClick={() => handleDelete(g.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredGuests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {search ? 'No guests match your search' : 'No guests found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit / Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Guest' : 'Add Guest'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>NID</Label>
                <Input
                  value={form.nid}
                  onChange={(e) => setForm({ ...form, nid: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Passport</Label>
                <Input
                  value={form.passport}
                  onChange={(e) => setForm({ ...form, passport: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyGuest} onOpenChange={(o) => !o && setHistoryGuest(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{historyGuest ? `${historyGuest.name} — history` : 'History'}</DialogTitle>
          </DialogHeader>
          {historyLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stats */}
              {historyStats && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Bookings" value={historyStats.totalBookings} />
                  <Stat label="Completed stays" value={historyStats.completedStays} />
                  <Stat label="Total spend" value={fmtCurrency(historyStats.totalSpend)} />
                  <Stat label="Last stay" value={fmtDate(historyStats.lastStay)} />
                </div>
              )}

              {/* Bookings */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">Bookings ({historyBookings.length})</h3>
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Room</TableHead>
                          <TableHead>Check-in</TableHead>
                          <TableHead>Check-out</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyBookings.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                              No bookings yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          historyBookings.map((b) => (
                            <TableRow key={b.id}>
                              <TableCell className="font-medium">{b.room?.name ?? '—'}</TableCell>
                              <TableCell>{fmtDate(b.checkInDate)}</TableCell>
                              <TableCell>{fmtDate(b.checkOutDate)}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{b.status}</Badge>
                              </TableCell>
                              <TableCell className="text-right">{fmtCurrency(b.totalAmount)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Payments */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">Payments ({historyPayments.length})</h3>
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Room</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyPayments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                              No payments yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          historyPayments.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell>{fmtDate(p.createdAt)}</TableCell>
                              <TableCell>{p.bookingRoomName ?? '—'}</TableCell>
                              <TableCell>{p.method}</TableCell>
                              <TableCell>
                                <Badge variant={p.status === 'COMPLETED' ? 'default' : 'secondary'}>
                                  {p.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">{fmtCurrency(p.amount)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="rounded-lg border bg-muted/30 px-3 py-2">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-semibold">{value}</p>
  </div>
);

export default Guests;
