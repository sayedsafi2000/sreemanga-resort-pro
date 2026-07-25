import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Loader2, CalendarDays } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/AuthContext';
import { canManageRooms } from '@/config/rbac';

const CATEGORIES = ['POOL', 'COTTAGE', 'CONFERENCE', 'EVENT', 'PICNIC'] as const;
const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'] as const;

type Product = {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  basePrice: number;
  pricePerPerson?: number | null;
  maxCapacity?: number | null;
  minCapacity?: number | null;
  isActive: boolean;
  sortOrder: number;
};

type Booking = {
  id: string;
  product?: { id: string; name: string; category: string };
  guestName: string;
  guestPhone: string;
  bookingDate: string;
  slotStart: string;
  slotEnd: string;
  adults: number;
  children: number;
  totalAmount: number;
  status: string;
};

const statusColor: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  CHECKED_IN: 'bg-green-100 text-green-800',
  CHECKED_OUT: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const emptyProduct = {
  name: '',
  category: 'POOL',
  description: '',
  basePrice: 0,
  pricePerPerson: '',
  maxCapacity: '',
  minCapacity: '',
  isActive: true,
  sortOrder: 0,
};

const emptyBooking = {
  productId: '',
  guestName: '',
  guestPhone: '',
  guestEmail: '',
  bookingDate: '',
  slotStart: '09:00',
  slotEnd: '17:00',
  adults: 1,
  children: 0,
  notes: '',
};

