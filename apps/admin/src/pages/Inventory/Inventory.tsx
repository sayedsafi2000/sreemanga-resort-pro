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
import {
  Plus,
  Pencil,
  Loader2,
  AlertTriangle,
  PackagePlus,
  SlidersHorizontal,
  PackageMinus,
  Ban,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/AuthContext';
import {
  canAdjustStock,
  canDeactivateInventoryItem,
  canIssueStock,
  canManageInventory,
  canManageSuppliers,
} from '@/config/rbac';

const CATEGORIES = ['FOOD_ITEM', 'AMENITY', 'PRODUCT', 'SUPPLY', 'ASSET'] as const;
type Tab = 'items' | 'movements' | 'suppliers';

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
  notes?: string | null;
  item?: { name: string; unit: string };
  createdAt: string;
  createdBy?: { id: string; name: string } | null;
};
type Supplier = { id: string; name: string; phone?: string | null; email?: string | null; isActive: boolean };

const MOVE_META: Record<string, { label: string; className: string; sign: 'in' | 'out' | 'adjust' }> = {
  PURCHASE: { label: 'Purchase', className: 'bg-emerald-100 text-emerald-800 border-emerald-200', sign: 'in' },
  RETURN: { label: 'Return', className: 'bg-teal-100 text-teal-800 border-teal-200', sign: 'in' },
  ISSUE: { label: 'Issue', className: 'bg-amber-100 text-amber-800 border-amber-200', sign: 'out' },
  SALE: { label: 'Sale', className: 'bg-rose-100 text-rose-800 border-rose-200', sign: 'out' },
  CONSUMPTION: { label: 'Consumption', className: 'bg-rose-100 text-rose-800 border-rose-200', sign: 'out' },
  ADJUSTMENT: { label: 'Adjust', className: 'bg-blue-100 text-blue-800 border-blue-200', sign: 'adjust' },
};

function formatMoveQty(type: string, quantity: number): string {
  const meta = MOVE_META[type];
  if (meta?.sign === 'out') return `−${quantity}`;
  if (meta?.sign === 'in') return `+${quantity}`;
  return String(quantity);
}

const emptyItem = {
  name: '', category: 'FOOD_ITEM', unit: 'pcs', currentStock: '', reorderLevel: '', costPrice: '', sellPrice: '', notes: '',
};

