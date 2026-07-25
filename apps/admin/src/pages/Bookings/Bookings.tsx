import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { Plus, Pencil, Trash2, X as XIcon, Download, Activity, BedDouble } from 'lucide-react';
import ManualBookingDialog from '@/pages/Bookings/ManualBookingDialog';
import AvailabilityCalendar from '@/pages/Bookings/AvailabilityCalendar';
import { PageHeader } from '@/components/ui/page-header';
import { InitialsAvatar } from '@/components/ui/avatar';

const bookingStatuses = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'];

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const Bookings: React.FC = () => {
  const { user } = useAuth();
  const canAcceptReject = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER' || user?.role === 'RECEPTIONIST';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'calendar' ? 'calendar' : 'list';
  const setTab = (t: 'list' | 'calendar') => {
    const next = new URLSearchParams(searchParams);
    if (t === 'list') next.delete('tab');
    else next.set('tab', t);
    next.delete('new');
    navigate(`?${next.toString()}`, { replace: true });
  };

  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [staff, setStaff] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    adults: 1,
    children: 0,
    status: 'PENDING' as string,
    notes: '',
    preferredPaymentTiming: '',
    preferredPaymentMethod: '',
    paymentTransactionId: '',
    paymentProofImage: '',
    staffId: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const [bRes, rRes, gRes] = await Promise.all([api.get(`/bookings${qs}`), api.get('/rooms'), api.get('/guests')]);
      setBookings(unwrapList(bRes, ['bookings']));
      setRooms(unwrapList(rRes, ['rooms']));
      setGuests(unwrapList(gRes, ['guests']));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
    // /api/users is SUPER_ADMIN only — fail quietly otherwise.
    try {
      const uRes = await api.get('/users');
      const list = (unwrapList(uRes, ['users']) as Array<{ id: string; name: string; role: string }>);
      setStaff(list);
    } catch {
      setStaff([]);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

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
      preferredPaymentTiming: b.preferredPaymentTiming || '',
      preferredPaymentMethod: b.preferredPaymentMethod || '',
      paymentTransactionId: b.paymentTransactionId || '',
      paymentProofImage: b.paymentProofImage || '',
      staffId: b.staffId || '',
    });
    setEditOpen(true);
  };

  const handleEditProofUpload = async (file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setEditForm((f) => ({ ...f, paymentProofImage: dataUrl }));
    } catch (err) {
      console.error(err);
    }
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
      const payload: Record<string, unknown> = {
        adults: editForm.adults,
        children: editForm.children,
        status: editForm.status,
        notes: editForm.notes || undefined,
        preferredPaymentTiming: editForm.preferredPaymentTiming || null,
        preferredPaymentMethod:
          editForm.preferredPaymentTiming === 'INSTANT'
            ? editForm.preferredPaymentMethod || null
            : null,
        paymentTransactionId:
          editForm.preferredPaymentTiming === 'INSTANT'
            ? editForm.paymentTransactionId || null
            : null,
        paymentProofImage:
          editForm.preferredPaymentTiming === 'INSTANT'
            ? editForm.paymentProofImage || null
            : null,
      };
      if (isSuperAdmin) {
        payload.staffId = editForm.staffId || null;
      }
      await api.put(`/bookings/${editing.id}`, payload);
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

  // Institutional status pill (dot + label) matching the LuxeResort OS design.
  const statusPill = (s: string) => {
    switch (s) {
      case 'CONFIRMED':
        return { dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60', label: 'Confirmed' };
      case 'CHECKED_IN':
        return { dot: 'bg-blue-500', cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60', label: 'In-House' };
      case 'PENDING':
        return { dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60', label: 'Pending' };
      case 'CHECKED_OUT':
        return { dot: 'bg-slate-400', cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/60', label: 'Checked-out' };
      case 'CANCELLED':
        return { dot: 'bg-rose-500', cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60', label: 'Cancelled' };
      default:
        return { dot: 'bg-slate-400', cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/60', label: s };
    }
  };

  const nightsBetween = (ci?: string, co?: string): number => {
    if (!ci || !co) return 0;
    const diff = new Date(co).getTime() - new Date(ci).getTime();
    return Math.max(1, Math.round(diff / 86400000));
  };

  const shortRid = (id: string): string => `#RES-${String(id).slice(-5).toUpperCase()}`;

  const getRoomName = (id: string) => rooms.find((r: any) => r.id === id)?.name || id;
  const getGuestName = (id: string) => guests.find((g: any) => g.id === id)?.name || id;
  const getGuestPhone = (b: any) => b.guest?.phone || guests.find((g: any) => g.id === b.guestId)?.phone || '-';
  const getGuestEmail = (b: any) => b.guest?.email || guests.find((g: any) => g.id === b.guestId)?.email || '-';

  // Today's room status — which rooms are occupied right now and which are free.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const occupiedRoomIds = new Set<string>();
  for (const b of bookings) {
    if (b.status !== 'CHECKED_IN' && b.status !== 'CONFIRMED') continue;
    const ci = new Date(b.checkInDate);
    const co = new Date(b.checkOutDate);
    ci.setHours(0, 0, 0, 0);
    co.setHours(0, 0, 0, 0);
    if (ci <= today && today < co) {
      occupiedRoomIds.add(b.roomId);
    }
  }
  const occupiedRooms = rooms.filter((r: any) => occupiedRoomIds.has(r.id));
  const freeRooms = rooms.filter((r: any) => !occupiedRoomIds.has(r.id));
  // Booking status counts for the overview strip.
  const statusCounts = {
    CONFIRMED: bookings.filter((b: any) => b.status === 'CONFIRMED').length,
    CHECKED_IN: bookings.filter((b: any) => b.status === 'CHECKED_IN').length,
    PENDING: bookings.filter((b: any) => b.status === 'PENDING').length,
    CANCELLED: bookings.filter((b: any) => b.status === 'CANCELLED').length,
  };
  const occupancyRate = rooms.length > 0 ? Math.round((occupiedRooms.length / rooms.length) * 1000) / 10 : 0;
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
      <PageHeader
        eyebrow="Operations › Bookings"
        title="Bookings Management"
        description="Real-time occupancy and reservation control center."
        actions={
          <>
            <Button variant="outline" onClick={() => {
              const rows: string[][] = [['Reservation ID', 'Guest', 'Phone', 'Email', 'Room', 'Check-in', 'Check-out', 'Nights', 'Amount', 'Status', 'Payment']];
              bookings.forEach((b) => {
                const nights = nightsBetween(b.checkInDate, b.checkOutDate);
                rows.push([
                  shortRid(b.id),
                  getGuestName(b.guestId),
                  getGuestPhone(b),
                  getGuestEmail(b),
                  getRoomName(b.roomId),
                  formatDate(b.checkInDate),
                  formatDate(b.checkOutDate),
                  String(nights),
                  String(b.totalAmount ?? 0),
                  b.status,
                  getPaymentPref(b),
                ]);
              });
              const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n');
              const a = document.createElement('a');
              a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
              a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
            }}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="default" onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              New Booking
            </Button>
          </>
        }
      />
      <div className="flex w-fit gap-1 rounded-lg border border-border bg-secondary/60 p-1">
        <button
          type="button"
          onClick={() => setTab('list')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            tab === 'list' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => setTab('calendar')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            tab === 'calendar' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Calendar
        </button>
      </div>

      {tab === 'calendar' && (
        <AvailabilityCalendar
          rooms={rooms}
          onCreateForRoomDate={(roomId, date) => {
            const params = new URLSearchParams(searchParams);
            params.delete('tab');
            params.set('new', '1');
            params.set('roomId', roomId);
            params.set('date', date);
            navigate(`?${params.toString()}`, { replace: true });
            setCreateOpen(true);
          }}
        />
      )}

      {tab === 'list' && (
      <>
      {/* Status Overview bento + today's availability */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="mb-5 flex items-start justify-between">
              <h4 className="text-base font-semibold text-foreground">Status Overview</h4>
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2.5">
              {[
                { label: 'Confirmed', value: statusCounts.CONFIRMED, dot: 'bg-emerald-500' },
                { label: 'In-House', value: statusCounts.CHECKED_IN, dot: 'bg-blue-500' },
                { label: 'Pending Payment', value: statusCounts.PENDING, dot: 'bg-amber-500' },
                { label: 'Cancelled', value: statusCounts.CANCELLED, dot: 'bg-rose-500' },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className={`flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2.5 fade-up fade-up-${i + 1}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                    <span className="text-sm font-medium text-foreground">{s.label}</span>
                  </div>
                  <span className="text-lg font-bold tabular">{s.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <p className="eyebrow mb-3">Occupancy Rate</p>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div className="progress-animated h-full rounded-full bg-primary" style={{ width: `${occupancyRate}%` }} />
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-sm font-semibold text-primary tabular">{occupancyRate}%</span>
                <span className="text-sm text-muted-foreground">Capacity: {rooms.length} Units</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's availability */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h4 className="text-base font-semibold text-foreground">Today's Availability</h4>
            <span className="text-xs text-muted-foreground">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center justify-between">
                <p className="eyebrow !text-emerald-700">Free today</p>
                <BedDouble className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-900 value-pop">
                {freeRooms.length}
                <span className="ml-1 text-sm font-normal text-emerald-700">/ {rooms.length}</span>
              </p>
              {freeRooms.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {freeRooms.slice(0, 8).map((r: any) => (
                    <span key={r.id} className="rounded-md border border-emerald-200 bg-white px-2 py-0.5 font-mono text-[11px] text-emerald-800">
                      {r.roomCode || r.name}
                    </span>
                  ))}
                  {freeRooms.length > 8 && <span className="text-[11px] text-emerald-700">+{freeRooms.length - 8} more</span>}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4">
              <div className="flex items-center justify-between">
                <p className="eyebrow !text-rose-700">Occupied today</p>
                <BedDouble className="h-4 w-4 text-rose-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-rose-900 value-pop">
                {occupiedRooms.length}
                <span className="ml-1 text-sm font-normal text-rose-700">/ {rooms.length}</span>
              </p>
              {occupiedRooms.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {occupiedRooms.slice(0, 8).map((r: any) => (
                    <span key={r.id} className="rounded-md border border-rose-200 bg-white px-2 py-0.5 font-mono text-[11px] text-rose-800">
                      {r.roomCode || r.name}
                    </span>
                  ))}
                  {occupiedRooms.length > 8 && <span className="text-[11px] text-rose-700">+{occupiedRooms.length - 8} more</span>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Check-in from</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Check-in to</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
        {(dateFrom || dateTo) && (
          <Button variant="outline" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>
            Clear
          </Button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {bookings.length} booking{bookings.length === 1 ? '' : 's'}
        </span>
      </div>
      <Card>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h4 className="text-base font-semibold text-foreground">Active Reservations</h4>
          <span className="text-xs text-muted-foreground">{bookings.length} reservation{bookings.length === 1 ? '' : 's'}</span>
        </div>
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
                  <TableHead className="whitespace-nowrap px-3 py-2">Guest Details</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">Room / Unit</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">Stay Duration</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">Pax</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">Payment</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">Txn ID</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">Proof</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">Amount</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">Status</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">Reservation ID</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2">Created by</TableHead>
                  <TableHead className="whitespace-nowrap px-3 py-2 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b) => {
                  const pill = statusPill(b.status);
                  const nights = nightsBetween(b.checkInDate, b.checkOutDate);
                  return (
                  <TableRow key={b.id}>
                    <TableCell className="whitespace-nowrap px-3 py-2">
                      <div className="flex items-center gap-3">
                        <InitialsAvatar name={getGuestName(b.guestId)} className="h-10 w-10 !rounded-lg" />
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{getGuestName(b.guestId)}</p>
                          <p className="max-w-[14rem] truncate text-xs text-muted-foreground">{getGuestEmail(b)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 font-mono text-xs text-foreground">
                        <BedDouble className="h-3.5 w-3.5" />
                        {getRoomName(b.roomId)}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-sm">{formatDate(b.checkInDate)} — {formatDate(b.checkOutDate)}</span>
                        <span className="font-mono text-[11px] text-primary">{nights} Night{nights === 1 ? '' : 's'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2">
                      <span className="rounded bg-secondary px-2 py-0.5 font-mono text-[11px]">{b.adults ?? 1}A {b.children ?? 0}C</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2">
                      {getPaymentPref(b)}
                      {b.preferredPaymentTiming === 'INSTANT' ? ` / ${getPaymentMethodLabel(b)}` : ''}
                    </TableCell>
                    <TableCell className="max-w-[10rem] truncate px-3 py-2" title={b.paymentTransactionId || ''}>
                      {b.paymentTransactionId ? <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">{b.paymentTransactionId}</span> : '—'}
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
                    <TableCell className="whitespace-nowrap px-3 py-2 font-semibold tabular">৳{b.totalAmount?.toLocaleString?.() ?? b.totalAmount}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2">
                      <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-tight ${pill.cls}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
                        {pill.label}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2 font-mono text-xs text-primary">{shortRid(b.id)}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2 text-sm text-muted-foreground">
                      {b.staff?.name || '—'}
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
                  );
                })}
                {bookings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="whitespace-normal py-8 text-center text-muted-foreground">
                      {loading
                        ? 'Loading bookings...'
                        : dateFrom || dateTo
                          ? 'No bookings in selected range. Adjust the date filter.'
                          : 'No bookings yet. Click New booking to add one.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </>
      )}

      <ManualBookingDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        rooms={rooms}
        guests={guests}
        onSuccess={fetchData}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit booking</DialogTitle>
            <p className="text-sm text-muted-foreground">Status, pax, payment, and assignment. Dates and guest are set at booking time.</p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
              {isSuperAdmin && (
                <div className="space-y-2">
                  <Label>Created by (staff)</Label>
                  <Select
                    value={editForm.staffId || '__none'}
                    onValueChange={(v) => setEditForm({ ...editForm, staffId: v === '__none' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Unassigned</SelectItem>
                      {staff.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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

            {/* Payment fields */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
              <p className="text-sm font-semibold">Payment</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Timing</Label>
                  <Select
                    value={editForm.preferredPaymentTiming || '__none'}
                    onValueChange={(v) =>
                      setEditForm({ ...editForm, preferredPaymentTiming: v === '__none' ? '' : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Not set" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Not set</SelectItem>
                      <SelectItem value="INSTANT">Instant</SelectItem>
                      <SelectItem value="LATER">Later</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editForm.preferredPaymentTiming === 'INSTANT' && (
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select
                      value={editForm.preferredPaymentMethod || '__none'}
                      onValueChange={(v) =>
                        setEditForm({ ...editForm, preferredPaymentMethod: v === '__none' ? '' : v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Select</SelectItem>
                        <SelectItem value="BKASH">bKash</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {editForm.preferredPaymentTiming === 'INSTANT' && (
                <>
                  <div className="space-y-2">
                    <Label>Transaction ID</Label>
                    <Input
                      value={editForm.paymentTransactionId}
                      onChange={(e) => setEditForm({ ...editForm, paymentTransactionId: e.target.value })}
                      placeholder="e.g. TXN123456"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment proof</Label>
                    {editForm.paymentProofImage ? (
                      <div className="flex items-start gap-3">
                        <img
                          src={editForm.paymentProofImage}
                          alt="Payment proof"
                          className="h-24 w-24 rounded border border-border object-cover"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditForm({ ...editForm, paymentProofImage: '' })}
                        >
                          <XIcon className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => void handleEditProofUpload(e.target.files?.[0])}
                      />
                    )}
                  </div>
                </>
              )}
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
