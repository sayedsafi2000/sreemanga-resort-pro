import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
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
import { Loader2, Plus, PieChart, Pencil, Power, PowerOff } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/AuthContext';

type Shareholder = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  nid?: string | null;
  shareType: string;
  shareValue: number;
  totalShares?: number | null;
  investmentAmount?: number | null;
  notes?: string | null;
  isActive: boolean;
  userId?: string | null;
};
type Distribution = {
  id: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  totalProfit: number;
  totalDistributed: number;
  status: string;
  shares?: { id: string; amount: number; status: string; shareholderId: string; shareholder: { name: string; shareType: string } }[];
};

const fmt = (n: number) => `৳${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const isAdmin = (r?: string) => r === 'SUPER_ADMIN';

const distStatusColor: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  APPROVED: 'bg-blue-100 text-blue-800',
  DISTRIBUTED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const emptyShForm = () => ({
  name: '', phone: '', email: '', address: '', nid: '',
  shareType: 'PERCENTAGE', shareValue: '', totalShares: '', investmentAmount: '',
  notes: '', createLogin: false, password: '',
});

const Shareholders: React.FC = () => {
  const { user } = useAuth();
  const admin = isAdmin(user?.role);
  const canWriteDist = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';
  const [tab, setTab] = useState<'holders' | 'distributions'>('holders');
  const [holders, setHolders] = useState<Shareholder[]>([]);
  const [dists, setDists] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);

  const [shDialog, setShDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shForm, setShForm] = useState<any>(emptyShForm());

  const [distDialog, setDistDialog] = useState(false);
  const [distForm, setDistForm] = useState<any>({ periodLabel: '', periodStart: '', periodEnd: '', totalProfit: '' });

  const [detail, setDetail] = useState<Distribution | null>(null);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [h, d] = await Promise.all([api.get('/shareholders'), api.get('/shareholders/distributions')]);
      setHolders(unwrapList<Shareholder>(h, ['shareholders']));
      setDists(unwrapList<Distribution>(d, ['distributions']));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setShForm(emptyShForm());
    setError(null);
    setShDialog(true);
  };

  const openEdit = (s: Shareholder) => {
    setEditingId(s.id);
    setShForm({
      name: s.name, phone: s.phone, email: s.email ?? '', address: s.address ?? '',
      nid: s.nid ?? '', shareType: s.shareType, shareValue: String(s.shareValue ?? ''),
      totalShares: s.totalShares != null ? String(s.totalShares) : '',
      investmentAmount: s.investmentAmount != null ? String(s.investmentAmount) : '',
      notes: s.notes ?? '', createLogin: false, password: '',
    });
    setError(null);
    setShDialog(true);
  };

  const saveShareholder = async () => {
    setSaving(true); setError(null);
    const payload: any = {
      name: shForm.name,
      phone: shForm.phone,
      email: shForm.email || null,
      address: shForm.address || null,
      nid: shForm.nid || null,
      shareType: shForm.shareType,
      shareValue: Number(shForm.shareValue) || 0,
      totalShares: shForm.totalShares === '' ? null : Number(shForm.totalShares),
      investmentAmount: shForm.investmentAmount === '' ? null : Number(shForm.investmentAmount),
      notes: shForm.notes || null,
    };
    try {
      if (editingId) {
        await api.patch(`/shareholders/${editingId}`, payload);
      } else {
        await api.post('/shareholders', {
          ...payload,
          createLogin: shForm.createLogin,
          password: shForm.createLogin ? shForm.password : undefined,
        });
      }
      setShDialog(false); await load();
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (s: Shareholder) => {
    if (!admin) return;
    if (s.isActive && !window.confirm(`Deactivate ${s.name}? They keep their distribution history but drop out of future splits.`)) return;
    await api.patch(`/shareholders/${s.id}`, { isActive: !s.isActive });
    await load();
  };

  const saveDistribution = async () => {
    setSaving(true); setError(null);
    try {
      const r = await api.post('/shareholders/distributions', {
        periodLabel: distForm.periodLabel, periodStart: distForm.periodStart,
        periodEnd: distForm.periodEnd, totalProfit: Number(distForm.totalProfit),
      });
      setDistDialog(false); await load();
      await openDetail({ id: r.data.distribution.id } as Distribution);
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed to create'); }
    finally { setSaving(false); }
  };

  const openDetail = async (d: Distribution) => {
    const r = await api.get(`/shareholders/distributions/${d.id}`);
    const dist: Distribution = r.data.distribution;
    setDetail(dist);
    const seed: Record<string, string> = {};
    dist.shares?.forEach((s) => {
      if (s.shareholder.shareType === 'CUSTOM') seed[s.shareholderId] = String(s.amount ?? 0);
    });
    setCustomAmounts(seed);
  };
  const distAction = async (id: string, action: string) => {
    await api.post(`/shareholders/distributions/${id}/${action}`);
    await load();
    await openDetail({ id } as Distribution);
  };
  const saveCustomShares = async () => {
    if (!detail) return;
    setSaving(true); setError(null);
    try {
      const shares = Object.entries(customAmounts).map(([shareholderId, v]) => ({
        shareholderId, amount: Number(v) || 0,
      }));
      await api.post(`/shareholders/distributions/${detail.id}/custom-shares`, { shares });
      await load();
      await openDetail({ id: detail.id } as Distribution);
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed to save custom amounts'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Shareholders" description="Shareholder management and profit distributions" />

      <div className="flex gap-2">
        <Button variant={tab === 'holders' ? 'default' : 'outline'} onClick={() => setTab('holders')}><PieChart className="h-4 w-4 mr-1" /> Shareholders</Button>
        <Button variant={tab === 'distributions' ? 'default' : 'outline'} onClick={() => setTab('distributions')}>Distributions</Button>
        <div className="ml-auto">
          {admin && tab === 'holders' && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Shareholder</Button>}
          {(user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER') && tab === 'distributions' && <Button onClick={() => { setDistForm({ periodLabel: '', periodStart: '', periodEnd: '', totalProfit: '' }); setError(null); setDistDialog(true); }}><Plus className="h-4 w-4 mr-1" /> New Distribution</Button>}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : tab === 'holders' ? (
        <Card><CardContent className="p-4">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Share</TableHead><TableHead>Investment</TableHead><TableHead>Login</TableHead><TableHead>Status</TableHead>{admin && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader>
            <TableBody>
              {holders.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.phone}</TableCell>
                  <TableCell>{s.shareType === 'PERCENTAGE' ? `${s.shareValue}%` : s.shareType === 'FIXED' ? `${fmt(s.shareValue)} fixed` : 'Custom'}</TableCell>
                  <TableCell>{s.investmentAmount != null ? fmt(s.investmentAmount) : '—'}</TableCell>
                  <TableCell>{s.userId ? <Badge className="bg-green-100 text-green-800">Yes</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell><Badge className={s.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>{s.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                  {admin && (
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(s)}>{s.isActive ? <PowerOff className="h-3.5 w-3.5 text-red-600" /> : <Power className="h-3.5 w-3.5 text-green-600" />}</Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {holders.length === 0 && <TableRow><TableCell colSpan={admin ? 7 : 6} className="text-center py-8 text-muted-foreground">No shareholders yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-4">
          <Table>
            <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Total Profit</TableHead><TableHead>Distributed</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {dists.map((d) => (
                <TableRow key={d.id} className="cursor-pointer" onClick={() => openDetail(d)}>
                  <TableCell className="font-medium">{d.periodLabel}</TableCell>
                  <TableCell>{fmt(d.totalProfit)}</TableCell>
                  <TableCell>{fmt(d.totalDistributed)}</TableCell>
                  <TableCell><Badge className={distStatusColor[d.status]}>{d.status}</Badge></TableCell>
                  <TableCell className="text-right text-xs text-primary">View</TableCell>
                </TableRow>
              ))}
              {dists.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No distributions yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}

      {/* Shareholder dialog */}
      <Dialog open={shDialog} onOpenChange={setShDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Shareholder' : 'New Shareholder'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={shForm.name} onChange={(e) => setShForm({ ...shForm, name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={shForm.phone} onChange={(e) => setShForm({ ...shForm, phone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={shForm.email} onChange={(e) => setShForm({ ...shForm, email: e.target.value })} /></div>
              <div><Label>NID</Label><Input value={shForm.nid} onChange={(e) => setShForm({ ...shForm, nid: e.target.value })} placeholder="optional" /></div>
            </div>
            <div><Label>Address</Label><Input value={shForm.address} onChange={(e) => setShForm({ ...shForm, address: e.target.value })} placeholder="optional" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Share Type</Label>
                <Select value={shForm.shareType} onValueChange={(v) => setShForm({ ...shForm, shareType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="PERCENTAGE">Percentage</SelectItem><SelectItem value="FIXED">Fixed</SelectItem><SelectItem value="CUSTOM">Custom</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>{shForm.shareType === 'PERCENTAGE' ? 'Percentage (%)' : shForm.shareType === 'FIXED' ? 'Fixed Amount' : 'Value'}</Label><Input type="number" value={shForm.shareValue} onChange={(e) => setShForm({ ...shForm, shareValue: e.target.value })} /></div>
            </div>
            {shForm.shareType === 'CUSTOM' && <p className="text-xs text-muted-foreground">Custom holders get no auto-calculated share — set their amount per distribution in the distribution detail.</p>}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Investment Amount</Label><Input type="number" value={shForm.investmentAmount} onChange={(e) => setShForm({ ...shForm, investmentAmount: e.target.value })} placeholder="optional" /></div>
              <div><Label>Total Shares</Label><Input type="number" value={shForm.totalShares} onChange={(e) => setShForm({ ...shForm, totalShares: e.target.value })} placeholder="optional" /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={shForm.notes} onChange={(e) => setShForm({ ...shForm, notes: e.target.value })} placeholder="optional" /></div>
            {!editingId && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={shForm.createLogin} onChange={(e) => setShForm({ ...shForm, createLogin: e.target.checked })} />
                  Create portal login (requires email + password)
                </label>
                {shForm.createLogin && <div><Label>Password</Label><Input type="password" value={shForm.password} onChange={(e) => setShForm({ ...shForm, password: e.target.value })} /></div>}
              </>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShDialog(false)}>Cancel</Button>
            <Button onClick={saveShareholder} disabled={saving || !shForm.name || !shForm.phone}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Distribution create dialog */}
      <Dialog open={distDialog} onOpenChange={setDistDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Profit Distribution</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Period Label</Label><Input value={distForm.periodLabel} onChange={(e) => setDistForm({ ...distForm, periodLabel: e.target.value })} placeholder="January 2026" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start</Label><Input type="date" value={distForm.periodStart} onChange={(e) => setDistForm({ ...distForm, periodStart: e.target.value })} /></div>
              <div><Label>End</Label><Input type="date" value={distForm.periodEnd} onChange={(e) => setDistForm({ ...distForm, periodEnd: e.target.value })} /></div>
            </div>
            <div><Label>Total Profit to Distribute</Label><Input type="number" value={distForm.totalProfit} onChange={(e) => setDistForm({ ...distForm, totalProfit: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground">Shares auto-calculated: fixed holders paid first, remainder split among percentage holders.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDistDialog(false)}>Cancel</Button>
            <Button onClick={saveDistribution} disabled={saving || !distForm.periodLabel || !distForm.totalProfit}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Distribution detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{detail?.periodLabel} — {detail?.status}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Total profit</span><span className="font-semibold">{fmt(detail.totalProfit)}</span>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Shareholder</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {detail.shares?.map((s) => {
                    const editable = canWriteDist && detail.status === 'DRAFT' && s.shareholder.shareType === 'CUSTOM';
                    return (
                      <TableRow key={s.id}>
                        <TableCell>{s.shareholder.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.shareholder.shareType}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {editable ? (
                            <Input
                              type="number"
                              className="h-8 w-28 ml-auto text-right"
                              value={customAmounts[s.shareholderId] ?? ''}
                              onChange={(e) => setCustomAmounts({ ...customAmounts, [s.shareholderId]: e.target.value })}
                            />
                          ) : fmt(s.amount)}
                        </TableCell>
                        <TableCell><Badge variant="outline">{s.status}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {canWriteDist && detail.status === 'DRAFT' && (
                <div className="flex flex-wrap justify-end gap-2">
                  {detail.shares?.some((s) => s.shareholder.shareType === 'CUSTOM') && (
                    <Button size="sm" variant="secondary" onClick={saveCustomShares} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save custom amounts</Button>
                  )}
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

export default Shareholders;
