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
import { Plus, Pencil, Trash2, ImageIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const categories = ['Main Course', 'Soup', 'Beverage', 'Snacks', 'Dessert'];

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
      const [mRes, oRes, rRes] = await Promise.all([
        api.get('/restaurant/menu'),
        api.get('/restaurant/orders'),
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

  useEffect(() => { fetchData(); }, []);

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

  const orderStatusColor = (s: string) => {
    switch (s) {
      case 'DELIVERED': return 'success';
      case 'PREPARING': return 'warning';
      case 'PENDING': return 'secondary';
      case 'CANCELLED': return 'destructive';
      default: return 'outline';
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Restaurant</h1>
      <div className="flex gap-2">
        <Button variant={tab === 'menu' ? 'default' : 'outline'} onClick={() => setTabNavigate('menu')}>Menu Items</Button>
        <Button variant={tab === 'orders' ? 'default' : 'outline'} onClick={() => setTabNavigate('orders')}>Orders</Button>
      </div>

      {tab === 'menu' && (
        <>
          {menuWrite && (
            <div className="flex justify-end">
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Item</Button>
            </div>
          )}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Photo</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Available</TableHead>
                    {menuWrite && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border bg-muted">
                          {item.image ? (
                            <img src={item.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-muted-foreground" aria-hidden />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>৳{item.price}</TableCell>
                      <TableCell>
                        <Badge variant={item.isAvailable ? 'success' : 'destructive'}>
                          {item.isAvailable ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      {menuWrite && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {menuItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={menuWrite ? 6 : 5} className="py-8 text-center text-muted-foreground">
                        No menu items
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'orders' && (
        <>
          <div className="flex justify-end">
            <Button onClick={openNewOrder}><Plus className="h-4 w-4 mr-2" />New order</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
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
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>{o.room?.name || o.roomId || '-'}</TableCell>
                      <TableCell>{itemsCount(o.items)} items</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.user?.name || '—'}</TableCell>
                      <TableCell>৳{o.totalPrice?.toLocaleString?.() ?? o.totalPrice}</TableCell>
                      <TableCell><Badge variant={orderStatusColor(o.status) as any}>{o.status}</Badge></TableCell>
                      <TableCell>{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditOrder(o)}><Pencil className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No orders</TableCell></TableRow>}
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
                  {categories.map((c) => (
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
