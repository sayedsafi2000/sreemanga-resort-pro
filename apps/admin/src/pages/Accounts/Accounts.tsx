import React, { useEffect, useMemo, useState } from 'react';
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
import { Loader2, ArrowLeftRight, Plus, Landmark, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/AuthContext';

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  parentId?: string | null;
  currentBalance: number;
  openingBalance: number;
  isActive: boolean;
};
type Txn = {
  id: string;
  direction: 'IN' | 'OUT';
  amount: number;
  description?: string | null;
  businessLine?: string | null;
  referenceType?: string | null;
  transactionDate: string;
};
type Receivable = {
  id: string;
  customerName: string;
  amount: number;
  collectedAmount: number;
  status: string;
  dueDate?: string | null;
  referenceType?: string | null;
};

const TYPE_GROUPS: { label: string; types: string[] }[] = [
  { label: 'Assets', types: ['CASH', 'BANK', 'MOBILE_BANKING', 'RECEIVABLE', 'ASSET'] },
  { label: 'Liabilities', types: ['PAYABLE', 'LIABILITY'] },
  { label: 'Equity', types: ['EQUITY'] },
  { label: 'Income', types: ['INCOME'] },
  { label: 'Expenses', types: ['EXPENSE'] },
];

const CASH_TYPES = ['CASH', 'BANK', 'MOBILE_BANKING'];
const canTxn = (r?: string) => r === 'SUPER_ADMIN' || r === 'MANAGER' || r === 'ACCOUNTANT';

