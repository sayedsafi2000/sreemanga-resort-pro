import React, { useEffect, useState } from 'react';
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
  assignees?: { assigneeType: string; assigneeId: string }[];
  redemptionCount?: number;
  _count?: { redemptions: number };
  items?: { itemType: string; itemId: string }[];
};

type AssigneeChip = {
  assigneeType: 'GUEST' | 'USER' | 'SHAREHOLDER';
  assigneeId: string;
  label: string;
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
});

const sectionLabel = (t: string) => (
  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border pb-1">{t}</p>
);

const ItemChecklist = ({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string, on: boolean) => void;
}) => (
  <div className="space-y-2 rounded-md border p-3">
    <Label>{title}</Label>
    <div className="max-h-36 overflow-auto space-y-1">
      {options.map((opt) => (
        <label key={opt.id} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={selected.includes(opt.id)}
            onChange={(e) => onToggle(opt.id, e.target.checked)}
          />
          {opt.label}
        </label>
      ))}
      {options.length === 0 && (
        <p className="text-xs text-muted-foreground">No items loaded.</p>
      )}
    </div>
  </div>
);

const Vouchers: React.FC = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [emailLookup, setEmailLookup] = useState('');
  const [lookupMeta, setLookupMeta] = useState<{ email: string; identities: string[] } | null>(null);
  const [copiedHintId, setCopiedHintId] = useState<string | null>(null);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedCodes, setRevealedCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [pickedGuest, setPickedGuest] = useState<GuestPick | null>(null);
  const [assignees, setAssignees] = useState<AssigneeChip[]>([]);
  const [addType, setAddType] = useState<'GUEST' | 'USER' | 'SHAREHOLDER'>('USER');
  const [addId, setAddId] = useState('');
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [shareholders, setShareholders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);

  const load = async (opts?: { q?: string; email?: string }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const q = (opts?.q ?? searchQ).trim();
      const email = (opts?.email ?? emailLookup).trim();
      if (q) params.set('q', q);
      if (email) params.set('email', email);
      const res = await api.get(`/vouchers${params.toString() ? `?${params}` : ''}`);
      setVouchers(unwrapList<Voucher>(res, ['vouchers']));
      if (email && res.data?.lookupEmail) {
        setLookupMeta({
          email: res.data.lookupEmail,
          identities: Array.isArray(res.data.identities) ? res.data.identities : [],
        });
      } else if (!email) {
        setLookupMeta(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search / email lookup
  useEffect(() => {
    const t = setTimeout(() => {
      load({ q: searchQ, email: emailLookup });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ, emailLookup]);

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
    setAssignees([]);
    setAddType('USER');
    setAddId('');
    setAssigneeSearch('');
    setSelectedRoomIds([]);
    setSelectedProductIds([]);
    setSelectedMenuIds([]);
    setError(null);
    setRevealedCodes([]);
    setOpen(true);
    loadAudienceOptions();
  };

  const addAssignee = (chip: AssigneeChip) => {
    setAssignees((prev) => {
      if (prev.some((a) => a.assigneeType === chip.assigneeType && a.assigneeId === chip.assigneeId)) {
        return prev;
      }
      return [...prev, chip];
    });
  };

  const removeAssignee = (type: string, id: string) => {
    setAssignees((prev) => prev.filter((a) => !(a.assigneeType === type && a.assigneeId === id)));
  };

  const filteredUsers = users.filter((u) => {
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    );
  });

  const filteredShareholders = shareholders.filter((s) => {
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    );
  });

  const setChannel = (key: 'appliesRoom' | 'appliesDayLong' | 'appliesRestaurant', on: boolean) => {
    setForm((prev) => ({ ...prev, [key]: on }));
    if (!on) {
      if (key === 'appliesRoom') setSelectedRoomIds([]);
      if (key === 'appliesDayLong') setSelectedProductIds([]);
      if (key === 'appliesRestaurant') setSelectedMenuIds([]);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (!form.appliesRoom && !form.appliesDayLong && !form.appliesRestaurant) {
        throw new Error('Select at least one channel');
      }
      const items: { itemType: string; itemId: string }[] = [];
      if (form.scope === 'SELECTED_ITEMS') {
        if (form.appliesRoom) {
          selectedRoomIds.forEach((id) => items.push({ itemType: 'ROOM', itemId: id }));
        }
        if (form.appliesDayLong) {
          selectedProductIds.forEach((id) => items.push({ itemType: 'DAY_LONG_PRODUCT', itemId: id }));
        }
        if (form.appliesRestaurant) {
          selectedMenuIds.forEach((id) => items.push({ itemType: 'MENU_ITEM', itemId: id }));
        }
        if (items.length === 0) throw new Error('Select at least one item for the enabled channels');
      }

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
        minSpend: form.minSpend === '' || Number.isNaN(Number(form.minSpend)) ? null : Number(form.minSpend),
        maxDiscountAmount:
          form.maxDiscountAmount === '' || Number.isNaN(Number(form.maxDiscountAmount))
            ? null
            : Number(form.maxDiscountAmount),
        startsAt: form.startsAt || null,
        expiresAt: form.expiresAt || null,
        maxRedemptions:
          form.maxRedemptions === '' || Number.isNaN(Number(form.maxRedemptions))
            ? null
            : Number(form.maxRedemptions),
        maxPerAssignee:
          form.maxPerAssignee === '' || Number.isNaN(Number(form.maxPerAssignee))
            ? null
            : Number(form.maxPerAssignee),
        isSecure: form.isSecure,
        assignees: assignees.map((a) => ({
          assigneeType: a.assigneeType,
          assigneeId: a.assigneeId,
        })),
        bulkCount: bulkCount > 1 ? bulkCount : undefined,
        code: bulkCount === 1 && form.code.trim() ? form.code.trim() : undefined,
        items,
      };
      if (!payload.name) throw new Error('Name is required');

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

  const flashCopy = (msg: string, ok: boolean) => {
    setCopyNotice(msg);
    setTimeout(() => setCopyNotice(null), ok ? 1500 : 4000);
  };

  const copyText = async (text: string): Promise<boolean> => {
    const value = (text || '').trim();
    if (!value) return false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch {
      /* fall through */
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, value.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const copyCodes = async () => {
    const ok = await copyText(revealedCodes.join('\n'));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      flashCopy('Codes copied', true);
    } else {
      flashCopy('Could not copy — select the code and use Ctrl/Cmd+C', false);
    }
  };

  const copyOneCode = async (code: string, idx: number) => {
    const ok = await copyText(code);
    if (ok) {
      setCopiedCodeIdx(idx);
      setTimeout(() => setCopiedCodeIdx(null), 1500);
      flashCopy('Code copied', true);
    } else {
      flashCopy('Could not copy — select the code and use Ctrl/Cmd+C', false);
    }
  };

  const copyHint = async (v: Voucher) => {
    const text = (v.code && v.code.trim()) || '';
    if (!text) {
      flashCopy(
        'Full code not stored for this voucher (created before copy support). Create a new one to get a copyable code.',
        false
      );
      return;
    }
    const ok = await copyText(text);
    if (ok) {
      setCopiedHintId(v.id);
      setTimeout(() => setCopiedHintId(null), 1500);
      flashCopy(`Copied ${text}`, true);
    } else {
      flashCopy(`Could not copy “${text}”. Try selecting it manually.`, false);
    }
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

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Search vouchers</Label>
              <Input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Name, description, or code hint…"
              />
            </div>
            <div>
              <Label>Available for email / account</Label>
              <Input
                value={emailLookup}
                onChange={(e) => setEmailLookup(e.target.value)}
                placeholder="e.g. shareholder@resortnirjon.com"
                type="email"
              />
            </div>
          </div>
          {lookupMeta && (
            <p className="text-xs text-muted-foreground">
              Showing vouchers for <span className="font-medium text-foreground">{lookupMeta.email}</span>
              {lookupMeta.identities.length > 0
                ? ` (matched: ${[...new Set(lookupMeta.identities)].join(', ')})`
                : ' (no Guest/User/Shareholder match — public vouchers only)'}
              {' · '}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => setEmailLookup('')}
              >
                Clear
              </button>
            </p>
          )}
          {copyNotice && (
            <p
              className={`text-xs ${
                copyNotice.startsWith('Could') ? 'text-red-600' : 'text-green-700'
              }`}
            >
              {copyNotice}
            </p>
          )}
        </CardContent>
      </Card>

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
                        {(v.assignees?.length ?? 0) > 0 ? (
                          <div className="text-xs text-muted-foreground">
                            {v.assignees!.length} recipient{v.assignees!.length === 1 ? '' : 's'} (
                            {[...new Set(v.assignees!.map((a) => a.assigneeType))].join(', ')})
                          </div>
                        ) : v.assigneeType !== 'NONE' ? (
                          <div className="text-xs text-muted-foreground">Locked: {v.assigneeType}</div>
                        ) : (
                          <div className="text-xs text-muted-foreground">Public</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-sm select-all">
                            {v.code ? v.code : `••••${v.codeHint}`}
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title={v.code ? `Copy ${v.code}` : 'Full code not available'}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void copyHint(v);
                            }}
                          >
                            {copiedHintId === v.id ? (
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
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
                      {emailLookup.trim() || searchQ.trim()
                        ? 'No vouchers match this search / email.'
                        : 'No vouchers yet. Create one to offer discounts across bookings and orders.'}
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
              <ul className="space-y-2">
                {revealedCodes.map((code, idx) => (
                  <li
                    key={`${code}-${idx}`}
                    className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2"
                  >
                    <span className="font-mono text-sm break-all">{code}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => copyOneCode(code, idx)}
                    >
                      {copiedCodeIdx === idx ? (
                        <Check className="h-4 w-4 mr-1 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      {copiedCodeIdx === idx ? 'Copied' : 'Copy'}
                    </Button>
                  </li>
                ))}
              </ul>
              {revealedCodes.length > 1 && (
                <Button type="button" variant="outline" onClick={copyCodes}>
                  {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? 'Copied all' : 'Copy all codes'}
                </Button>
              )}
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
                  <div>
                    <Label>Max discount ৳</Label>
                    <Input type="number" value={form.maxDiscountAmount} onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })} placeholder="optional cap" />
                  </div>
                </section>

                <section className="space-y-3">
                  {sectionLabel('Applies to')}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="h-4 w-4" checked={form.appliesRoom} onChange={(e) => setChannel('appliesRoom', e.target.checked)} />
                      Room bookings
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="h-4 w-4" checked={form.appliesDayLong} onChange={(e) => setChannel('appliesDayLong', e.target.checked)} />
                      Day Long
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="h-4 w-4" checked={form.appliesRestaurant} onChange={(e) => setChannel('appliesRestaurant', e.target.checked)} />
                      Restaurant
                    </label>
                  </div>
                  <div>
                    <Label>Scope</Label>
                    <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OVERALL">Overall total on selected channels</SelectItem>
                        <SelectItem value="SELECTED_ITEMS">Selected items only</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Overall applies to any booking/order on the checked channels. Selected items shows pickers only for those channels.
                    </p>
                  </div>
                  {form.scope === 'SELECTED_ITEMS' && (
                    <div className="space-y-3">
                      {form.appliesRoom && (
                        <ItemChecklist
                          title="Rooms"
                          options={rooms.map((x) => ({ id: x.id, label: x.name }))}
                          selected={selectedRoomIds}
                          onToggle={(id, on) =>
                            setSelectedRoomIds((prev) => (on ? [...prev, id] : prev.filter((x) => x !== id)))
                          }
                        />
                      )}
                      {form.appliesDayLong && (
                        <ItemChecklist
                          title="Day Long products"
                          options={products.map((x) => ({ id: x.id, label: x.name }))}
                          selected={selectedProductIds}
                          onToggle={(id, on) =>
                            setSelectedProductIds((prev) => (on ? [...prev, id] : prev.filter((x) => x !== id)))
                          }
                        />
                      )}
                      {form.appliesRestaurant && (
                        <ItemChecklist
                          title="Menu items"
                          options={menu.map((x) => ({ id: x.id, label: `${x.name} (৳${x.price})` }))}
                          selected={selectedMenuIds}
                          onToggle={(id, on) =>
                            setSelectedMenuIds((prev) => (on ? [...prev, id] : prev.filter((x) => x !== id)))
                          }
                        />
                      )}
                      {!form.appliesRoom && !form.appliesDayLong && !form.appliesRestaurant && (
                        <p className="text-sm text-amber-700">Enable at least one channel to pick items.</p>
                      )}
                    </div>
                  )}
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
                  <p className="text-xs text-muted-foreground">
                    Leave empty for anyone with the code. Add one or more guests, staff, or shareholders
                    (same email can exist as multiple types).
                  </p>
                  {assignees.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {assignees.map((a) => (
                        <Badge
                          key={`${a.assigneeType}:${a.assigneeId}`}
                          variant="outline"
                          className="gap-1 pr-1"
                        >
                          <span className="text-[10px] uppercase text-muted-foreground">{a.assigneeType}</span>
                          {a.label}
                          <button
                            type="button"
                            className="ml-1 rounded px-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() => removeAssignee(a.assigneeType, a.assigneeId)}
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={addType}
                        onValueChange={(v) => {
                          setAddType(v as 'GUEST' | 'USER' | 'SHAREHOLDER');
                          setAddId('');
                          setPickedGuest(null);
                          setAssigneeSearch('');
                        }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GUEST">Guest</SelectItem>
                          <SelectItem value="USER">Staff user</SelectItem>
                          <SelectItem value="SHAREHOLDER">Shareholder</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Search</Label>
                      <Input
                        value={assigneeSearch}
                        onChange={(e) => setAssigneeSearch(e.target.value)}
                        placeholder="Name or email…"
                        disabled={addType === 'GUEST'}
                      />
                    </div>
                  </div>
                  {addType === 'GUEST' && (
                    <div className="space-y-2">
                      <GuestPicker value={pickedGuest} onChange={setPickedGuest} label="Find guest" />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={!pickedGuest}
                        onClick={() => {
                          if (!pickedGuest) return;
                          const email =
                            pickedGuest.email ||
                            pickedGuest.shareholder?.email ||
                            pickedGuest.user?.email ||
                            '';
                          const isSyntheticSh = pickedGuest.id.startsWith('shareholder:');
                          // Real guest row
                          if (!isSyntheticSh) {
                            addAssignee({
                              assigneeType: 'GUEST',
                              assigneeId: pickedGuest.id,
                              label: `${pickedGuest.name}${email ? ` · ${email}` : ''}`,
                            });
                          }
                          // Linked shareholder (same email or shareholder-only hit)
                          if (pickedGuest.shareholder?.id) {
                            const sh = pickedGuest.shareholder;
                            const shareBit =
                              sh.shareType === 'PERCENTAGE'
                                ? ` ${sh.shareValue ?? 0}%`
                                : sh.shareType === 'FIXED'
                                  ? ` ৳${sh.shareValue ?? 0}`
                                  : '';
                            addAssignee({
                              assigneeType: 'SHAREHOLDER',
                              assigneeId: sh.id,
                              label: `${sh.name}${email ? ` · ${email}` : ''}${shareBit}`,
                            });
                          }
                          // Linked staff user
                          if (pickedGuest.user?.id) {
                            addAssignee({
                              assigneeType: 'USER',
                              assigneeId: pickedGuest.user.id,
                              label: `${pickedGuest.user.name} · ${pickedGuest.user.email}`,
                            });
                          }
                          setPickedGuest(null);
                        }}
                      >
                        Add guest
                      </Button>
                    </div>
                  )}
                  {addType === 'USER' && (
                    <div className="space-y-2">
                      <Select value={addId} onValueChange={setAddId}>
                        <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                        <SelectContent>
                          {filteredUsers.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} · {u.email} ({u.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={!addId}
                        onClick={() => {
                          const u = users.find((x) => x.id === addId);
                          if (!u) return;
                          addAssignee({
                            assigneeType: 'USER',
                            assigneeId: u.id,
                            label: `${u.name} · ${u.email}`,
                          });
                          setAddId('');
                        }}
                      >
                        Add staff
                      </Button>
                    </div>
                  )}
                  {addType === 'SHAREHOLDER' && (
                    <div className="space-y-2">
                      <Select value={addId} onValueChange={setAddId}>
                        <SelectTrigger><SelectValue placeholder="Select shareholder" /></SelectTrigger>
                        <SelectContent>
                          {filteredShareholders.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}{s.email ? ` · ${s.email}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={!addId}
                        onClick={() => {
                          const s = shareholders.find((x) => x.id === addId);
                          if (!s) return;
                          addAssignee({
                            assigneeType: 'SHAREHOLDER',
                            assigneeId: s.id,
                            label: `${s.name}${s.email ? ` · ${s.email}` : ''}`,
                          });
                          setAddId('');
                        }}
                      >
                        Add shareholder
                      </Button>
                    </div>
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