const DayLong: React.FC = () => {
  const { user } = useAuth();
  const canManage = canManageRooms(user?.role);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: 'products' | 'bookings' = tabParam === 'products' ? 'products' : 'bookings';
  const setTab = (next: 'products' | 'bookings') => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('tab', next);
        return p;
      },
      { replace: true }
    );
  };
  const [products, setProducts] = useState<Product[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [productDialog, setProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<any>(emptyProduct);
  const [bookingDialog, setBookingDialog] = useState(false);
  const [bookingForm, setBookingForm] = useState<any>(emptyBooking);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, b] = await Promise.all([
        api.get('/day-long/products'),
        api.get('/day-long/bookings'),
      ]);
      setProducts(unwrapList<Product>(p, ['products']));
      setBookings(unwrapList<Booking>(b, ['bookings']));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Ensure deep links and sidebar active state always have ?tab=
  useEffect(() => {
    if (searchParams.get('tab') === 'products' || searchParams.get('tab') === 'bookings') return;
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('tab', 'bookings');
        return p;
      },
      { replace: true }
    );
  }, [searchParams, setSearchParams]);

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProductForm(emptyProduct);
    setError(null);
    setProductDialog(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      category: p.category,
      description: p.description ?? '',
      basePrice: p.basePrice,
      pricePerPerson: p.pricePerPerson ?? '',
      maxCapacity: p.maxCapacity ?? '',
      minCapacity: p.minCapacity ?? '',
      isActive: p.isActive,
      sortOrder: p.sortOrder,
    });
    setError(null);
    setProductDialog(true);
  };

  const saveProduct = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        name: productForm.name,
        category: productForm.category,
        description: productForm.description || null,
        basePrice: Number(productForm.basePrice),
        pricePerPerson: productForm.pricePerPerson === '' ? null : Number(productForm.pricePerPerson),
        maxCapacity: productForm.maxCapacity === '' ? null : Number(productForm.maxCapacity),
        minCapacity: productForm.minCapacity === '' ? null : Number(productForm.minCapacity),
        isActive: productForm.isActive,
        sortOrder: Number(productForm.sortOrder) || 0,
      };
      if (editingProduct) {
        await api.patch(`/day-long/products/${editingProduct.id}`, payload);
      } else {
        await api.post('/day-long/products', payload);
      }
      setProductDialog(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const openCreateBooking = () => {
    setBookingForm({ ...emptyBooking, productId: products[0]?.id ?? '' });
    setError(null);
    setBookingDialog(true);
  };

  const saveBooking = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post('/day-long/bookings', {
        productId: bookingForm.productId,
        guestName: bookingForm.guestName,
        guestPhone: bookingForm.guestPhone,
        guestEmail: bookingForm.guestEmail || null,
        bookingDate: bookingForm.bookingDate,
        slotStart: bookingForm.slotStart,
        slotEnd: bookingForm.slotEnd,
        adults: Number(bookingForm.adults),
        children: Number(bookingForm.children),
        notes: bookingForm.notes || null,
      });
      setBookingDialog(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create booking');
    } finally {
      setSaving(false);
    }
  };

  const updateBookingStatus = async (id: string, status: string) => {
    await api.patch(`/day-long/bookings/${id}`, { status });
    await load();
  };

  const previewTotal = useMemo(() => {
    const p = products.find((x) => x.id === bookingForm.productId);
    if (!p) return 0;
    const pax = Number(bookingForm.adults) + Number(bookingForm.children);
    return p.basePrice + (p.pricePerPerson ?? 0) * pax;
  }, [products, bookingForm]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Day Long"
        description="Pool, cottage, conference, event and picnic day-use bookings"
        actions={
          <Button onClick={openCreateBooking} disabled={products.length === 0 || loading}>
            <Plus className="h-4 w-4 mr-1" /> New Booking
          </Button>
        }
      />

      <div className="flex gap-2">
        <Button variant={tab === 'bookings' ? 'default' : 'outline'} onClick={() => setTab('bookings')}>
          Bookings
        </Button>
        <Button variant={tab === 'products' ? 'default' : 'outline'} onClick={() => setTab('products')}>
          Products
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : tab === 'bookings' ? (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-end">
              <Button onClick={openCreateBooking} disabled={products.length === 0}>
                <Plus className="h-4 w-4 mr-1" /> New Booking
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Pax</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{new Date(b.bookingDate).toLocaleDateString()}</TableCell>
                    <TableCell>{b.product?.name ?? '—'}</TableCell>
                    <TableCell>
                      <div className="font-medium">{b.guestName}</div>
                      <div className="text-xs text-muted-foreground">{b.guestPhone}</div>
                    </TableCell>
                    <TableCell>{b.slotStart}–{b.slotEnd}</TableCell>
                    <TableCell>{b.adults + b.children}</TableCell>
                    <TableCell>৳{b.totalAmount}</TableCell>
                    <TableCell>
                      <Select value={b.status} onValueChange={(v) => updateBookingStatus(b.id, v)}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BOOKING_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              <span className={`px-2 py-0.5 rounded text-xs ${statusColor[s]}`}>{s}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {bookings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      <CalendarDays className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      No bookings yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-end">
              {canManage && (
                <Button onClick={openCreateProduct}>
                  <Plus className="h-4 w-4 mr-1" /> New Product
                </Button>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Base Price</TableHead>
                  <TableHead>Per Person</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                    <TableCell>৳{p.basePrice}</TableCell>
                    <TableCell>{p.pricePerPerson != null ? `৳${p.pricePerPerson}` : '—'}</TableCell>
                    <TableCell>{p.maxCapacity ?? '—'}</TableCell>
                    <TableCell>
                      <Badge className={p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canManage && (
                        <Button size="sm" variant="ghost" onClick={() => openEditProduct(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No products yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Product dialog */}
      <Dialog open={productDialog} onOpenChange={setProductDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'New Day Long Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={productForm.category} onValueChange={(v) => setProductForm({ ...productForm, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Base Price</Label>
                <Input type="number" value={productForm.basePrice} onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })} />
              </div>
              <div>
                <Label>Price / Person</Label>
                <Input type="number" value={productForm.pricePerPerson} onChange={(e) => setProductForm({ ...productForm, pricePerPerson: e.target.value })} placeholder="optional" />
              </div>
              <div>
                <Label>Min Capacity</Label>
                <Input type="number" value={productForm.minCapacity} onChange={(e) => setProductForm({ ...productForm, minCapacity: e.target.value })} placeholder="optional" />
              </div>
              <div>
                <Label>Max Capacity</Label>
                <Input type="number" value={productForm.maxCapacity} onChange={(e) => setProductForm({ ...productForm, maxCapacity: e.target.value })} placeholder="optional" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialog(false)}>Cancel</Button>
            <Button onClick={saveProduct} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking dialog */}
      <Dialog open={bookingDialog} onOpenChange={setBookingDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Day Long Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Product</Label>
              <Select value={bookingForm.productId} onValueChange={(v) => setBookingForm({ ...bookingForm, productId: v })}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.filter((p) => p.isActive).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.category})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Guest Name</Label>
                <Input value={bookingForm.guestName} onChange={(e) => setBookingForm({ ...bookingForm, guestName: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={bookingForm.guestPhone} onChange={(e) => setBookingForm({ ...bookingForm, guestPhone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={bookingForm.bookingDate} onChange={(e) => setBookingForm({ ...bookingForm, bookingDate: e.target.value })} />
              </div>
              <div>
                <Label>From</Label>
                <Input type="time" value={bookingForm.slotStart} onChange={(e) => setBookingForm({ ...bookingForm, slotStart: e.target.value })} />
              </div>
              <div>
                <Label>To</Label>
                <Input type="time" value={bookingForm.slotEnd} onChange={(e) => setBookingForm({ ...bookingForm, slotEnd: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Adults</Label>
                <Input type="number" min={1} value={bookingForm.adults} onChange={(e) => setBookingForm({ ...bookingForm, adults: e.target.value })} />
              </div>
              <div>
                <Label>Children</Label>
                <Input type="number" min={0} value={bookingForm.children} onChange={(e) => setBookingForm({ ...bookingForm, children: e.target.value })} />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Estimated total: <span className="font-semibold text-foreground">৳{previewTotal}</span></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingDialog(false)}>Cancel</Button>
            <Button onClick={saveBooking} disabled={saving || !bookingForm.productId || !bookingForm.bookingDate}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DayLong;
