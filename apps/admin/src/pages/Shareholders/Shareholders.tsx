import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, PieChart, Pencil, Power, PowerOff, Layers, Trash2, Wallet, Settings2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/AuthContext';

// ── Types (mirror the API) ─────────────────────────────────────────────────
type Tier = {
  id: string; code: string; name: string; unitPrice: number; totalUnits: number | null; isActive: boolean;
  soldUnits: number; activeUnits: number; availableUnits: number | null; activeCapital: number; dueTotal: number;
};
type Totals = { shareholders: number; soldUnits: number; activeCapital: number; dueTotal: number };
type Payment = { id: string; amount: number; method: string; transactionId?: string | null; paidAt: string; notes?: string | null };
type Holding = {
  id: string; quantity: number; unitPrice: number; totalPrice: number; paidAmount: number;
  status: 'PENDING_PAYMENT' | 'ACTIVE' | 'CANCELLED'; purchaseDate: string; notes?: string | null;
  tier: { id: string; code: string; name: string }; payments: Payment[];
};
type Summary = {
  units: Record<string, number>; totalUnits: number; activeCapital: number; committedCapital: number;
  paidTotal: number; dueTotal: number; pendingHoldings: number; ownershipPercent: number;
};
type Shareholder = {
  id: string; name: string; phone: string; email?: string | null; address?: string | null; nid?: string | null;
  joinDate?: string | null; notes?: string | null; isActive: boolean; userId?: string | null;
  holdings: Holding[]; summary: Summary;
};
type DistShare = {
  id: string; amount: number; calculatedAmount: number; capitalAmount: number; sharePercent: number; isManual: boolean;
  status: string; shareholderId: string; shareholder: { name: string };
};
type Distribution = {
  id: string; periodLabel: string; periodStart: string; periodEnd: string; totalProfit: number;
  totalDistributed: number; totalCapital: number; status: string; shares?: DistShare[];
};

const PAY_METHODS = ['CASH', 'BKASH', 'NAGAD', 'BANK_TRANSFER', 'CARD', 'MOBILE_BANKING'];
const fmt = (n: number) => `৳${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const pct = (n: number) => `${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
const dateStr = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');
const today = () => new Date().toISOString().slice(0, 10);
const errMsg = (e: any, fallback: string) => e?.response?.data?.message || fallback;

const DIST_STATUS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700', APPROVED: 'bg-blue-100 text-blue-800',
  DISTRIBUTED: 'bg-green-100 text-green-800', CANCELLED: 'bg-red-100 text-red-800',
};
const HOLDING_STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Active', cls: 'bg-green-100 text-green-800' },
  PENDING_PAYMENT: { label: 'Instalments due', cls: 'bg-amber-100 text-amber-800' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-700' },
};

const emptyShForm = () => ({
  name: '', phone: '', email: '', address: '', nid: '', joinDate: today(), notes: '',
  createLogin: false, password: '', hasLogin: false,
});
const emptyHoldForm = () => ({ tierId: '', quantity: '1', purchaseDate: today(), notes: '', payNow: '', method: 'BANK_TRANSFER', transactionId: '' });
const emptyPayForm = () => ({ amount: '', method: 'BANK_TRANSFER', transactionId: '', paidAt: today(), notes: '' });

const sectionLabel = (text: string) => (
  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border pb-1">{text}</p>
);

