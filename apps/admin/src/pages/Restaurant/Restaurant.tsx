import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { useAuth } from '@/contexts/AuthContext';
import { canManageRestaurantMenu } from '@/config/rbac';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, ImageIcon, UtensilsCrossed, ShoppingBag, LayoutGrid } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/ui/page-header';

const DEFAULT_CATEGORIES = ['Main Course', 'Soup', 'Beverage', 'Snacks', 'Dessert'];

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
const orderStatuses = ['PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];

const Restaurant: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const menuWrite = canManageRestaurantMenu(user?.role);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderEditOpen, setOrderEditOpen] = useState(false);
  const [tab, setTab] = useState<'menu' | 'orders'>('menu');
  const [menuCategoryFilter, setMenuCategoryFilter] = useState<string>('All');
  const [editing, setEditing] = useState<any>(null);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    price: '',
    category: 'Main Course',
    description: '',
    image: '',
    isAvailable: true,
  });
  const [orderForm, setOrderForm] = useState({ roomId: '', itemsJson: '[]', totalPrice: '', notes: '' });
  const [orderStatus, setOrderStatus] = useState('PENDING');
  const [orderDateFrom, setOrderDateFrom] = useState('');
  const [orderDateTo, setOrderDateTo] = useState('');
  const [staff, setStaff] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [editOrderForm, setEditOrderForm] = useState({
    itemsJson: '[]',
    totalPrice: '',
    notes: '',
    userId: '',
    roomId: '',
  });

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (orderDateFrom) params.set('from', orderDateFrom);
      if (orderDateTo) params.set('to', orderDateTo);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const [mRes, oRes, rRes] = await Promise.all([
        api.get('/restaurant/menu'),
        api.get(`/restaurant/orders${qs}`),
        api.get('/rooms'),
      ]);
      setMenuItems(unwrapList(mRes, ['menuItems']));
      setOrders(unwrapList(oRes, ['orders']));
      setRooms(unwrapList(rRes, ['rooms']));
    } catch (err) { console.error(err); }
    // Staff list is gated to SUPER_ADMIN only — fail quietly for other roles.
    try {
      const uRes = await api.get('/users');
      const list = (unwrapList(uRes, ['users']) as Array<{ id: string; name: string; role: string }>).filter(
        (u) => ['MANAGER', 'RESTAURANT_STAFF', 'RECEPTIONIST'].includes(u.role)
      );
      setStaff(list);
    } catch {
      setStaff([]);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orderDateFrom, orderDateTo]);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'orders' || t === 'menu') setTab(t);
  }, [searchParams]);

  const setTabNavigate = (next: 'menu' | 'orders') => {
    setTab(next);
    navigate(`/restaurant?tab=${next}`, { replace: true });
  };

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '',
      price: '',
      category: 'Main Course',
      description: '',
      image: '',
      isAvailable: true,
    });
    setOpen(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      name: item.name,
      price: String(item.price),
      category: item.category,
      description: item.description || '',
      image: item.image || '',
      isAvailable: item.isAvailable,
    });
    setOpen(true);
  };

  const handleMenuImageFile = async (file?: File) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setForm((f) => ({ ...f, image: dataUrl }));
  };

  const handleSave = async () => {
    const trimmedImage = form.image.trim();
    const imagePayload =
      trimmedImage.length > 0 ? trimmedImage : editing ? null : undefined;
    const data = {
      name: form.name.trim(),
      price: Number(form.price),
      category: form.category,
      description: form.description.trim() || undefined,
      isAvailable: form.isAvailable,
      ...(imagePayload !== undefined ? { image: imagePayload } : {}),
    };
    try {
      if (editing) {
        await api.put(`/restaurant/menu/${editing.id}`, data);
      } else {
        await api.post('/restaurant/menu', data);
      }
      setOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Save failed. If you uploaded a very large image, try a smaller file or paste an image URL instead.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try { await api.delete(`/restaurant/menu/${id}`); fetchData(); } catch (err) { console.error(err); }
  };

  // Inline availability toggle from the menu card — optimistic update then persist.
  const toggleAvailability = async (item: any) => {
    if (!menuWrite) return;
    const next = !item.isAvailable;
    setMenuItems((prev) => prev.map((m) => (m.id === item.id ? { ...m, isAvailable: next } : m)));
    try {
      await api.put(`/restaurant/menu/${item.id}`, { isAvailable: next });
    } catch (err) {
      console.error(err);
      setMenuItems((prev) => prev.map((m) => (m.id === item.id ? { ...m, isAvailable: !next } : m)));
    }
  };

  // Institutional order status pill (dot + label).
  const orderStatusPill = (s: string) => {
    switch (s) {
      case 'DELIVERED':
      case 'READY':
        return { cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60', dot: 'bg-emerald-500' };
      case 'PREPARING':
        return { cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60', dot: 'bg-blue-500 animate-pulse' };
      case 'PENDING':
        return { cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60', dot: 'bg-amber-500' };
      case 'CANCELLED':
        return { cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60', dot: 'bg-rose-500' };
      default:
        return { cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/60', dot: 'bg-slate-400' };
    }
  };

  const itemsCount = (items: unknown) => {
    if (Array.isArray(items)) return items.length;
    if (items && typeof items === 'object') return Object.keys(items as object).length;
    return 0;
  };

  const openNewOrder = () => {
    setOrderForm({ roomId: '', itemsJson: '[{"name":"Order","qty":1,"price":500}]', totalPrice: '', notes: '' });
    setOrderOpen(true);
  };

  const openEditOrder = (o: any) => {
    setEditingOrder(o);
    setOrderStatus(o.status || 'PENDING');
    setEditOrderForm({
      itemsJson: JSON.stringify(o.items ?? [], null, 2),
      totalPrice: String(o.totalPrice ?? ''),
      notes: o.notes ?? '',
      userId: o.userId ?? '',
      roomId: o.roomId ?? '',
    });
    setOrderEditOpen(true);
  };

  const handleCreateOrder = async () => {
    let items: unknown;
    try {
      items = JSON.parse(orderForm.itemsJson);
    } catch {
      alert('Items must be valid JSON array');
      return;
    }
    const totalPrice = Number(orderForm.totalPrice);
    if (!totalPrice || totalPrice <= 0) {
      alert('Enter a valid total price');
      return;
    }
    try {
      await api.post('/restaurant/orders', {
        roomId: orderForm.roomId || undefined,
        items,
        totalPrice,
        notes: orderForm.notes || undefined,
      });
      setOrderOpen(false);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleUpdateOrderStatus = async () => {
    if (!editingOrder) return;
    let items: unknown;
    try {
      items = JSON.parse(editOrderForm.itemsJson);
    } catch {
      alert('Items must be valid JSON array');
      return;
    }
    if (!Array.isArray(items)) {
      alert('Items must be a JSON array');
      return;
    }
    const totalPrice = Number(editOrderForm.totalPrice);
    if (!totalPrice || totalPrice <= 0) {
      alert('Enter a valid total price');
      return;
    }
    try {
      await api.put(`/restaurant/orders/${editingOrder.id}`, {
        status: orderStatus,
        items,
        totalPrice,
        notes: editOrderForm.notes || null,
        userId: editOrderForm.userId || null,
        roomId: editOrderForm.roomId || null,
      });
      setOrderEditOpen(false);
      setEditingOrder(null);
      fetchData();
    } catch (err) { console.error(err); }
  };

  // ── Derived menu/order metrics for KPI cards + filtering ──────────────────
  const menuCategoriesList = Array.from(new Set(menuItems.map((m: any) => m.category).filter(Boolean)));
  const availableCount = menuItems.filter((m: any) => m.isAvailable).length;
  const filteredMenuItems =
    menuCategoryFilter === 'All' ? menuItems : menuItems.filter((m: any) => m.category === menuCategoryFilter);
  const activeOrdersCount = orders.filter((o: any) => ['PENDING', 'PREPARING', 'READY'].includes(o.status)).length;
  const pendingOrdersCount = orders.filter((o: any) => o.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Restaurant"
        description="Manage the menu and track room-service orders."
        actions={
          tab === 'menu' && menuWrite ? (
            <Button variant="ink" onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Item</Button>
          ) : undefined
        }
      />
      <div className="flex w-fit gap-1 rounded-lg border border-border bg-secondary/60 p-1">
        <button
          type="button"
          onClick={() => setTabNavigate('menu')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            tab === 'menu' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Menu Items
        </button>
        <button
          type="button"
          onClick={() => setTabNavigate('orders')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            tab === 'orders' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Orders
        </button>
      </div>

      {tab === 'menu' && (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card-base card-lift p-5 fade-up fade-up-1">
              <div className="flex items-start justify-between">
                <p className="eyebrow">Menu Items</p>
                <span className="stat-blue stat-icon-bg flex h-9 w-9 items-center justify-center rounded-lg"><UtensilsCrossed className="h-[18px] w-[18px]" /></span>
              </div>
              <p className="mt-3 text-3xl font-bold tracking-tight value-pop">{menuItems.length}</p>
              <p className="mt-2 text-xs text-muted-foreground">{availableCount} available</p>
            </div>
            <div className="card-base card-lift p-5 fade-up fade-up-2">
              <div className="flex items-start justify-between">
                <p className="eyebrow">Active Orders</p>
                <span className="stat-amber stat-icon-bg flex h-9 w-9 items-center justify-center rounded-lg"><ShoppingBag className="h-[18px] w-[18px]" /></span>
              </div>
              <p className="mt-3 text-3xl font-bold tracking-tight value-pop">{activeOrdersCount}</p>
              <p className="mt-2 text-xs text-muted-foreground">{pendingOrdersCount} pending</p>
            </div>
            <div className="card-base card-lift p-5 fade-up fade-up-3">
              <div className="flex items-start justify-between">
                <p className="eyebrow">Categories</p>
                <span className="stat-purple stat-icon-bg flex h-9 w-9 items-center justify-center rounded-lg"><LayoutGrid className="h-[18px] w-[18px]" /></span>
              </div>
              <p className="mt-3 text-3xl font-bold tracking-tight value-pop">{menuCategoriesList.length}</p>
              <p className="mt-2 text-xs text-muted-foreground">Across the menu</p>
            </div>
          </div>

          {/* Category filter chips */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-secondary/50 p-1.5">
            {['All', ...menuCategoriesList].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setMenuCategoryFilter(c)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  menuCategoryFilter === c
                    ? 'bg-ink text-ink-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-white hover:text-foreground'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Menu card grid */}
          {filteredMenuItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">No menu items</CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filteredMenuItems.map((item, i) => (
                <div
                  key={item.id}
                  className={`card-base group flex flex-col overflow-hidden p-3 fade-up ${!item.isAvailable ? 'opacity-70' : ''} fade-up-${(i % 6) + 1}`}
                >
                  <div className="relative mb-3 h-40 w-full overflow-hidden rounded-lg bg-muted">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${!item.isAvailable ? 'grayscale' : ''}`}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" aria-hidden />
                      </div>
                    )}
                    <div className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs font-bold shadow-sm tabular">
                      ৳{item.price}
                    </div>
                    {!item.isAvailable && (
                      <div className="absolute left-2 top-2 rounded-md bg-destructive px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-destructive-foreground">
                        Sold Out
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold leading-tight text-foreground">{item.name}</h3>
                      <Badge variant="outline" className="shrink-0 text-[10px]">{item.category}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description || 'No description'}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className={`text-[11px] font-medium uppercase tracking-wide ${item.isAvailable ? 'text-muted-foreground' : 'text-destructive'}`}>
                      {item.isAvailable ? 'Available' : 'Out of stock'}
                    </span>
                    <div className="flex items-center gap-1">
                      {menuWrite && (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={item.isAvailable}
                          onClick={() => void toggleAvailability(item)}
                          className={`relative h-5 w-9 rounded-full transition-colors ${item.isAvailable ? 'bg-emerald-500' : 'bg-slate-300'}`}
                          title="Toggle availability"
                        >
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${item.isAvailable ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                      )}
                      {menuWrite && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'orders' && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={orderDateFrom} onChange={(e) => setOrderDateFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={orderDateTo} onChange={(e) => setOrderDateTo(e.target.value)} className="w-40" />
            </div>
            {(orderDateFrom || orderDateTo) && (
              <Button variant="outline" size="sm" onClick={() => { setOrderDateFrom(''); setOrderDateTo(''); }}>
                Clear
              </Button>
            )}
            <Button variant="ink" className="ml-auto" onClick={openNewOrder}><Plus className="h-4 w-4 mr-2" />New order</Button>
          </div>
          <Card>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-base font-semibold text-foreground">Recent Orders</h3>
              <span className="text-xs text-muted-foreground">{orders.length} order{orders.length === 1 ? '' : 's'}</span>
            </div>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Assigned to</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => {
                    const pill = orderStatusPill(o.status);
                    return (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs text-primary">#ORD-{String(o.id).slice(-5).toUpperCase()}</TableCell>
                      <TableCell>{o.room?.name ? <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs">{o.room.name}</span> : (o.roomId ? <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs">{o.roomId}</span> : '—')}</TableCell>
                      <TableCell>{itemsCount(o.items)} items</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.user?.name || '—'}</TableCell>
                      <TableCell className="font-semibold tabular">৳{o.totalPrice?.toLocaleString?.() ?? o.totalPrice}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-tight ${pill.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
                          {o.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditOrder(o)}><Pencil className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                  {orders.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No orders</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit menu item' : 'Add menu item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (৳)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {(menuCategoriesList.length > 0 ? menuCategoriesList : DEFAULT_CATEGORIES).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dish photo</Label>
              <Input
                type="file"
                accept="image/*"
                className="cursor-pointer"
                onChange={(e) => void handleMenuImageFile(e.target.files?.[0])}
              />
              <p className="text-xs text-muted-foreground">
                Or paste a URL / data URL below (e.g. from your site <code className="text-[0.65rem]">/gallery/…</code> or Unsplash).
              </p>
              <Textarea
                rows={2}
                placeholder="https://… or /path/to/image.jpg"
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
              />
              {form.image.trim() ? (
                <div className="relative mt-2 max-h-40 overflow-hidden rounded-lg border bg-muted">
                  <img src={form.image} alt="Preview" className="mx-auto max-h-40 w-auto object-contain" />
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
              />
              <Label>Available</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New restaurant order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Room (optional)</Label>
              <Select value={orderForm.roomId || '__none'} onValueChange={(v) => setOrderForm({ ...orderForm, roomId: v === '__none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Walk-in / no room" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {rooms.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Items (JSON array)</Label>
              <textarea className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" value={orderForm.itemsJson} onChange={(e) => setOrderForm({ ...orderForm, itemsJson: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>Total price (৳)</Label><Input type="number" value={orderForm.totalPrice} onChange={(e) => setOrderForm({ ...orderForm, totalPrice: e.target.value })} /></div>
            <div className="space-y-2"><Label>Notes</Label><Input value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOrderOpen(false)}>Cancel</Button><Button onClick={handleCreateOrder}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={orderEditOpen} onOpenChange={setOrderEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={orderStatus} onValueChange={setOrderStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{orderStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Total price (৳)</Label>
                <Input
                  type="number"
                  value={editOrderForm.totalPrice}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, totalPrice: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Room</Label>
                <Select
                  value={editOrderForm.roomId || '__none'}
                  onValueChange={(v) => setEditOrderForm({ ...editOrderForm, roomId: v === '__none' ? '' : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Walk-in / no room" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {rooms.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned staff</Label>
                {staff.length > 0 ? (
                  <Select
                    value={editOrderForm.userId || '__none'}
                    onValueChange={(v) => setEditOrderForm({ ...editOrderForm, userId: v === '__none' ? '' : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Unassigned</SelectItem>
                      {staff.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Staff list unavailable for your role.
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Items (JSON array)</Label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                value={editOrderForm.itemsJson}
                onChange={(e) => setEditOrderForm({ ...editOrderForm, itemsJson: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={editOrderForm.notes}
                onChange={(e) => setEditOrderForm({ ...editOrderForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateOrderStatus}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Restaurant;
