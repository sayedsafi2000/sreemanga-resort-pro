import React, { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Ticket, PowerOff, Copy, Check } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import GuestPicker, { type GuestPick } from '@/components/GuestPicker';

type Voucher = {
  id: string;
  name: string;
  description?: string | null;
  codeHint: string;
  code?: string;
  discountType: string;
  discountValue: number;
  scope: string;
  appliesRoom: boolean;
  appliesDayLong: boolean;
  appliesRestaurant: boolean;
  minSpend?: number | null;
  maxDiscountAmount?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  maxRedemptions?: number | null;
  isActive: boolean;
  isSecure: boolean;
  assigneeType: string;
  assigneeId?: string | null;
  redemptionCount?: number;
  _count?: { redemptions: number };
  items?: { itemType: string; itemId: string }[];
};

const emptyForm = () => ({
  name: '',
  description: '',
  code: '',
  bulkCount: '1',
  discountType: 'PERCENT',
  discountValue: '10',
  scope: 'OVERALL',
  appliesRoom: true,
  appliesDayLong: true,
  appliesRestaurant: true,
  minSpend: '',
  maxDiscountAmount: '',
  startsAt: '',
  expiresAt: '',
  maxRedemptions: '',
  maxPerAssignee: '',
  isSecure: true,
  assigneeType: 'NONE',
  assigneeId: '',
  itemIds: '' as string, // comma-separated UUIDs for SELECTED_ITEMS (manual)
  itemType: 'ROOM',
});

const sectionLabel = (t: string) => (
  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border pb-1">{t}</p>
);