const Inventory: React.FC = () => {
  const { user } = useAuth();
  const canManage = canManageInventory(user?.role);
  const canAdjust = canAdjustStock(user?.role);
  const canIssue = canIssueStock(user?.role);
  const canDeactivate = canDeactivateInventoryItem(user?.role);
  const canSuppliers = canManageSuppliers(user?.role);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: Tab =
    tabParam === 'movements' || tabParam === 'suppliers' || tabParam === 'items'
      ? tabParam
      : 'items';
  const lowOnly = searchParams.get('low') === '1';
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const setTab = (t: Tab) => {
    const p = new URLSearchParams(searchParams);
    p.set('tab', t);
    if (t !== 'items') p.delete('low');
    setSearchParams(p, { replace: true });
  };
  const setLowOnly = (on: boolean) => {
    const p = new URLSearchParams(searchParams);
    p.set('tab', 'items');
    if (on) p.set('low', '1');
    else p.delete('low');
    setSearchParams(p, { replace: true });
  };

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

  const [issueDialog, setIssueDialog] = useState(false);
  const [issueItem, setIssueItem] = useState<Item | null>(null);
  const [issueQty, setIssueQty] = useState('');
  const [issueNotes, setIssueNotes] = useState('');

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

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (lowOnly && !(it.isActive && it.currentStock <= it.reorderLevel)) return false;
      if (categoryFilter !== 'all' && it.category !== categoryFilter) return false;
      if (q && !it.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, lowOnly, categoryFilter, search]);

  const adjustPreview = adjustItem && adjustQty !== '' && !Number.isNaN(Number(adjustQty))
    ? adjustItem.currentStock + Number(adjustQty)
    : null;
  const adjustWouldGoNegative = adjustPreview != null && adjustPreview < 0;

  const issuePreview = issueItem && issueQty !== '' && Number(issueQty) > 0
    ? issueItem.currentStock - Number(issueQty)
    : null;
  const issueWouldGoNegative = issuePreview != null && issuePreview < 0;

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

  const deactivateItem = async (it: Item) => {
    if (!confirm(`Deactivate "${it.name}"? It will no longer appear as active stock.`)) return;
    setSaving(true); setError(null);
    try {
      await api.delete(`/inventory/items/${it.id}`);
      await load();
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed to deactivate'); }
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
    if (!adjustItem || adjustWouldGoNegative) return;
    setSaving(true); setError(null);
    try {
      await api.post('/inventory/adjustments', { itemId: adjustItem.id, quantity: Number(adjustQty), notes: adjustNotes || null });
      setAdjustDialog(false); await load();
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed to adjust'); }
    finally { setSaving(false); }
  };

  // ── Issue ──
  const openIssue = (it: Item) => { setIssueItem(it); setIssueQty(''); setIssueNotes(''); setError(null); setIssueDialog(true); };
  const saveIssue = async () => {
    if (!issueItem || issueWouldGoNegative || !(Number(issueQty) > 0)) return;
    setSaving(true); setError(null);
    try {
      await api.post('/inventory/issues', { itemId: issueItem.id, quantity: Number(issueQty), notes: issueNotes || null });
      setIssueDialog(false); await load();
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed to issue stock'); }
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
        <button
          type="button"
          onClick={() => setLowOnly(true)}
          className="flex w-full items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-left text-sm text-amber-800 hover:bg-amber-100"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {lowCount} item{lowCount > 1 ? 's' : ''} at or below reorder level. Click to filter.
        </button>
      )}

      <div className="flex flex-wrap gap-2">
        {(['items', 'movements', 'suppliers'] as const).map((t) => (
          <Button key={t} variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)} className="capitalize">
            {t}
          </Button>
        ))}
        <div className="ml-auto flex flex-wrap gap-2">
          {canManage && tab === 'items' && (
            <>
              <Button variant="outline" onClick={openPurchase} disabled={items.length === 0}>
                <PackagePlus className="h-4 w-4 mr-1" /> Purchase
              </Button>
              <Button onClick={openCreateItem}><Plus className="h-4 w-4 mr-1" /> New Item</Button>
            </>
          )}
          {canSuppliers && tab === 'suppliers' && (
            <Button onClick={() => { setSupplierForm({ name: '', phone: '', email: '' }); setSupplierDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New Supplier
            </Button>
          )}
        </div>
      </div>

      {tab === 'items' && !loading && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="max-w-xs"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant={lowOnly ? 'default' : 'outline'}
            onClick={() => setLowOnly(!lowOnly)}
            className={lowOnly ? 'bg-amber-600 hover:bg-amber-700' : ''}
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Low stock only
          </Button>
        </div>
      )}

      {error && !itemDialog && !purchaseDialog && !adjustDialog && !issueDialog && !supplierDialog && (
        <p className="text-sm text-red-600">{error}</p>
      )}

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
              {filteredItems.map((it) => {
                const low = it.currentStock <= it.reorderLevel;
                return (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">{it.name}{!it.isActive && <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>}</TableCell>
                    <TableCell><Badge variant="outline">{it.category.replace('_', ' ')}</Badge></TableCell>
                    <TableCell><span className={low ? 'font-semibold text-amber-700' : ''}>{it.currentStock} {it.unit}</span></TableCell>
                    <TableCell className="text-muted-foreground">{it.reorderLevel}</TableCell>
                    <TableCell>৳{it.costPrice}</TableCell>
                    <TableCell className="text-muted-foreground">{it.supplier?.name ?? '—'}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1">
                        {canIssue && it.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                            onClick={() => openIssue(it)}
                          >
                            <PackageMinus className="h-3.5 w-3.5 mr-1" /> Issue
                          </Button>
                        )}
                        {canAdjust && it.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                            onClick={() => openAdjust(it)}
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5 mr-1" /> Adjust
                          </Button>
                        )}
                        {canManage && (
                          <Button size="sm" variant="outline" className="h-7" onClick={() => openEditItem(it)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                        )}
                        {canDeactivate && it.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            onClick={() => deactivateItem(it)}
                          >
                            <Ban className="h-3.5 w-3.5 mr-1" /> Deactivate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {items.length === 0 ? 'No items yet.' : 'No items match this filter.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent></Card>
      ) : tab === 'movements' ? (
        <Card><CardContent className="p-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>When</TableHead><TableHead>Item</TableHead><TableHead>Type</TableHead>
              <TableHead>Qty</TableHead><TableHead>Balance after</TableHead><TableHead>Unit cost</TableHead><TableHead>By</TableHead><TableHead>Notes</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {movements.map((m) => {
                const meta = MOVE_META[m.type] ?? { label: m.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), className: 'bg-slate-100 text-slate-700', sign: 'adjust' as const };
                const notes = m.notes?.trim() || '';
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(m.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{m.item?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                    </TableCell>
                    <TableCell className={meta.sign === 'out' ? 'text-amber-800 font-medium' : meta.sign === 'in' ? 'text-emerald-700 font-medium' : ''}>
                      {formatMoveQty(m.type, m.quantity)} {m.item?.unit}
                    </TableCell>
                    <TableCell className={`font-medium ${m.balanceAfter < 0 ? 'text-red-600' : ''}`}>{m.balanceAfter}</TableCell>
                    <TableCell>{m.unitCost != null ? `৳${m.unitCost}` : '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.createdBy?.name ?? '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={notes || undefined}>
                      {notes || '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
              {movements.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No movements yet.</TableCell></TableRow>}
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
          <DialogHeader><DialogTitle>{editingItem ? `Edit item — ${editingItem.name}` : 'New inventory item'}</DialogTitle></DialogHeader>
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
                      <SelectContent>{items.filter((it) => it.isActive).map((it) => <SelectItem key={it.id} value={it.id}>{it.name} ({it.unit})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>{idx === 0 && <Label>Qty</Label>}<Input type="number" value={line.quantity} onChange={(e) => setPurchaseLines(purchaseLines.map((l, i) => i === idx ? { ...l, quantity: e.target.value } : l))} /></div>
                  <div>{idx === 0 && <Label>Unit Cost</Label>}<Input type="number" value={line.unitCost} onChange={(e) => setPurchaseLines(purchaseLines.map((l, i) => i === idx ? { ...l, unitCost: e.target.value } : l))} /></div>
                  <Button variant="ghost" size="sm" onClick={() => setPurchaseLines(purchaseLines.filter((_, i) => i !== idx))}>✕</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setPurchaseLines([...purchaseLines, { itemId: items.find((i) => i.isActive)?.id ?? '', quantity: '', unitCost: '' }])}>+ Add line</Button>
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
          <DialogHeader><DialogTitle>Adjust stock — {adjustItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Current: {adjustItem?.currentStock} {adjustItem?.unit}. Use a negative number to remove (wastage), positive to add.
            </p>
            <div><Label>Quantity (+/-)</Label><Input type="number" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} /></div>
            {adjustPreview != null && (
              <p className={`text-sm ${adjustWouldGoNegative ? 'font-medium text-red-600' : 'text-muted-foreground'}`}>
                New balance: {adjustPreview} {adjustItem?.unit}
                {adjustWouldGoNegative && ' — cannot go below zero'}
              </p>
            )}
            <div><Label>Notes</Label><Textarea value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} /></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog(false)}>Cancel</Button>
            <Button onClick={saveAdjust} disabled={saving || !adjustQty || adjustWouldGoNegative}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue dialog */}
      <Dialog open={issueDialog} onOpenChange={setIssueDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Issue stock — {issueItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Current: {issueItem?.currentStock} {issueItem?.unit}. Enter how much to take out.
            </p>
            <div><Label>Quantity out</Label><Input type="number" min={0.01} step="any" value={issueQty} onChange={(e) => setIssueQty(e.target.value)} /></div>
            {issuePreview != null && (
              <p className={`text-sm ${issueWouldGoNegative ? 'font-medium text-red-600' : 'text-muted-foreground'}`}>
                New balance: {issuePreview} {issueItem?.unit}
                {issueWouldGoNegative && ' — insufficient stock'}
              </p>
            )}
            <div><Label>Notes</Label><Textarea value={issueNotes} onChange={(e) => setIssueNotes(e.target.value)} placeholder="e.g. Housekeeping floor 2" /></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueDialog(false)}>Cancel</Button>
            <Button onClick={saveIssue} disabled={saving || !(Number(issueQty) > 0) || issueWouldGoNegative}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Issue
            </Button>
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