const Accounts: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'chart' | 'receivables'>('chart');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);

  const [detail, setDetail] = useState<Account | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [txnLoading, setTxnLoading] = useState(false);

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({ fromAccountId: '', toAccountId: '', amount: '', description: '' });
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryForm, setEntryForm] = useState({ direction: 'IN', amount: '', description: '' });
  const [recvOpen, setRecvOpen] = useState(false);
  const [recvForm, setRecvForm] = useState({ customerName: '', amount: '', dueDate: '' });
  const [collectOpen, setCollectOpen] = useState(false);
  const [collectRecv, setCollectRecv] = useState<Receivable | null>(null);
  const [collectForm, setCollectForm] = useState({ amount: '', method: 'CASH' });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [a, r] = await Promise.all([api.get('/accounts'), api.get('/accounts/receivables')]);
      setAccounts(unwrapList<Account>(a, ['accounts']));
      setReceivables(unwrapList<Receivable>(r, ['receivables']));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const cashAccounts = useMemo(() => accounts.filter((a) => CASH_TYPES.includes(a.type)), [accounts]);
  const cashPosition = useMemo(() => cashAccounts.reduce((s, a) => s + a.currentBalance, 0), [cashAccounts]);

  const openDetail = async (acc: Account) => {
    setDetail(acc);
    setTxnLoading(true);
    try {
      const r = await api.get(`/accounts/${acc.id}/transactions`);
      setTxns(unwrapList<Txn>(r, ['transactions']));
    } finally {
      setTxnLoading(false);
    }
  };

  const doTransfer = async () => {
    setSaving(true); setError(null);
    try {
      await api.post('/accounts/transfer', {
        fromAccountId: transferForm.fromAccountId,
        toAccountId: transferForm.toAccountId,
        amount: Number(transferForm.amount),
        description: transferForm.description || undefined,
      });
      setTransferOpen(false); await load();
    } catch (e: any) { setError(e?.response?.data?.message || 'Transfer failed'); }
    finally { setSaving(false); }
  };

  const doEntry = async () => {
    if (!detail) return;
    setSaving(true); setError(null);
    try {
      await api.post(`/accounts/${detail.id}/transactions`, {
        direction: entryForm.direction,
        amount: Number(entryForm.amount),
        description: entryForm.description || undefined,
      });
      setEntryOpen(false); await load();
      await openDetail(detail);
    } catch (e: any) { setError(e?.response?.data?.message || 'Entry failed'); }
    finally { setSaving(false); }
  };

  const createRecv = async () => {
    setSaving(true); setError(null);
    try {
      await api.post('/accounts/receivables', {
        customerName: recvForm.customerName,
        amount: Number(recvForm.amount),
        dueDate: recvForm.dueDate || undefined,
      });
      setRecvOpen(false); setRecvForm({ customerName: '', amount: '', dueDate: '' }); await load();
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const doCollect = async () => {
    if (!collectRecv) return;
    setSaving(true); setError(null);
    try {
      await api.patch(`/accounts/receivables/${collectRecv.id}/collect`, {
        amount: Number(collectForm.amount),
        method: collectForm.method,
      });
      setCollectOpen(false); await load();
    } catch (e: any) { setError(e?.response?.data?.message || 'Collection failed'); }
    finally { setSaving(false); }
  };

  const fmt = (n: number) => `৳${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Accounts" description="Chart of accounts, balances, transfers and receivables" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Cash Position</div>
          <div className="text-2xl font-bold">{fmt(cashPosition)}</div>
          <div className="text-xs text-muted-foreground mt-1">Cash + Bank + Mobile</div>
        </CardContent></Card>
        {cashAccounts.slice(0, 2).map((a) => (
          <Card key={a.id}><CardContent className="p-4">
            <div className="text-sm text-muted-foreground">{a.name}</div>
            <div className="text-2xl font-bold">{fmt(a.currentBalance)}</div>
            <div className="text-xs text-muted-foreground mt-1">{a.code}</div>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={tab === 'chart' ? 'default' : 'outline'} onClick={() => setTab('chart')}><Landmark className="h-4 w-4 mr-1" /> Chart of Accounts</Button>
        <Button variant={tab === 'receivables' ? 'default' : 'outline'} onClick={() => setTab('receivables')}><Receipt className="h-4 w-4 mr-1" /> Receivables</Button>
        <div className="ml-auto flex gap-2">
          {canTxn(user?.role) && tab === 'chart' && (
            <Button variant="outline" onClick={() => { setTransferForm({ fromAccountId: cashAccounts[0]?.id ?? '', toAccountId: cashAccounts[1]?.id ?? '', amount: '', description: '' }); setError(null); setTransferOpen(true); }}>
              <ArrowLeftRight className="h-4 w-4 mr-1" /> Transfer
            </Button>
          )}
          {canTxn(user?.role) && tab === 'receivables' && (
            <Button onClick={() => { setRecvForm({ customerName: '', amount: '', dueDate: '' }); setError(null); setRecvOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New Receivable
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : tab === 'chart' ? (
        <div className="space-y-6">
          {TYPE_GROUPS.map((group) => {
            const rows = accounts.filter((a) => group.types.includes(a.type));
            if (rows.length === 0) return null;
            const total = rows.reduce((s, a) => s + a.currentBalance, 0);
            return (
              <Card key={group.label}><CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold">{group.label}</h3>
                  <span className="text-sm font-semibold">{fmt(total)}</span>
                </div>
                <Table>
                  <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {rows.map((a) => (
                      <TableRow key={a.id} className="cursor-pointer" onClick={() => openDetail(a)}>
                        <TableCell className="font-mono text-xs">{a.code}</TableCell>
                        <TableCell className={a.parentId ? 'pl-6' : 'font-medium'}>{a.name}</TableCell>
                        <TableCell><Badge variant="outline">{a.type}</Badge></TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(a.currentBalance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent></Card>
            );
          })}
        </div>
      ) : (
        <Card><CardContent className="p-4">
          <Table>
            <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Collected</TableHead><TableHead>Balance</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {receivables.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.customerName}</TableCell>
                  <TableCell>{fmt(r.amount)}</TableCell>
                  <TableCell>{fmt(r.collectedAmount)}</TableCell>
                  <TableCell className="font-semibold">{fmt(r.amount - r.collectedAmount)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}</TableCell>
                  <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    {canTxn(user?.role) && r.status !== 'COLLECTED' && r.status !== 'CANCELLED' && (
                      <Button size="sm" variant="outline" onClick={() => { setCollectRecv(r); setCollectForm({ amount: String(r.amount - r.collectedAmount), method: 'CASH' }); setError(null); setCollectOpen(true); }}>Collect</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {receivables.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No receivables.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}

      {/* Account detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.code} — {detail?.name}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">Current balance</span>
                <span className="text-lg font-bold">{fmt(detail.currentBalance)}</span>
              </div>
              {canTxn(user?.role) && (
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => { setEntryForm({ direction: 'IN', amount: '', description: '' }); setError(null); setEntryOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" /> Manual Entry
                  </Button>
                </div>
              )}
              <div className="max-h-80 overflow-auto">
                {txnLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Dir</TableHead><TableHead>Amount</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {txns.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs text-muted-foreground">{new Date(t.transactionDate).toLocaleDateString()}</TableCell>
                          <TableCell><Badge className={t.direction === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{t.direction}</Badge></TableCell>
                          <TableCell className="tabular-nums">{fmt(t.amount)}</TableCell>
                          <TableCell className="text-sm">{t.description ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                      {txns.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No transactions.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transfer dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Transfer Between Accounts</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>From</Label>
              <Select value={transferForm.fromAccountId} onValueChange={(v) => setTransferForm({ ...transferForm, fromAccountId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{cashAccounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} ({fmt(a.currentBalance)})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>To</Label>
              <Select value={transferForm.toAccountId} onValueChange={(v) => setTransferForm({ ...transferForm, toAccountId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{cashAccounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Amount</Label><Input type="number" value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={transferForm.description} onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })} /></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button onClick={doTransfer} disabled={saving || !transferForm.amount || transferForm.fromAccountId === transferForm.toAccountId}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual entry dialog */}
      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Manual Entry — {detail?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Direction</Label>
              <Select value={entryForm.direction} onValueChange={(v) => setEntryForm({ ...entryForm, direction: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="IN">IN (money in)</SelectItem><SelectItem value="OUT">OUT (money out)</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Amount</Label><Input type="number" value={entryForm.amount} onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={entryForm.description} onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })} /></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryOpen(false)}>Cancel</Button>
            <Button onClick={doEntry} disabled={saving || !entryForm.amount}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New receivable dialog */}
      <Dialog open={recvOpen} onOpenChange={setRecvOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Receivable</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Customer</Label><Input value={recvForm.customerName} onChange={(e) => setRecvForm({ ...recvForm, customerName: e.target.value })} /></div>
            <div><Label>Amount</Label><Input type="number" value={recvForm.amount} onChange={(e) => setRecvForm({ ...recvForm, amount: e.target.value })} /></div>
            <div><Label>Due date</Label><Input type="date" value={recvForm.dueDate} onChange={(e) => setRecvForm({ ...recvForm, dueDate: e.target.value })} /></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecvOpen(false)}>Cancel</Button>
            <Button onClick={createRecv} disabled={saving || !recvForm.customerName || !recvForm.amount}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Collect dialog */}
      <Dialog open={collectOpen} onOpenChange={setCollectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Collect — {collectRecv?.customerName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Balance: {collectRecv ? fmt(collectRecv.amount - collectRecv.collectedAmount) : ''}</p>
            <div><Label>Amount</Label><Input type="number" value={collectForm.amount} onChange={(e) => setCollectForm({ ...collectForm, amount: e.target.value })} /></div>
            <div>
              <Label>Method</Label>
              <Select value={collectForm.method} onValueChange={(v) => setCollectForm({ ...collectForm, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['CASH', 'BKASH', 'NAGAD', 'CARD', 'BANK_TRANSFER', 'MOBILE_BANKING'].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectOpen(false)}>Cancel</Button>
            <Button onClick={doCollect} disabled={saving || !collectForm.amount}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Collect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Accounts;