const Vouchers: React.FC = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedCodes, setRevealedCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [pickedGuest, setPickedGuest] = useState<GuestPick | null>(null);
  const [shareholders, setShareholders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/vouchers');
      setVouchers(unwrapList<Voucher>(res, ['vouchers']));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const loadAudienceOptions = async () => {
    try {
      const [sh, u, r, p, m] = await Promise.all([
        api.get('/shareholders?active=true').catch(() => ({ data: { shareholders: [] } })),
        api.get('/users').catch(() => ({ data: { users: [] } })),
        api.get('/rooms').catch(() => ({ data: { rooms: [] } })),
        api.get('/day-long/products').catch(() => ({ data: { products: [] } })),
        api.get('/restaurant/menu').catch(() => ({ data: { items: [], menu: [] } })),
      ]);
      setShareholders(unwrapList(sh, ['shareholders']));
      setUsers(unwrapList(u, ['users']));
      setRooms(unwrapList(r, ['rooms']));
      setProducts(unwrapList(p, ['products']));
      setMenu(unwrapList(m, ['menuItems', 'items', 'menu']));
    } catch {
      /* optional */
    }
  };

  const openCreate = () => {
    setForm(emptyForm());
    setPickedGuest(null);
    setSelectedItemIds([]);
    setError(null);
    setRevealedCodes([]);
    setOpen(true);
    loadAudienceOptions();
  };

  const itemOptions = useMemo(() => {
    if (form.itemType === 'ROOM') return rooms.map((x) => ({ id: x.id, label: x.name }));
    if (form.itemType === 'DAY_LONG_PRODUCT') return products.map((x) => ({ id: x.id, label: x.name }));
    return menu.map((x) => ({ id: x.id, label: `${x.name} (৳${x.price})` }));
  }, [form.itemType, rooms, products, menu]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const bulkCount = Math.max(1, Number(form.bulkCount) || 1);
      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        scope: form.scope,
        appliesRoom: form.appliesRoom,
        appliesDayLong: form.appliesDayLong,
        appliesRestaurant: form.appliesRestaurant,
        minSpend: form.minSpend === '' ? null : Number(form.minSpend),
        maxDiscountAmount: form.maxDiscountAmount === '' ? null : Number(form.maxDiscountAmount),
        startsAt: form.startsAt || null,
        expiresAt: form.expiresAt || null,
        maxRedemptions: form.maxRedemptions === '' ? null : Number(form.maxRedemptions),
        maxPerAssignee: form.maxPerAssignee === '' ? null : Number(form.maxPerAssignee),
        isSecure: form.isSecure,
        assigneeType: form.assigneeType,
        assigneeId:
          form.assigneeType === 'NONE'
            ? null
            : form.assigneeType === 'GUEST'
              ? pickedGuest?.id
              : form.assigneeId || null,
        bulkCount: bulkCount > 1 ? bulkCount : undefined,
        code: bulkCount === 1 && form.code.trim() ? form.code.trim() : undefined,
        items:
          form.scope === 'SELECTED_ITEMS'
            ? selectedItemIds.map((id) => ({ itemType: form.itemType, itemId: id }))
            : [],
      };
      if (!payload.name) throw new Error('Name is required');
      if (payload.assigneeType !== 'NONE' && !payload.assigneeId) {
        throw new Error('Select an assignee for personal vouchers');
      }
      if (payload.scope === 'SELECTED_ITEMS' && payload.items.length === 0) {
        throw new Error('Select at least one item');
      }

      const res = await api.post('/vouchers', payload);
      const codes: string[] =
        res.data.codes ||
        (res.data.voucher?.code ? [res.data.voucher.code] : []);
      setRevealedCodes(codes);
      await load();
      if (codes.length === 0) setOpen(false);
    } catch (e: any) {
      setError(e?.message || e?.response?.data?.message || 'Failed to create voucher');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id: string) => {
    if (!window.confirm('Deactivate this voucher?')) return;
    await api.delete(`/vouchers/${id}`);
    await load();
  };

  const copyCodes = async () => {
    await navigator.clipboard.writeText(revealedCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vouchers"
        description="Discount codes for room, day-long, and restaurant — percent or fixed, overall or item-scoped"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> New Voucher
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((v) => {
                  const uses = v.redemptionCount ?? v._count?.redemptions ?? 0;
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">
                        <div>{v.name}</div>
                        {v.assigneeType !== 'NONE' && (
                          <div className="text-xs text-muted-foreground">Locked: {v.assigneeType}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">••••{v.codeHint}</TableCell>
                      <TableCell>
                        {v.discountType === 'PERCENT' ? `${v.discountValue}%` : `৳${v.discountValue}`}
                        <span className="text-xs text-muted-foreground ml-1">
                          {v.scope === 'SELECTED_ITEMS' ? 'items' : 'overall'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs space-x-1">
                        {v.appliesRoom && <Badge variant="outline">Room</Badge>}
                        {v.appliesDayLong && <Badge variant="outline">Day</Badge>}
                        {v.appliesRestaurant && <Badge variant="outline">Rest</Badge>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        {uses}
                        {v.maxRedemptions != null ? ` / ${v.maxRedemptions}` : ''}
                      </TableCell>
                      <TableCell>
                        <Badge className={v.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                          {v.isActive ? 'Active' : 'Off'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {v.isActive && (
                          <Button size="sm" variant="ghost" onClick={() => deactivate(v.id)} title="Deactivate">
                            <PowerOff className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {vouchers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      <Ticket className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      No vouchers yet. Create one to offer discounts across bookings and orders.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{revealedCodes.length ? 'Voucher created' : 'New voucher'}</DialogTitle>
          </DialogHeader>

          {revealedCodes.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-amber-800 bg-amber-50 rounded-md px-3 py-2">
                Copy these codes now — they are hashed and will not be shown again.
              </p>
              <pre className="rounded-md border bg-muted/40 p-3 text-sm font-mono whitespace-pre-wrap">
                {revealedCodes.join('\n')}
              </pre>
              <Button type="button" variant="outline" onClick={copyCodes}>
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? 'Copied' : 'Copy codes'}
              </Button>
              <DialogFooter>
                <Button onClick={() => { setOpen(false); setRevealedCodes([]); }}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-5">
                <section className="space-y-3">
                  {sectionLabel('Basics')}
                  <div>
                    <Label>Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Summer 10%" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Custom code (optional)</Label>
                      <Input
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                        placeholder="Auto-generate if empty"
                        disabled={Number(form.bulkCount) > 1}
                      />
                    </div>
                    <div>
                      <Label>Bulk count</Label>
                      <Input
                        type="number"
                        min={1}
                        max={200}
                        value={form.bulkCount}
                        onChange={(e) => setForm({ ...form, bulkCount: e.target.value })}
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  {sectionLabel('Discount')}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Type</Label>
                      <Select value={form.discountType} onValueChange={(v) => setForm({ ...form, discountType: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERCENT">Percent %</SelectItem>
                          <SelectItem value="FIXED">Fixed ৳</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Value *</Label>
                      <Input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Scope</Label>
                      <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OVERALL">Overall total</SelectItem>
                          <SelectItem value="SELECTED_ITEMS">Selected items</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Max discount ৳</Label>
                      <Input type="number" value={form.maxDiscountAmount} onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })} placeholder="optional cap" />
                    </div>
                  </div>
                  {form.scope === 'SELECTED_ITEMS' && (
                    <div className="space-y-2 rounded-md border p-3">
                      <Label>Item type</Label>
                      <Select value={form.itemType} onValueChange={(v) => { setForm({ ...form, itemType: v }); setSelectedItemIds([]); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ROOM">Rooms</SelectItem>
                          <SelectItem value="DAY_LONG_PRODUCT">Day Long products</SelectItem>
                          <SelectItem value="MENU_ITEM">Menu items</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="max-h-40 overflow-auto space-y-1 mt-2">
                        {itemOptions.map((opt) => (
                          <label key={opt.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={selectedItemIds.includes(opt.id)}
                              onChange={(e) => {
                                setSelectedItemIds((prev) =>
                                  e.target.checked ? [...prev, opt.id] : prev.filter((x) => x !== opt.id)
                                );
                              }}
                            />
                            {opt.label}
                          </label>
                        ))}
                        {itemOptions.length === 0 && (
                          <p className="text-xs text-muted-foreground">No items loaded.</p>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                <section className="space-y-3">
                  {sectionLabel('Applies to')}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {([
                      ['appliesRoom', 'Room bookings'],
                      ['appliesDayLong', 'Day Long'],
                      ['appliesRestaurant', 'Restaurant'],
                    ] as const).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={(form as any)[key]}
                          onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div>
                    <Label>Minimum spend ৳</Label>
                    <Input type="number" value={form.minSpend} onChange={(e) => setForm({ ...form, minSpend: e.target.value })} placeholder="optional" />
                  </div>
                </section>

                <section className="space-y-3">
                  {sectionLabel('Validity')}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Starts</Label>
                      <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
                    </div>
                    <div>
                      <Label>Expires</Label>
                      <Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Max redemptions</Label>
                      <Input type="number" value={form.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })} placeholder="unlimited" />
                    </div>
                    <div>
                      <Label>Max per assignee</Label>
                      <Input type="number" value={form.maxPerAssignee} onChange={(e) => setForm({ ...form, maxPerAssignee: e.target.value })} placeholder="optional" />
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  {sectionLabel('Audience')}
                  <Select
                    value={form.assigneeType}
                    onValueChange={(v) => {
                      setForm({ ...form, assigneeType: v, assigneeId: '' });
                      setPickedGuest(null);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Anyone with the code</SelectItem>
                      <SelectItem value="GUEST">Specific guest</SelectItem>
                      <SelectItem value="USER">Staff user</SelectItem>
                      <SelectItem value="SHAREHOLDER">Shareholder</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.assigneeType === 'GUEST' && (
                    <GuestPicker value={pickedGuest} onChange={setPickedGuest} label="Assign to guest" />
                  )}
                  {form.assigneeType === 'USER' && (
                    <Select value={form.assigneeId} onValueChange={(v) => setForm({ ...form, assigneeId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {form.assigneeType === 'SHAREHOLDER' && (
                    <Select value={form.assigneeId} onValueChange={(v) => setForm({ ...form, assigneeId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select shareholder" /></SelectTrigger>
                      <SelectContent>
                        {shareholders.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={form.isSecure}
                      onChange={(e) => setForm({ ...form, isSecure: e.target.checked })}
                    />
                    Secure (store hashed code only)
                  </label>
                </section>

                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Create
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vouchers;