// ── Page ───────────────────────────────────────────────────────────────────
const Shareholders: React.FC = () => {
  const { user } = useAuth();
  const admin = user?.role === 'SUPER_ADMIN';
  const canWriteDist = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';

  const [tab, setTab] = useState<'holders' | 'distributions' | 'tiers'>('holders');
  const [holders, setHolders] = useState<Shareholder[]>([]);
  const [dists, setDists] = useState<Distribution[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null);

  // Shareholder form
  const [shDialog, setShDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shForm, setShForm] = useState<any>(emptyShForm());
  const [shError, setShError] = useState<string | null>(null);

  // Holdings dialog (per shareholder)
  const [holdingsFor, setHoldingsFor] = useState<string | null>(null);
  const [holdForm, setHoldForm] = useState<any>(emptyHoldForm());
  const [holdError, setHoldError] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<Holding | null>(null);
  const [payForm, setPayForm] = useState<any>(emptyPayForm());
  const [payError, setPayError] = useState<string | null>(null);

  // Tier edit
  const [tierEdit, setTierEdit] = useState<Tier | null>(null);
  const [tierForm, setTierForm] = useState<any>({ name: '', unitPrice: '', totalUnits: '', isActive: true });
  const [tierError, setTierError] = useState<string | null>(null);

  // Distributions
  const [distDialog, setDistDialog] = useState(false);
  const [distForm, setDistForm] = useState<any>({ periodLabel: '', periodStart: '', periodEnd: '', totalProfit: '' });
  const [distError, setDistError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Distribution | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [detailError, setDetailError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [h, d, t] = await Promise.all([
        api.get('/shareholders'),
        api.get('/shareholders/distributions'),
        api.get('/shareholders/tiers'),
      ]);
      setHolders(unwrapList<Shareholder>(h, ['shareholders']));
      setDists(unwrapList<Distribution>(d, ['distributions']));
      setTiers(unwrapList<Tier>(t, ['tiers']));
      setTotals(t.data?.totals ?? null);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const tierName = (code: string) => tiers.find((t) => t.code === code)?.name ?? code;
  const unitsLabel = (units: Record<string, number>) => {
    const parts = Object.entries(units).map(([code, qty]) => `${qty} ${tierName(code)}`);
    return parts.length ? parts.join(' · ') : '—';
  };
  const holdingsHolder = holders.find((h) => h.id === holdingsFor) ?? null;
  const flash = (kind: 'ok' | 'warn', text: string) => { setNotice({ kind, text }); window.setTimeout(() => setNotice(null), 6000); };

  // ── Shareholder CRUD ─────────────────────────────────────────────────────
  const openCreate = () => { setEditingId(null); setShForm(emptyShForm()); setShError(null); setShDialog(true); };
  const openEdit = (s: Shareholder) => {
    setEditingId(s.id);
    setShForm({
      name: s.name, phone: s.phone, email: s.email ?? '', address: s.address ?? '', nid: s.nid ?? '',
      joinDate: s.joinDate ? new Date(s.joinDate).toISOString().slice(0, 10) : '', notes: s.notes ?? '',
      createLogin: false, password: '', hasLogin: !!s.userId,
    });
    setShError(null); setShDialog(true);
  };
  const validateShForm = (): string | null => {
    if (!shForm.name?.trim() || shForm.name.trim().length < 2) return 'Name is required (min 2 characters)';
    if (!shForm.phone?.trim() || shForm.phone.replace(/\D/g, '').length < 10) return 'Phone must be at least 10 digits';
    if (shForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shForm.email)) return 'Enter a valid email';
    const needsLogin = shForm.createLogin && (!editingId || !shForm.hasLogin);
    if (needsLogin) {
      if (!shForm.email?.trim()) return 'Email is required to create a portal login';
      if (!shForm.password || shForm.password.length < 6) return 'Password must be at least 6 characters';
    }
    return null;
  };
  const saveShareholder = async () => {
    const clientErr = validateShForm();
    if (clientErr) { setShError(clientErr); return; }
    setSaving(true); setShError(null);
    const payload: any = {
      name: shForm.name.trim(), phone: shForm.phone.trim(), email: shForm.email || null,
      address: shForm.address || null, nid: shForm.nid || null, joinDate: shForm.joinDate || null, notes: shForm.notes || null,
    };
    const attachLogin = shForm.createLogin && (!editingId || !shForm.hasLogin);
    try {
      if (editingId) {
        await api.patch(`/shareholders/${editingId}`, { ...payload, ...(attachLogin ? { createLogin: true, password: shForm.password } : {}) });
      } else {
        const r = await api.post('/shareholders', { ...payload, createLogin: !!shForm.createLogin, password: shForm.createLogin ? shForm.password : undefined });
        setShDialog(false); await load();
        // Straight into "Add shares" for a brand-new shareholder.
        setHoldForm(emptyHoldForm()); setHoldError(null); setHoldingsFor(r.data?.shareholder?.id ?? null);
        setSaving(false); return;
      }
      setShDialog(false); await load();
    } catch (e: any) { setShError(errMsg(e, 'Failed to save')); }
    finally { setSaving(false); }
  };
  const toggleActive = async (s: Shareholder) => {
    if (!admin) return;
    if (s.isActive && !window.confirm(`Deactivate ${s.name}? They keep their history but drop out of future profit splits.`)) return;
    await api.patch(`/shareholders/${s.id}`, { isActive: !s.isActive });
    await load();
  };
  const removeShareholder = async (s: Shareholder) => {
    if (!admin) return;
    if (!window.confirm(`Delete ${s.name}? If they have any payments or distributions on record they will be deactivated instead.`)) return;
    try {
      const r = await api.delete(`/shareholders/${s.id}`);
      flash(r.data?.deleted ? 'ok' : 'warn', r.data?.message || 'Done');
      await load();
    } catch (e: any) { flash('warn', errMsg(e, 'Failed to delete')); }
  };

  // ── Holdings ─────────────────────────────────────────────────────────────
  const openHoldings = (s: Shareholder) => { setHoldForm({ ...emptyHoldForm(), tierId: tiers[0]?.id ?? '' }); setHoldError(null); setHoldingsFor(s.id); };
  const selectedTier = tiers.find((t) => t.id === holdForm.tierId);
  const holdTotal = selectedTier ? selectedTier.unitPrice * (Number(holdForm.quantity) || 0) : 0;
  const addHolding = async () => {
    if (!holdingsFor) return;
    const qty = Number(holdForm.quantity);
    if (!selectedTier) { setHoldError('Pick a share tier'); return; }
    if (!Number.isInteger(qty) || qty < 1) { setHoldError('Quantity must be a whole number ≥ 1'); return; }
    if (selectedTier.availableUnits != null && qty > selectedTier.availableUnits) { setHoldError(`Only ${selectedTier.availableUnits} ${selectedTier.name} unit(s) left`); return; }
    const payNow = holdForm.payNow === '' ? 0 : Number(holdForm.payNow);
    if (payNow < 0 || payNow > holdTotal + 0.005) { setHoldError('Pay-now amount must be between 0 and the total price'); return; }
    setSaving(true); setHoldError(null);
    try {
      await api.post(`/shareholders/${holdingsFor}/holdings`, {
        tierId: selectedTier.id, quantity: qty, purchaseDate: holdForm.purchaseDate || null, notes: holdForm.notes || null,
        initialPayment: payNow > 0 ? { amount: payNow, method: holdForm.method, transactionId: holdForm.transactionId || null } : null,
      });
      setHoldForm({ ...emptyHoldForm(), tierId: selectedTier.id });
      await load();
    } catch (e: any) { setHoldError(errMsg(e, 'Failed to add shares')); }
    finally { setSaving(false); }
  };
  const openPay = (h: Holding) => { setPayFor(h); setPayForm({ ...emptyPayForm(), amount: String(Math.max(0, h.totalPrice - h.paidAmount)) }); setPayError(null); };
  const savePayment = async () => {
    if (!payFor) return;
    const amount = Number(payForm.amount);
    if (!(amount > 0)) { setPayError('Enter an amount greater than 0'); return; }
    setSaving(true); setPayError(null);
    try {
      await api.post(`/shareholders/holdings/${payFor.id}/payments`, {
        amount, method: payForm.method, transactionId: payForm.transactionId || null, paidAt: payForm.paidAt || null, notes: payForm.notes || null,
      });
      setPayFor(null); await load();
    } catch (e: any) { setPayError(errMsg(e, 'Failed to record payment')); }
    finally { setSaving(false); }
  };
  const cancelHolding = async (h: Holding) => {
    if (!window.confirm(`Cancel ${h.quantity} × ${h.tier.name}? The units go back on sale.`)) return;
    const refund = h.paidAmount > 0 ? window.confirm(`Refund ${fmt(h.paidAmount)} to the shareholder (records a cash OUT)? OK = refund, Cancel = no refund.`) : false;
    try { await api.post(`/shareholders/holdings/${h.id}/cancel`, { refund }); await load(); }
    catch (e: any) { setHoldError(errMsg(e, 'Failed to cancel')); }
  };
  const deleteHolding = async (h: Holding) => {
    if (!window.confirm(`Delete this unpaid holding (${h.quantity} × ${h.tier.name})?`)) return;
    try { await api.delete(`/shareholders/holdings/${h.id}`); await load(); }
    catch (e: any) { setHoldError(errMsg(e, 'Failed to delete')); }
  };

  // ── Tiers ────────────────────────────────────────────────────────────────
  const openTier = (t: Tier) => { setTierEdit(t); setTierForm({ name: t.name, unitPrice: String(t.unitPrice), totalUnits: t.totalUnits == null ? '' : String(t.totalUnits), isActive: t.isActive }); setTierError(null); };
  const saveTier = async () => {
    if (!tierEdit) return;
    const unitPrice = Number(tierForm.unitPrice);
    if (!(unitPrice > 0)) { setTierError('Unit price must be greater than 0'); return; }
    setSaving(true); setTierError(null);
    try {
      await api.patch(`/shareholders/tiers/${tierEdit.id}`, {
        name: tierForm.name.trim() || tierEdit.name, unitPrice,
        totalUnits: tierForm.totalUnits === '' ? null : Number(tierForm.totalUnits), isActive: !!tierForm.isActive,
      });
      setTierEdit(null); await load();
    } catch (e: any) { setTierError(errMsg(e, 'Failed to save tier')); }
    finally { setSaving(false); }
  };

  // ── Distributions ────────────────────────────────────────────────────────
  const saveDistribution = async () => {
    setSaving(true); setDistError(null);
    try {
      const r = await api.post('/shareholders/distributions', {
        periodLabel: distForm.periodLabel, periodStart: distForm.periodStart, periodEnd: distForm.periodEnd, totalProfit: Number(distForm.totalProfit),
      });
      setDistDialog(false); await load();
      await openDetail(r.data.distribution.id);
    } catch (e: any) { setDistError(errMsg(e, 'Failed to create')); }
    finally { setSaving(false); }
  };
  const openDetail = async (id: string) => {
    setDetailError(null);
    const r = await api.get(`/shareholders/distributions/${id}`);
    const dist: Distribution = r.data.distribution;
    setDetail(dist);
    const seed: Record<string, string> = {};
    dist.shares?.forEach((s) => { seed[s.shareholderId] = String(s.amount ?? 0); });
    setOverrides(seed);
  };
  const distAction = async (id: string, action: string) => {
    setDetailError(null);
    try { await api.post(`/shareholders/distributions/${id}/${action}`); await load(); await openDetail(id); }
    catch (e: any) { setDetailError(errMsg(e, `Failed to ${action}`)); }
  };
  const changedOverrides = (detail?.shares ?? []).filter((s) => Number(overrides[s.shareholderId] ?? s.amount) !== s.amount);
  const saveOverrides = async () => {
    if (!detail) return;
    setSaving(true); setDetailError(null);
    try {
      const shares = changedOverrides.map((s) => ({ shareholderId: s.shareholderId, amount: Number(overrides[s.shareholderId]) || 0 }));
      await api.post(`/shareholders/distributions/${detail.id}/overrides`, { shares });
      await load(); await openDetail(detail.id);
    } catch (e: any) { setDetailError(errMsg(e, 'Failed to save overrides')); }
    finally { setSaving(false); }
  };
  const resetOverrides = async () => {
    if (!detail) return;
    const manual = (detail.shares ?? []).filter((s) => s.isManual);
    if (manual.length === 0) return;
    setSaving(true); setDetailError(null);
    try {
      await api.post(`/shareholders/distributions/${detail.id}/overrides`, { shares: manual.map((s) => ({ shareholderId: s.shareholderId, amount: null })) });
      await load(); await openDetail(detail.id);
    } catch (e: any) { setDetailError(errMsg(e, 'Failed to reset overrides')); }
    finally { setSaving(false); }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader title="Shareholders" description="Gold / Platinum share units, instalments and profit distributions by paid-up capital" />

      {totals && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat label="Paid-up capital" value={fmt(totals.activeCapital)} hint={`${totals.shareholders} active shareholder${totals.shareholders === 1 ? '' : 's'}`} />
          {tiers.slice(0, 2).map((t) => (
            <MiniStat
              key={t.id}
              label={`${t.name} · ${fmt(t.unitPrice)}`}
              value={t.totalUnits == null ? `${t.soldUnits} sold` : `${t.soldUnits} / ${t.totalUnits}`}
              hint={t.totalUnits == null ? 'no cap' : `${t.availableUnits} available`}
            />
          ))}
          <MiniStat label="Instalments due" value={fmt(totals.dueTotal)} hint="not yet earning profit" accent={totals.dueTotal > 0 ? 'text-amber-700' : undefined} />
        </div>
      )}

      {notice && (
        <div className={`rounded-md px-3 py-2 text-sm ${notice.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>{notice.text}</div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant={tab === 'holders' ? 'default' : 'outline'} onClick={() => setTab('holders')}><PieChart className="h-4 w-4 mr-1" /> Shareholders</Button>
        <Button variant={tab === 'distributions' ? 'default' : 'outline'} onClick={() => setTab('distributions')}><Wallet className="h-4 w-4 mr-1" /> Distributions</Button>
        <Button variant={tab === 'tiers' ? 'default' : 'outline'} onClick={() => setTab('tiers')}><Settings2 className="h-4 w-4 mr-1" /> Share tiers</Button>
        <div className="ml-auto">
          {admin && tab === 'holders' && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Shareholder</Button>}
          {canWriteDist && tab === 'distributions' && (
            <Button onClick={() => { setDistForm({ periodLabel: '', periodStart: '', periodEnd: '', totalProfit: '' }); setDistError(null); setDistDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New Distribution
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : tab === 'holders' ? (
        <Card><CardContent className="p-4 overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Shares</TableHead>
              <TableHead className="text-right">Paid-up capital</TableHead><TableHead className="text-right">Ownership</TableHead>
              <TableHead className="text-right">Due</TableHead><TableHead>Login</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {holders.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.name}</div>
                    {s.email && <div className="text-xs text-muted-foreground">{s.email}</div>}
                  </TableCell>
                  <TableCell>{s.phone}</TableCell>
                  <TableCell>
                    <div>{unitsLabel(s.summary.units)}</div>
                    {s.summary.pendingHoldings > 0 && <div className="text-xs text-amber-700">{s.summary.pendingHoldings} holding(s) awaiting payment</div>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(s.summary.activeCapital)}</TableCell>
                  <TableCell className="text-right tabular-nums">{pct(s.summary.ownershipPercent)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${s.summary.dueTotal > 0 ? 'text-amber-700' : 'text-muted-foreground'}`}>{s.summary.dueTotal > 0 ? fmt(s.summary.dueTotal) : '—'}</TableCell>
                  <TableCell>{s.userId ? <Badge className="bg-green-100 text-green-800">Yes</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell><Badge className={s.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>{s.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" title="Shares" onClick={() => openHoldings(s)}><Layers className="h-3.5 w-3.5" /></Button>
                    {admin && (
                      <>
                        <Button size="sm" variant="ghost" title="Edit" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" title={s.isActive ? 'Deactivate' : 'Activate'} onClick={() => toggleActive(s)}>{s.isActive ? <PowerOff className="h-3.5 w-3.5 text-red-600" /> : <Power className="h-3.5 w-3.5 text-green-600" />}</Button>
                        <Button size="sm" variant="ghost" title="Delete" onClick={() => removeShareholder(s)}><Trash2 className="h-3.5 w-3.5 text-red-600" /></Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {holders.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No shareholders yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent></Card>
      ) : tab === 'distributions' ? (
        <Card><CardContent className="p-4">
          <Table>
            <TableHeader><TableRow><TableHead>Period</TableHead><TableHead className="text-right">Total profit</TableHead><TableHead className="text-right">Distributed</TableHead><TableHead className="text-right">Capital base</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {dists.map((d) => (
                <TableRow key={d.id} className="cursor-pointer" onClick={() => openDetail(d.id)}>
                  <TableCell className="font-medium">{d.periodLabel}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(d.totalProfit)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(d.totalDistributed)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(d.totalCapital)}</TableCell>
                  <TableCell><Badge className={DIST_STATUS[d.status]}>{d.status}</Badge></TableCell>
                  <TableCell className="text-right text-xs text-primary">View</TableCell>
                </TableRow>
              ))}
              {dists.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No distributions yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-4">
          <p className="mb-3 text-sm text-muted-foreground">Fixed price per unit. Changing a price only affects future purchases; profit is always split by the paid-up capital of active holdings.</p>
          <Table>
            <TableHeader><TableRow><TableHead>Tier</TableHead><TableHead className="text-right">Unit price</TableHead><TableHead className="text-right">Cap</TableHead><TableHead className="text-right">Sold</TableHead><TableHead className="text-right">Available</TableHead><TableHead className="text-right">Paid-up capital</TableHead><TableHead className="text-right">Due</TableHead><TableHead>Status</TableHead>{admin && <TableHead></TableHead>}</TableRow></TableHeader>
            <TableBody>
              {tiers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name} <span className="text-xs text-muted-foreground">({t.code})</span></TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(t.unitPrice)}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.totalUnits == null ? '∞' : t.totalUnits}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.soldUnits}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.availableUnits == null ? '∞' : t.availableUnits}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(t.activeCapital)}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.dueTotal > 0 ? fmt(t.dueTotal) : '—'}</TableCell>
                  <TableCell><Badge className={t.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>{t.isActive ? 'On sale' : 'Closed'}</Badge></TableCell>
                  {admin && <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => openTier(t)}><Pencil className="h-3.5 w-3.5" /></Button></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}

      {/* Shareholder dialog */}
      <Dialog open={shDialog} onOpenChange={setShDialog}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Shareholder' : 'New Shareholder'}</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <section className="space-y-3">
              {sectionLabel('Identity')}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name *</Label><Input value={shForm.name} onChange={(e) => setShForm({ ...shForm, name: e.target.value })} /></div>
                <div><Label>Phone *</Label><Input value={shForm.phone} onChange={(e) => setShForm({ ...shForm, phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input type="email" value={shForm.email} onChange={(e) => setShForm({ ...shForm, email: e.target.value })} /></div>
                <div><Label>NID</Label><Input value={shForm.nid} onChange={(e) => setShForm({ ...shForm, nid: e.target.value })} placeholder="optional" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Address</Label><Input value={shForm.address} onChange={(e) => setShForm({ ...shForm, address: e.target.value })} placeholder="optional" /></div>
                <div><Label>Join date</Label><Input type="date" value={shForm.joinDate} onChange={(e) => setShForm({ ...shForm, joinDate: e.target.value })} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={shForm.notes} onChange={(e) => setShForm({ ...shForm, notes: e.target.value })} placeholder="optional" /></div>
              {!editingId && <p className="text-xs text-muted-foreground rounded-md bg-muted/40 px-3 py-2">Shares (Gold / Platinum units) are added in the next step, after saving.</p>}
            </section>
            <section className="space-y-3">
              {sectionLabel('Portal login')}
              {editingId && shForm.hasLogin ? (
                <p className="text-sm text-muted-foreground rounded-md bg-muted/40 px-3 py-2">Portal login is already linked to this shareholder.</p>
              ) : (
                <>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" className="h-4 w-4 rounded border" checked={!!shForm.createLogin} onChange={(e) => setShForm({ ...shForm, createLogin: e.target.checked })} />
                    {editingId ? 'Create portal login now' : 'Create portal login'}
                    <span className="text-muted-foreground">(email + password, min 6 chars)</span>
                  </label>
                  {shForm.createLogin && <div><Label>Password *</Label><Input type="password" value={shForm.password} onChange={(e) => setShForm({ ...shForm, password: e.target.value })} /></div>}
                </>
              )}
            </section>
            {shError && <p className="text-sm text-red-600">{shError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShDialog(false)}>Cancel</Button>
            <Button onClick={saveShareholder} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} {editingId ? 'Save' : 'Save & add shares'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Holdings dialog */}
      <Dialog open={!!holdingsHolder} onOpenChange={(o) => !o && setHoldingsFor(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Shares — {holdingsHolder?.name}</DialogTitle></DialogHeader>
          {holdingsHolder && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md bg-muted/40 px-3 py-2"><div className="text-xs text-muted-foreground">Paid-up capital</div><div className="font-semibold tabular-nums">{fmt(holdingsHolder.summary.activeCapital)}</div></div>
                <div className="rounded-md bg-muted/40 px-3 py-2"><div className="text-xs text-muted-foreground">Ownership</div><div className="font-semibold tabular-nums">{pct(holdingsHolder.summary.ownershipPercent)}</div></div>
                <div className="rounded-md bg-muted/40 px-3 py-2"><div className="text-xs text-muted-foreground">Instalments due</div><div className={`font-semibold tabular-nums ${holdingsHolder.summary.dueTotal > 0 ? 'text-amber-700' : ''}`}>{fmt(holdingsHolder.summary.dueTotal)}</div></div>
              </div>

              <Table>
                <TableHeader><TableRow><TableHead>Tier</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Due</TableHead><TableHead>Status</TableHead><TableHead>Bought</TableHead>{admin && <TableHead></TableHead>}</TableRow></TableHeader>
                <TableBody>
                  {holdingsHolder.holdings.map((h) => {
                    const due = Math.max(0, h.totalPrice - h.paidAmount);
                    const st = HOLDING_STATUS[h.status];
                    return (
                      <TableRow key={h.id} className={h.status === 'CANCELLED' ? 'opacity-60' : ''}>
                        <TableCell className="font-medium">{h.tier.name} <span className="text-xs text-muted-foreground">@ {fmt(h.unitPrice)}</span></TableCell>
                        <TableCell className="text-right tabular-nums">{h.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(h.totalPrice)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(h.paidAmount)}{h.payments.length > 1 && <div className="text-[10px] text-muted-foreground">{h.payments.length} payments</div>}</TableCell>
                        <TableCell className={`text-right tabular-nums ${due > 0 && h.status !== 'CANCELLED' ? 'text-amber-700' : 'text-muted-foreground'}`}>{h.status === 'CANCELLED' ? '—' : due > 0 ? fmt(due) : '—'}</TableCell>
                        <TableCell><Badge className={st.cls}>{st.label}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{dateStr(h.purchaseDate)}</TableCell>
                        {admin && (
                          <TableCell className="text-right whitespace-nowrap">
                            {h.status !== 'CANCELLED' && due > 0 && <Button size="sm" variant="outline" onClick={() => openPay(h)}>Add payment</Button>}
                            {h.status !== 'CANCELLED' && h.paidAmount === 0 && <Button size="sm" variant="ghost" title="Delete" onClick={() => deleteHolding(h)}><Trash2 className="h-3.5 w-3.5 text-red-600" /></Button>}
                            {h.status !== 'CANCELLED' && h.paidAmount > 0 && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => cancelHolding(h)}>Cancel</Button>}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {holdingsHolder.holdings.length === 0 && <TableRow><TableCell colSpan={admin ? 8 : 7} className="text-center py-6 text-muted-foreground">No shares yet.</TableCell></TableRow>}
                </TableBody>
              </Table>

              {admin && (
                <section className="space-y-3">
                  {sectionLabel('Add shares')}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <Label>Tier</Label>
                      <Select value={holdForm.tierId} onValueChange={(v) => setHoldForm({ ...holdForm, tierId: v })}>
                        <SelectTrigger><SelectValue placeholder="Pick a tier" /></SelectTrigger>
                        <SelectContent>
                          {tiers.filter((t) => t.isActive).map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name} — {fmt(t.unitPrice)}{t.availableUnits != null ? ` · ${t.availableUnits} left` : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Quantity</Label><Input type="number" min={1} value={holdForm.quantity} onChange={(e) => setHoldForm({ ...holdForm, quantity: e.target.value })} /></div>
                    <div><Label>Purchase date</Label><Input type="date" value={holdForm.purchaseDate} onChange={(e) => setHoldForm({ ...holdForm, purchaseDate: e.target.value })} /></div>
                    <div><Label>Total</Label><div className="h-10 flex items-center font-semibold tabular-nums">{fmt(holdTotal)}</div></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div><Label>Pay now (৳)</Label><Input type="number" min={0} value={holdForm.payNow} onChange={(e) => setHoldForm({ ...holdForm, payNow: e.target.value })} placeholder={holdTotal ? `up to ${holdTotal}` : '0'} /></div>
                    <div>
                      <Label>Method</Label>
                      <Select value={holdForm.method} onValueChange={(v) => setHoldForm({ ...holdForm, method: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{PAY_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Transaction ID</Label><Input value={holdForm.transactionId} onChange={(e) => setHoldForm({ ...holdForm, transactionId: e.target.value })} placeholder="optional" /></div>
                    <div><Label>Notes</Label><Input value={holdForm.notes} onChange={(e) => setHoldForm({ ...holdForm, notes: e.target.value })} placeholder="optional" /></div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {holdForm.payNow !== '' && Number(holdForm.payNow) < holdTotal
                      ? `Partial payment: ${fmt(holdTotal - Number(holdForm.payNow))} stays due. The shares start earning profit once fully paid.`
                      : 'Fully paid shares start earning from the next distribution. Leave "Pay now" empty to record the purchase without any payment yet.'}
                  </p>
                  {holdError && <p className="text-sm text-red-600">{holdError}</p>}
                  <div className="flex justify-end"><Button onClick={addHolding} disabled={saving || !holdForm.tierId}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Add shares</Button></div>
                </section>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Instalment payment dialog */}
      <Dialog open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record payment — {payFor?.quantity} × {payFor?.tier.name}</DialogTitle></DialogHeader>
          {payFor && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Remaining due: <span className="font-semibold text-foreground">{fmt(Math.max(0, payFor.totalPrice - payFor.paidAmount))}</span></p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount (৳)</Label><Input type="number" min={0} value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} /></div>
                <div><Label>Date</Label><Input type="date" value={payForm.paidAt} onChange={(e) => setPayForm({ ...payForm, paidAt: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Method</Label>
                  <Select value={payForm.method} onValueChange={(v) => setPayForm({ ...payForm, method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAY_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Transaction ID</Label><Input value={payForm.transactionId} onChange={(e) => setPayForm({ ...payForm, transactionId: e.target.value })} placeholder="optional" /></div>
              </div>
              <div><Label>Notes</Label><Input value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} placeholder="optional" /></div>
              {payError && <p className="text-sm text-red-600">{payError}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayFor(null)}>Cancel</Button>
            <Button onClick={savePayment} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tier edit dialog */}
      <Dialog open={!!tierEdit} onOpenChange={(o) => !o && setTierEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit tier — {tierEdit?.code}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={tierForm.name} onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Unit price (৳)</Label><Input type="number" min={1} value={tierForm.unitPrice} onChange={(e) => setTierForm({ ...tierForm, unitPrice: e.target.value })} /></div>
              <div><Label>Total units (cap)</Label><Input type="number" min={0} value={tierForm.totalUnits} onChange={(e) => setTierForm({ ...tierForm, totalUnits: e.target.value })} placeholder="blank = unlimited" /></div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 rounded border" checked={!!tierForm.isActive} onChange={(e) => setTierForm({ ...tierForm, isActive: e.target.checked })} />
              On sale (new holdings allowed)
            </label>
            {tierEdit && <p className="text-xs text-muted-foreground">Sold so far: {tierEdit.soldUnits}. Existing holdings keep the price they were bought at.</p>}
            {tierError && <p className="text-sm text-red-600">{tierError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierEdit(null)}>Cancel</Button>
            <Button onClick={saveTier} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Distribution create dialog */}
      <Dialog open={distDialog} onOpenChange={setDistDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Profit Distribution</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Period label</Label><Input value={distForm.periodLabel} onChange={(e) => setDistForm({ ...distForm, periodLabel: e.target.value })} placeholder="January 2026" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start</Label><Input type="date" value={distForm.periodStart} onChange={(e) => setDistForm({ ...distForm, periodStart: e.target.value })} /></div>
              <div><Label>End</Label><Input type="date" value={distForm.periodEnd} onChange={(e) => setDistForm({ ...distForm, periodEnd: e.target.value })} /></div>
            </div>
            <div><Label>Total profit to distribute (৳)</Label><Input type="number" value={distForm.totalProfit} onChange={(e) => setDistForm({ ...distForm, totalProfit: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground">Split by paid-up capital: each active shareholder gets profit × (their capital ÷ total capital). Current capital base: {fmt(totals?.activeCapital ?? 0)}.</p>
            {distError && <p className="text-sm text-red-600">{distError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDistDialog(false)}>Cancel</Button>
            <Button onClick={saveDistribution} disabled={saving || !distForm.periodLabel || !distForm.periodStart || !distForm.periodEnd || !distForm.totalProfit}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Distribution detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{detail?.periodLabel} — {detail?.status}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md bg-muted/40 px-3 py-2"><div className="text-xs text-muted-foreground">Total profit</div><div className="font-semibold tabular-nums">{fmt(detail.totalProfit)}</div></div>
                <div className="rounded-md bg-muted/40 px-3 py-2"><div className="text-xs text-muted-foreground">Capital base</div><div className="font-semibold tabular-nums">{fmt(detail.totalCapital)}</div></div>
                <div className="rounded-md bg-muted/40 px-3 py-2"><div className="text-xs text-muted-foreground">Total payout</div><div className={`font-semibold tabular-nums ${detail.totalDistributed > detail.totalProfit + 0.005 ? 'text-red-600' : ''}`}>{fmt(detail.totalDistributed)}</div></div>
              </div>
              {detail.totalCapital > 0 && (
                <p className="text-xs text-muted-foreground">Rate: {fmt((detail.totalProfit / detail.totalCapital) * 150000)} per Gold-sized unit (৳1,50,000 of capital) · {fmt((detail.totalProfit / detail.totalCapital) * 300000)} per Platinum-sized unit.</p>
              )}
              <Table>
                <TableHeader><TableRow><TableHead>Shareholder</TableHead><TableHead className="text-right">Capital</TableHead><TableHead className="text-right">Share</TableHead><TableHead className="text-right">Calculated</TableHead><TableHead className="text-right">Payout</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {detail.shares?.map((s) => {
                    const editable = canWriteDist && detail.status === 'DRAFT';
                    return (
                      <TableRow key={s.id}>
                        <TableCell>{s.shareholder.name}{s.isManual && <Badge variant="outline" className="ml-2 text-[10px]">manual</Badge>}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(s.capitalAmount)}</TableCell>
                        <TableCell className="text-right tabular-nums">{pct(s.sharePercent)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{fmt(s.calculatedAmount)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {editable ? (
                            <Input type="number" className="h-8 w-32 ml-auto text-right" value={overrides[s.shareholderId] ?? ''} onChange={(e) => setOverrides({ ...overrides, [s.shareholderId]: e.target.value })} />
                          ) : fmt(s.amount)}
                        </TableCell>
                        <TableCell><Badge variant="outline">{s.status}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                  {(detail.shares?.length ?? 0) === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No shareholder has paid-up capital yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
              {detailError && <p className="text-sm text-red-600">{detailError}</p>}
              {canWriteDist && detail.status === 'DRAFT' && (
                <div className="flex flex-wrap justify-end gap-2">
                  {changedOverrides.length > 0 && <Button size="sm" variant="secondary" onClick={saveOverrides} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save overrides ({changedOverrides.length})</Button>}
                  {detail.shares?.some((s) => s.isManual) && <Button size="sm" variant="outline" onClick={resetOverrides} disabled={saving}>Reset to calculated</Button>}
                  <Button size="sm" variant="outline" onClick={() => distAction(detail.id, 'recalculate')}>Recalculate</Button>
                </div>
              )}
              {admin && (
                <div className="flex justify-end gap-2">
                  {detail.status === 'DRAFT' && <Button size="sm" onClick={() => distAction(detail.id, 'approve')}>Approve</Button>}
                  {detail.status === 'APPROVED' && <Button size="sm" onClick={() => distAction(detail.id, 'distribute')}>Distribute</Button>}
                  {detail.status !== 'DISTRIBUTED' && detail.status !== 'CANCELLED' && <Button size="sm" variant="outline" onClick={() => distAction(detail.id, 'cancel')}>Cancel</Button>}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function MiniStat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`mt-1 text-xl font-bold tabular-nums ${accent ?? ''}`}>{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export default Shareholders;
