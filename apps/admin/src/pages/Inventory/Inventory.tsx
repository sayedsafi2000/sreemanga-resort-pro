import React, { useEffect, useState } from 'react';
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
import { Plus, Pencil, Loader2, AlertTriangle, PackagePlus, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/AuthContext';

const CATEGORIES = ['FOOD_ITEM', 'AMENITY', 'PRODUCT', 'SUPPLY', 'ASSET'] as const;

type Item = {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  costPrice: number;
  sellPrice?: number | null;
  supplier?: { id: string; name: string } | null;
  isActive: boolean;
};
type Movement = {
  id: string;
  type: string;
  quantity: number;
  balanceAfter: number;
  unitCost?: number | null;
  item?: { name: string; unit: string };
  createdAt: string;
};
type Supplier = { id: string; name: string; phone?: string | null; email?: string | null; isActive: boolean };

const canManageRole = (r?: string) => r === 'SUPER_ADMIN' || r === 'MANAGER' || r === 'ACCOUNTANT';

const emptyItem = {
  name: '', category: 'FOOD_ITEM', unit: 'pcs', currentStock: '', reorderLevel: '', costPrice: '', sellPrice: '', notes: '',
};

const Inventory: React.FC = () => {
  const { user } = useAuth();
  const canManage = canManageRole(user?.role);
  const [tab, setTab] = useState<'items' | 'movements' | 'suppliers'>('items');
  const [items, setItems] = useState<Item[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [itemDialog, setItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemForm, setItemForm] = useState<any>(emptyItem);

  const [purchaseDialog, setPurchaseDialog] = useState(false);
  const [purchaseLines, setPurchaseLines] = useState<Array<{ itemId: string; quantity: string; unitCost: string }>>([]);
  const [purchaseSupplier, setPurchaseSupplier] = useState('');

  const [adjustDialog, setAdjustDialog] = useState(false);
  const [adjustItem, setAdjustItem] = useState<Item | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');

  const [supplierDialog, setSupplierDialog] = useState(false);
  const [supplierForm, setSupplierForm] = useState<any>({ name: '', phone: '', email: '' });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [i, m, s] = await Promise.all([
        api.get('/inventory/items'),
        api.get('/inventory/movements'),
        api.get('/inventory/suppliers'),
      ]);
      setItems(unwrapList<Item>(i, ['items']));
      setMovements(unwrapList<Movement>(m, ['movements']));
      setSuppliers(unwrapList<Supplier>(s, ['suppliers']));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const lowCount = items.filter((i) => i.isActive && i.currentStock <= i.reorderLevel).length;

  // ── Item CRUD ──
  const openCreateItem = () => { setEditingItem(null); setItemForm(emptyItem); setError(null); setItemDialog(true); };
  const openEditItem = (it: Item) => {
    setEditingItem(it);
    setItemForm({ name: it.name, category: it.category, unit: it.unit, currentStock: '', reorderLevel: String(it.reorderLevel), costPrice: String(it.costPrice), sellPrice: it.sellPrice != null ? String(it.sellPrice) : '', notes: '' });
    setError(null); setItemDialog(true);
  };
  const saveItem = async () => {
    setSaving(true); setError(null);
    try {
      const payload: any = {
        name: itemForm.name, category: itemForm.category, unit: itemForm.unit,
        reorderLevel: Number(itemForm.reorderLevel) || 0,
        costPrice: Number(itemForm.costPrice) || 0,
        sellPrice: itemForm.sellPrice === '' ? null : Number(itemForm.sellPrice),
        notes: itemForm.notes || null,
      };
      if (editingItem) {
        await api.patch(`/inventory/items/${editingItem.id}`, payload);
      } else {
        payload.currentStock = Number(itemForm.currentStock) || 0;
        await api.post('/inventory/items', payload);
      }
      setItemDialog(false); await load();
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed to save item'); }
    finally { setSaving(false); }
  };

  // ── Purchase ──
  const openPurchase = () => { setPurchaseLines([{ itemId: items[0]?.id ?? '', quantity: '', unitCost: '' }]); setPurchaseSupplier(''); setError(null); setPurchaseDialog(true); };
  const savePurchase = async () => {
    setSaving(true); setError(null);
    try {
      await api.post('/inventory/purchases', {
        supplierId: purchaseSupplier || null,
        lines: purchaseLines.filter((l) => l.itemId && Number(l.quantity) > 0).map((l) => ({ itemId: l.itemId, quantity: Number(l.quantity), unitCost: Number(l.unitCost) || 0 })),
      });
      setPurchaseDialog(false); await load();
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed to record purchase'); }
    finally { setSaving(false); }
  };

  // ── Adjust ──
  const openAdjust = (it: Item) => { setAdjustItem(it); setAdjustQty(''); setAdjustNotes(''); setError(null); setAdjustDialog(true); };
  const saveAdjust = async () => {
    if (!adjustItem) return;
    setSaving(true); setError(null);
    try {
      await api.post('/inventory/adjustments', { itemId: adjustItem.id, quantity: Number(adjustQty), notes: adjustNotes || null });
      setAdjustDialog(false); await load();
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed to adjust'); }
    finally { setSaving(false); }
  };

  // ── Supplier ──
  const saveSupplier = async () => {
    setSaving(true); setError(null);
    try {
      await api.post('/inventory/suppliers', { name: supplierForm.name, phone: supplierForm.phone || null, email: supplierForm.email || null });
      setSupplierDialog(false); setSupplierForm({ name: '', phone: '', email: '' }); await load();
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed to save supplier'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Products, food items, amenities — stock, purchases and movements"
      />

      {lowCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          {lowCount} item{lowCount > 1 ? 's' : ''} at or below reorder level.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(['items', 'movements', 'suppliers'] as const).map((t) => (
          <Button key={t} variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)} className="capitalize">
            {t}
          </Button>
        ))}
        <div className="ml-auto flex gap-2">
          {canManage && tab === 'items' && (
            <>
              <Button variant="outline" onClick={openPurchase} disabled={items.length === 0}>
                <PackagePlus className="h-4 w-4 mr-1" /> Purchase
              </Button>
              <Button onClick={openCreateItem}><Plus className="h-4 w-4 mr-1" /> New Item</Button>
            </>
          )}
          {canManage && tab === 'suppliers' && (
            <Button onClick={() => { setSupplierForm({ name: '', phone: '', email: '' }); setSupplierDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New Supplier
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : tab === 'items' ? (
        <Card><CardContent className="p-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Stock</TableHead>
              <TableHead>Reorder</TableHead><TableHead>Cost</TableHead><TableHead>Supplier</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.map((it) => {
                const low = it.currentStock <= it.reorderLevel;
                return (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">{it.name}{!it.isActive && <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>}</TableCell>
                    <TableCell><Badge variant="outline">{it.category.replace('_', ' ')}</Badge></TableCell>
                    <TableCell><span className={low ? 'font-semibold text-amber-700' : ''}>{it.currentStock} {it.unit}</span></TableCell>
                    <TableCell className="text-muted-foreground">{it.reorderLevel}</TableCell>
                    <TableCell>৳{it.costPrice}</TableCell>
                    <TableCell className="text-muted-foreground">{it.supplier?.name ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <>
                          <Button size="sm" variant="ghost" title="Adjust stock" onClick={() => openAdjust(it)}><SlidersHorizontal className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => openEditItem(it)}><Pencil className="h-4 w-4" /></Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No items yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent></Card>
      ) : tab === 'movements' ? (
        <Card><CardContent className="p-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Item</TableHead><TableHead>Type</TableHead>
              <TableHead>Qty</TableHead><TableHead>Balance After</TableHead><TableHead>Unit Cost</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{m.item?.name ?? '—'}</TableCell>
                  <TableCell><Badge variant="outline">{m.type}</Badge></TableCell>
                  <TableCell>{m.quantity} {m.item?.unit}</TableCell>
                  <TableCell className="font-medium">{m.balanceAfter}</TableCell>
                  <TableCell>{m.unitCost != null ? `৳${m.unitCost}` : '—'}</TableCell>
                </TableRow>
              ))}
              {movements.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No movements yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-4">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.phone ?? '—'}</TableCell>
                  <TableCell>{s.email ?? '—'}</TableCell>
                  <TableCell><Badge className={s.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>{s.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                </TableRow>
              ))}
              {suppliers.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No suppliers yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}

      {/* Item dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingItem ? 'Edit Item' : 'New Inventory Item'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} /></div>
              <div>
                <Label>Category</Label>
                <Select value={itemForm.category} onValueChange={(v) => setItemForm({ ...itemForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Unit</Label><Input value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} placeholder="kg, pcs, litre" /></div>
              {!editingItem && <div><Label>Opening Stock</Label><Input type="number" value={itemForm.currentStock} onChange={(e) => setItemForm({ ...itemForm, currentStock: e.target.value })} /></div>}
              <div><Label>Reorder Level</Label><Input type="number" value={itemForm.reorderLevel} onChange={(e) => setItemForm({ ...itemForm, reorderLevel: e.target.value })} /></div>
              <div><Label>Cost Price</Label><Input type="number" value={itemForm.costPrice} onChange={(e) => setItemForm({ ...itemForm, costPrice: e.target.value })} /></div>
              <div><Label>Sell Price</Label><Input type="number" value={itemForm.sellPrice} onChange={(e) => setItemForm({ ...itemForm, sellPrice: e.target.value })} placeholder="optional" /></div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(false)}>Cancel</Button>
            <Button onClick={saveItem} disabled={saving || !itemForm.name || !itemForm.unit}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase dialog */}
      <Dialog open={purchaseDialog} onOpenChange={setPurchaseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Record Purchase (Stock In)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Supplier (optional)</Label>
              <Select value={purchaseSupplier || 'none'} onValueChange={(v) => setPurchaseSupplier(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="No supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No supplier</SelectItem>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              {purchaseLines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_90px_100px_auto] items-end gap-2">
                  <div>
                    {idx === 0 && <Label>Item</Label>}
                    <Select value={line.itemId} onValueChange={(v) => setPurchaseLines(purchaseLines.map((l, i) => i === idx ? { ...l, itemId: v } : l))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{items.map((it) => <SelectItem key={it.id} value={it.id}>{it.name} ({it.unit})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>{idx === 0 && <Label>Qty</Label>}<Input type="number" value={line.quantity} onChange={(e) => setPurchaseLines(purchaseLines.map((l, i) => i === idx ? { ...l, quantity: e.target.value } : l))} /></div>
                  <div>{idx === 0 && <Label>Unit Cost</Label>}<Input type="number" value={line.unitCost} onChange={(e) => setPurchaseLines(purchaseLines.map((l, i) => i === idx ? { ...l, unitCost: e.target.value } : l))} /></div>
                  <Button variant="ghost" size="sm" onClick={() => setPurchaseLines(purchaseLines.filter((_, i) => i !== idx))}>✕</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setPurchaseLines([...purchaseLines, { itemId: items[0]?.id ?? '', quantity: '', unitCost: '' }])}>+ Add line</Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseDialog(false)}>Cancel</Button>
            <Button onClick={savePurchase} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust dialog */}
      <Dialog open={adjustDialog} onOpenChange={setAdjustDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Adjust Stock — {adjustItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Current: {adjustItem?.currentStock} {adjustItem?.unit}. Use a negative number to remove (wastage), positive to add.</p>
            <div><Label>Quantity (+/-)</Label><Input type="number" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} /></div>
            <div><Label>Notes</Label><Textarea value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} /></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog(false)}>Cancel</Button>
            <Button onClick={saveAdjust} disabled={saving || !adjustQty}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier dialog */}
      <Dialog open={supplierDialog} onOpenChange={setSupplierDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Supplier</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} /></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierDialog(false)}>Cancel</Button>
            <Button onClick={saveSupplier} disabled={saving || !supplierForm.name}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
