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
  const [orderForm, setOrderForm] = useState<{
    roomId: string;
    items: Array<{ menuId?: string; name: string; qty: number; price: number }>;
    totalPrice: string;
    notes: string;
  }>({ roomId: '', items: [], totalPrice: '', notes: '' });
  const [orderStatus, setOrderStatus] = useState('PENDING');
  const [orderDateFrom, setOrderDateFrom] = useState('');
  const [orderDateTo, setOrderDateTo] = useState('');
  const [staff, setStaff] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [editOrderForm, setEditOrderForm] = useState<{
    items: Array<{ menuId?: string; name: string; qty: number; price: number }>;
    totalPrice: string;
    notes: string;
    userId: string;
    roomId: string;
  }>({
    items: [],
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
    setOrderForm({ roomId: '', items: [], totalPrice: '', notes: '' });
    setOrderOpen(true);
  };

  const openEditOrder = (o: any) => {
    setEditingOrder(o);
    setOrderStatus(o.status || 'PENDING');
    const parsedItems = Array.isArray(o.items)
      ? o.items.map((it: any) => ({
          menuId: it.menuId,
          name: String(it.name ?? ''),
          qty: Number(it.qty ?? it.quantity ?? 1),
          price: Number(it.price ?? 0),
        }))
      : [];
    setEditOrderForm({
      items: parsedItems,
      totalPrice: String(o.totalPrice ?? ''),
      notes: o.notes ?? '',
      userId: o.userId ?? '',
      roomId: o.roomId ?? '',
    });
    setOrderEditOpen(true);
  };

  const handleCreateOrder = async () => {
    if (!orderForm.items.length) {
      alert('Please add at least one item to the order');
      return;
    }
    const totalPrice = Number(orderForm.totalPrice) || orderForm.items.reduce((s, it) => s + it.price * it.qty, 0);
    if (!totalPrice || totalPrice <= 0) {
      alert('Enter a valid total price');
      return;
    }
    try {
      await api.post('/restaurant/orders', {
        roomId: orderForm.roomId || undefined,
        items: orderForm.items,
        totalPrice,
        notes: orderForm.notes || undefined,
      });
      setOrderOpen(false);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleUpdateOrderStatus = async () => {
    if (!editingOrder) return;
    if (!editOrderForm.items.length) {
      alert('Order must contain at least one item');
      return;
    }
    const totalPrice = Number(editOrderForm.totalPrice) || editOrderForm.items.reduce((s, it) => s + it.price * it.qty, 0);
    if (!totalPrice || totalPrice <= 0) {
      alert('Enter a valid total price');
      return;
    }
    try {
      await api.put(`/restaurant/orders/${editingOrder.id}`, {
        status: orderStatus,
        items: editOrderForm.items,
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
    <div className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Restaurant"
        description="Manage the menu and track room-service orders."
        actions={
          tab === 'menu' && menuWrite ? (
            <Button variant="ink" className="w-full sm:w-auto" onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          ) : undefined
        }
      />
      <div className="flex w-full gap-1 rounded-lg border border-border bg-secondary/60 p-1 sm:w-fit">
        <button
          type="button"
          onClick={() => setTabNavigate('menu')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition sm:flex-none sm:py-1.5 ${
            tab === 'menu' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Menu Items
        </button>
        <button
          type="button"
          onClick={() => setTabNavigate('orders')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition sm:flex-none sm:py-1.5 ${
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
          <div className="-mx-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
            <div className="flex min-w-max flex-wrap items-center gap-1.5 rounded-lg border border-border bg-secondary/50 p-1.5 sm:min-w-0">
              {['All', ...menuCategoriesList].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setMenuCategoryFilter(c)}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    menuCategoryFilter === c
                      ? 'bg-ink text-ink-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-white hover:text-foreground'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Menu card grid */}
          {filteredMenuItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">No menu items</CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredMenuItems.map((item, i) => (
                <div
                  key={item.id}
                  className={`card-base group flex min-w-0 flex-col overflow-hidden p-3 sm:p-4 fade-up ${!item.isAvailable ? 'opacity-70' : ''} fade-up-${(i % 6) + 1}`}
                >
                  <div className="relative mb-3 aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
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
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                      <h3 className="min-w-0 line-clamp-2 font-semibold leading-tight text-foreground">{item.name}</h3>
                      <Badge variant="outline" className="w-fit shrink-0 text-[10px]">{item.category}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description || 'No description'}</p>
                  </div>
                  <div className="mt-3 flex flex-col gap-2.5 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <span className={`shrink-0 text-[11px] font-medium uppercase tracking-wide ${item.isAvailable ? 'text-muted-foreground' : 'text-destructive'}`}>
                      {item.isAvailable ? 'Available' : 'Out of stock'}
                    </span>
                    {menuWrite && (
                      <div className="flex items-center justify-end gap-2 sm:shrink-0">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={item.isAvailable}
                          aria-label={`Toggle availability for ${item.name}`}
                          onClick={() => void toggleAvailability(item)}
                          className={`inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors ${item.isAvailable ? 'justify-end bg-emerald-500' : 'justify-start bg-slate-300'}`}
                          title="Toggle availability"
                        >
                          <span className="pointer-events-none block h-4 w-4 shrink-0 rounded-full bg-white shadow-sm" />
                        </button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => openEdit(item)} title="Edit item">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleDelete(item.id)} title="Delete item">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'orders' && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="grid w-full grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:w-auto sm:flex sm:items-end sm:gap-3">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input type="date" value={orderDateFrom} onChange={(e) => setOrderDateFrom(e.target.value)} className="w-full sm:w-40" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input type="date" value={orderDateTo} onChange={(e) => setOrderDateTo(e.target.value)} className="w-full sm:w-40" />
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center">
              {(orderDateFrom || orderDateTo) && (
                <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => { setOrderDateFrom(''); setOrderDateTo(''); }}>
                  Clear
                </Button>
              )}
              <Button variant="ink" className="w-full sm:w-auto" onClick={openNewOrder}>
                <Plus className="mr-2 h-4 w-4" />
                New order
              </Button>
            </div>
          </div>
          <Card>
            <div className="flex flex-col gap-1 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <h3 className="text-base font-semibold text-foreground">Recent Orders</h3>
              <span className="text-xs text-muted-foreground">{orders.length} order{orders.length === 1 ? '' : 's'}</span>
            </div>
            <div className="overflow-x-auto">
              <CardContent className="min-w-[720px] p-0 sm:min-w-0">
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
                      <TableCell>
                        <div className="text-sm font-medium text-foreground">{itemsCount(o.items)} items</div>
                        {Array.isArray(o.items) && o.items.length > 0 && (
                          <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {o.items.slice(0, 3).map((it: any) => `${it.name}${it.qty > 1 ? ` ×${it.qty}` : ''}`).join(', ')}
                            {o.items.length > 3 ? ` +${o.items.length - 3} more` : ''}
                          </div>
                        )}
                      </TableCell>
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
            </div>
          </Card>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit menu item' : 'Add menu item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-2xl">
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
            <OrderItemsPicker
              menuItems={menuItems}
              items={orderForm.items}
              onChange={(items) => setOrderForm({ ...orderForm, items })}
            />
            <div className="space-y-2">
              <Label>Total price (৳) — auto from items, override if needed</Label>
              <Input
                type="number"
                placeholder={String(orderForm.items.reduce((s, it) => s + it.price * it.qty, 0) || '')}
                value={orderForm.totalPrice}
                onChange={(e) => setOrderForm({ ...orderForm, totalPrice: e.target.value })}
              />
            </div>
            <div className="space-y-2"><Label>Notes</Label><Input value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOrderOpen(false)}>Cancel</Button><Button onClick={handleCreateOrder}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={orderEditOpen} onOpenChange={setOrderEditOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  placeholder={String(editOrderForm.items.reduce((s, it) => s + it.price * it.qty, 0) || '')}
                  value={editOrderForm.totalPrice}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, totalPrice: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <OrderItemsPicker
              menuItems={menuItems}
              items={editOrderForm.items}
              onChange={(items) => setEditOrderForm({ ...editOrderForm, items })}
            />
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

// ── Reusable order items picker ─────────────────────────────────────────────
type OrderItem = { menuId?: string; name: string; qty: number; price: number };

const OrderItemsPicker: React.FC<{
  menuItems: any[];
  items: OrderItem[];
  onChange: (items: OrderItem[]) => void;
}> = ({ menuItems, items, onChange }) => {
  const availableMenu = menuItems.filter((m) => m.isAvailable !== false);
  const subtotal = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);

  const updateRow = (idx: number, patch: Partial<OrderItem>) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange(next);
  };

  const removeRow = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const addRow = () => {
    const first = availableMenu[0];
    if (first) {
      onChange([...items, { menuId: first.id, name: first.name, qty: 1, price: Number(first.price) || 0 }]);
    } else {
      onChange([...items, { name: '', qty: 1, price: 0 }]);
    }
  };

  const onPickMenu = (idx: number, menuId: string) => {
    if (menuId === '__custom') {
      updateRow(idx, { menuId: undefined });
      return;
    }
    const m = menuItems.find((x) => x.id === menuId);
    if (m) updateRow(idx, { menuId: m.id, name: m.name, price: Number(m.price) || 0 });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Order items</Label>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          No items yet. Click <span className="font-medium text-foreground">Add item</span> to start.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 items-center gap-2 rounded-md border border-border bg-card p-2"
            >
              <div className="col-span-12 sm:col-span-5">
                <Select
                  value={it.menuId ?? '__custom'}
                  onValueChange={(v) => onPickMenu(idx, v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select dish" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMenu.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}  ·  ৳{Number(m.price).toLocaleString()}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom">Custom item…</SelectItem>
                  </SelectContent>
                </Select>
                {!it.menuId && (
                  <Input
                    className="mt-1.5 h-8"
                    placeholder="Custom item name"
                    value={it.name}
                    onChange={(e) => updateRow(idx, { name: e.target.value })}
                  />
                )}
              </div>

              <div className="col-span-4 sm:col-span-2">
                <Input
                  type="number"
                  min={1}
                  className="h-9 text-center"
                  value={it.qty}
                  onChange={(e) => updateRow(idx, { qty: Math.max(1, Number(e.target.value) || 1) })}
                />
              </div>

              <div className="col-span-4 sm:col-span-2">
                <Input
                  type="number"
                  min={0}
                  className="h-9"
                  value={it.price}
                  onChange={(e) => updateRow(idx, { price: Number(e.target.value) || 0 })}
                />
              </div>

              <div className="col-span-3 sm:col-span-2 text-right text-sm font-semibold tabular-nums">
                ৳{((Number(it.price) || 0) * (Number(it.qty) || 0)).toLocaleString()}
              </div>

              <div className="col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRow(idx)}
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold tabular-nums text-foreground">
              ৳{subtotal.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Restaurant;
