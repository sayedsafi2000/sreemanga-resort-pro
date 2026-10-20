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
import { Loader2, ArrowLeftRight, Plus, Landmark, Receipt, Pencil, Trash2, Lock } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/contexts/AuthContext';
import { canDeleteLedgerEntries, canEditPayments } from '@/config/rbac';
import { errMsg, toYmd, todayYmd } from '@/pages/Bookings/shared';

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
  /** MANUAL / TRANSFER rows are user-made and editable; every other value is owned by a payment, expense, refund… */
  referenceType?: string | null;
  /** For TRANSFER: shared by both legs (null on legacy transfers). */
  referenceId?: string | null;
  createdById?: string | null;
  transactionDate: string;
};
type Receivable = {
  id: string;
  customerName: string;
  amount: number;
  collectedAmount: number;
  status: string;
  dueDate?: string | null;
  notes?: string | null;
  referenceType?: string | null;
};

/** Human label for Txn.referenceType in the ledger's "Ref" column. */
const REF_LABEL: Record<string, string> = {
  MANUAL: 'Manual',
  TRANSFER: 'Transfer',
  BOOKING: 'Sale',
  RESTAURANT_ORDER: 'Sale',
  DAY_LONG_BOOKING: 'Sale',
  EXPENSE: 'Expense',
  REFUND: 'Refund',
  REFUND_REVERSAL: 'Refund',
  FINANCE_ENTRY: 'Finance entry',
  INVOICE: 'Receivable',
};
const refLabel = (t?: string | null) => (t ? REF_LABEL[t] ?? t : '—');
const isUserTxn = (t: Txn) => t.referenceType === 'MANUAL' || t.referenceType === 'TRANSFER';
const isOpenRecv = (r: Receivable) => r.status === 'OPEN' || r.status === 'PARTIAL';
const LOCKED_TITLE = 'Linked to a payment/expense — change it at the source';

const TYPE_GROUPS: { label: string; types: string[] }[] = [
  { label: 'Assets', types: ['CASH', 'BANK', 'MOBILE_BANKING', 'RECEIVABLE', 'ASSET'] },
  { label: 'Liabilities', types: ['PAYABLE', 'LIABILITY'] },
  { label: 'Equity', types: ['EQUITY'] },
  { label: 'Income', types: ['INCOME'] },
  { label: 'Expenses', types: ['EXPENSE'] },
];

const CASH_TYPES = ['CASH', 'BANK', 'MOBILE_BANKING'];

const Accounts: React.FC = () => {
  const { user } = useAuth();
  const canTxn = canEditPayments(user?.role);
  const canDeleteLedger = canDeleteLedgerEntries(user?.role);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'receivables' ? 'receivables' : 'chart';
  const setTab = (next: 'chart' | 'receivables') => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('tab', next);
        return p;
      },
      { replace: true }
    );
  };

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);

  const [detail, setDetail] = useState<Account | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [txnLoading, setTxnLoading] = useState(false);

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({ fromAccountId: '', toAccountId: '', amount: '', description: '' });
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryAccount, setEntryAccount] = useState<Account | null>(null);
  const [entryForm, setEntryForm] = useState({ direction: 'IN', amount: '', description: '', transactionDate: todayYmd() });
  const [txnEdit, setTxnEdit] = useState<Txn | null>(null);
  const [txnForm, setTxnForm] = useState({ direction: 'IN', amount: '', description: '', transactionDate: '' });
  const [deletingTxnId, setDeletingTxnId] = useState<string | null>(null);
  const [recvOpen, setRecvOpen] = useState(false);
  const [recvForm, setRecvForm] = useState({ customerName: '', amount: '', dueDate: '' });
  const [recvEdit, setRecvEdit] = useState<Receivable | null>(null);
  const [recvEditForm, setRecvEditForm] = useState({ customerName: '', amount: '', dueDate: '', notes: '' });
  const [collectOpen, setCollectOpen] = useState(false);
  const [collectRecv, setCollectRecv] = useState<Receivable | null>(null);
  const [collectForm, setCollectForm] = useState({ amount: '', method: 'CASH' });

  const [saving, setSaving] = useState(false);
  /** Shown inside whichever dialog is open. */
  const [error, setError] = useState<string | null>(null);
  /** Shown as a banner on the page (actions that have no dialog, e.g. deleting a receivable). */
  const [pageError, setPageError] = useState<string | null>(null);

  const load = async (): Promise<Account[]> => {
    setLoading(true);
    try {
      // active=true hides retired accounts (e.g. 5007) from the chart and the cash cards.
      const [a, r] = await Promise.all([api.get('/accounts?active=true'), api.get('/accounts/receivables')]);
      const list = unwrapList<Account>(a, ['accounts']);
      setAccounts(list);
      setReceivables(unwrapList<Receivable>(r, ['receivables']));
      return list;
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const cashAccounts = useMemo(() => accounts.filter((a) => CASH_TYPES.includes(a.type)), [accounts]);
  const cashPosition = useMemo(() => cashAccounts.reduce((s, a) => s + a.currentBalance, 0), [cashAccounts]);

  const openDetail = async (acc: Account) => {
    setDetail(acc);
    setError(null);
    setTxnLoading(true);
    try {
      const r = await api.get(`/accounts/${acc.id}/transactions`);
      setTxns(unwrapList<Txn>(r, ['transactions']));
    } finally {
      setTxnLoading(false);
    }
  };

  const openTransfer = (fromId?: string) => {
    const from = fromId || cashAccounts[0]?.id || '';
    const to = cashAccounts.find((a) => a.id !== from)?.id || cashAccounts[1]?.id || '';
    setTransferForm({ fromAccountId: from, toAccountId: to, amount: '', description: '' });
    setError(null);
    setTransferOpen(true);
  };

  const openManualEntry = (acc: Account) => {
    setEntryAccount(acc);
    setEntryForm({ direction: 'IN', amount: '', description: '', transactionDate: todayYmd() });
    setError(null);
    setEntryOpen(true);
  };

  /** After a ledger change: refresh balances, then reopen the ledger with the fresh account row. */
  const refreshAfterLedgerChange = async (acc: Account) => {
    const list = await load();
    await openDetail(list.find((a) => a.id === acc.id) ?? acc);
  };

  const openTxnEdit = (t: Txn) => {
    setTxnEdit(t);
    setTxnForm({
      direction: t.direction,
      amount: String(t.amount),
      description: t.description ?? '',
      transactionDate: toYmd(new Date(t.transactionDate)),
    });
    setError(null);
  };

  const saveTxnEdit = async () => {
    if (!txnEdit || !detail) return;
    setSaving(true); setError(null);
    try {
      const body: Record<string, unknown> = {
        amount: Number(txnForm.amount),
        description: txnForm.description.trim() || null,
        transactionDate: txnForm.transactionDate,
      };
      // Transfer legs keep their direction — the API updates the sibling leg alongside.
      if (txnEdit.referenceType !== 'TRANSFER') body.direction = txnForm.direction;
      await api.patch(`/accounts/transactions/${txnEdit.id}`, body);
      setTxnEdit(null);
      await refreshAfterLedgerChange(detail);
    } catch (e) { setError(errMsg(e, 'Could not save the entry')); }
    finally { setSaving(false); }
  };

  const deleteTxn = async (t: Txn) => {
    if (!detail) return;
    const grouped = t.referenceType === 'TRANSFER' && !!t.referenceId;
    const prompt = grouped
      ? `Delete this transfer of ${fmt(t.amount)}? This removes both sides of the transfer.`
      : `Delete this ${t.direction} entry of ${fmt(t.amount)}?`;
    if (!window.confirm(prompt)) return;
    setDeletingTxnId(t.id); setError(null);
    try {
      await api.delete(`/accounts/transactions/${t.id}`);
      await refreshAfterLedgerChange(detail);
    } catch (e) { setError(errMsg(e, 'Could not delete the entry')); }
    finally { setDeletingTxnId(null); }
  };

  const openRecvEdit = (r: Receivable) => {
    setRecvEdit(r);
    setRecvEditForm({
      customerName: r.customerName,
      amount: String(r.amount),
      dueDate: r.dueDate ? toYmd(new Date(r.dueDate)) : '',
      notes: r.notes ?? '',
    });
    setError(null);
  };

  const saveRecvEdit = async () => {
    if (!recvEdit) return;
    setSaving(true); setError(null);
    try {
      await api.patch(`/accounts/receivables/${recvEdit.id}`, {
        customerName: recvEditForm.customerName.trim(),
        amount: Number(recvEditForm.amount),
        dueDate: recvEditForm.dueDate || null,
        notes: recvEditForm.notes.trim() || null,
      });
      setRecvEdit(null);
      await load();
    } catch (e) { setError(errMsg(e, 'Could not save the receivable')); }
    finally { setSaving(false); }
  };

  const deleteRecv = async (r: Receivable) => {
    if (!window.confirm(`Delete the receivable from ${r.customerName} (${fmt(r.amount)})?`)) return;
    setPageError(null);
    try {
      await api.delete(`/accounts/receivables/${r.id}`);
      await load();
    } catch (e) { setPageError(errMsg(e, 'Could not delete the receivable')); }
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
      if (detail) await openDetail(detail);
    } catch (e: any) { setError(e?.response?.data?.message || 'Transfer failed'); }
    finally { setSaving(false); }
  };

  const doEntry = async () => {
    const acc = entryAccount || detail;
    if (!acc) return;
    setSaving(true); setError(null);
    try {
      await api.post(`/accounts/${acc.id}/transactions`, {
        direction: entryForm.direction,
        amount: Number(entryForm.amount),
        description: entryForm.description || undefined,
        transactionDate: entryForm.transactionDate || undefined,
      });
      setEntryOpen(false);
      setEntryAccount(null);
      await load();
      if (detail?.id === acc.id) await openDetail(acc);
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
  const balanceClass = (n: number) => (n < 0 ? 'text-red-600' : '');
  const outstandingClass = (r: Receivable) => {
    const left = r.amount - r.collectedAmount;
    if (left <= 0 || r.status === 'COLLECTED' || r.status === 'CANCELLED') return '';
    const overdue = r.dueDate && new Date(r.dueDate) < new Date(new Date().toDateString());
    return overdue ? 'text-red-600 font-semibold' : 'text-amber-700 font-semibold';
  };
  const entryTarget = entryAccount || detail;

  return (
    <div className="space-y-6">
      <PageHeader title="Accounts" description="Chart of accounts, balances, transfers and receivables" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 space-y-2">
          <div className="text-sm text-muted-foreground">Cash Position</div>
          <div className={`text-2xl font-bold ${!loading ? balanceClass(cashPosition) : ''}`}>{loading ? '…' : fmt(cashPosition)}</div>
          <div className="text-xs text-muted-foreground">Cash + Bank + Mobile</div>
          {canTxn && cashAccounts.length >= 2 && (
            <Button size="sm" variant="outline" className="mt-1" onClick={() => openTransfer()}>
              <ArrowLeftRight className="h-3.5 w-3.5 mr-1" /> Transfer
            </Button>
          )}
        </CardContent></Card>
        {cashAccounts.slice(0, 2).map((a) => (
          <Card key={a.id}><CardContent className="p-4 space-y-2">
            <div className="text-sm text-muted-foreground">{a.name}</div>
            <div className={`text-2xl font-bold ${balanceClass(a.currentBalance)}`}>{fmt(a.currentBalance)}</div>
            <div className="text-xs text-muted-foreground">{a.code}</div>
            {canTxn && (
              <div className="flex flex-wrap gap-1 pt-1">
                <Button size="sm" variant="outline" onClick={() => openTransfer(a.id)}>
                  <ArrowLeftRight className="h-3.5 w-3.5 mr-1" /> Transfer
                </Button>
                <Button size="sm" variant="outline" onClick={() => openManualEntry(a)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Entry
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openDetail(a)}>View</Button>
              </div>
            )}
          </CardContent></Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={tab === 'chart' ? 'default' : 'outline'} onClick={() => setTab('chart')}><Landmark className="h-4 w-4 mr-1" /> Chart of Accounts</Button>
        <Button variant={tab === 'receivables' ? 'default' : 'outline'} onClick={() => setTab('receivables')}><Receipt className="h-4 w-4 mr-1" /> Receivables</Button>
        <div className="ml-auto flex gap-2">
          {canTxn && tab === 'chart' && (
            <Button variant="outline" onClick={() => openTransfer()}>
              <ArrowLeftRight className="h-4 w-4 mr-1" /> Transfer
            </Button>
          )}
          {canTxn && tab === 'receivables' && (
            <Button onClick={() => { setRecvForm({ customerName: '', amount: '', dueDate: '' }); setError(null); setRecvOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New Receivable
            </Button>
          )}
        </div>
      </div>

      {pageError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{pageError}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : tab === 'chart' ? (
        <div className="space-y-6">
          {accounts.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No accounts yet. Run the database seed to create the chart of accounts.</CardContent></Card>
          ) : (
            TYPE_GROUPS.map((group) => {
              const rows = accounts.filter((a) => group.types.includes(a.type));
              if (rows.length === 0) return null;
              const total = rows.reduce((s, a) => s + a.currentBalance, 0);
              return (
                <Card key={group.label}><CardContent className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">{group.label}</h3>
                    <span className={`text-sm font-semibold ${balanceClass(total)}`}>{fmt(total)}</span>
                  </div>
                  <Table>
                    <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {rows.map((a) => (
                        <TableRow key={a.id} className="cursor-pointer" onClick={() => openDetail(a)}>
                          <TableCell className="font-mono text-xs">{a.code}</TableCell>
                          <TableCell className={a.parentId ? 'pl-6' : 'font-medium'}>{a.name}</TableCell>
                          <TableCell><Badge variant="outline">{a.type}</Badge></TableCell>
                          <TableCell className={`text-right tabular-nums ${balanceClass(a.currentBalance)}`}>{fmt(a.currentBalance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent></Card>
              );
            })
          )}
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
                  <TableCell className={outstandingClass(r)}>{fmt(r.amount - r.collectedAmount)}</TableCell>
                  <TableCell className={`text-sm ${outstandingClass(r).includes('text-red') ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {canTxn && r.status !== 'COLLECTED' && r.status !== 'CANCELLED' && (
                      <Button size="sm" variant="outline" onClick={() => { setCollectRecv(r); setCollectForm({ amount: String(r.amount - r.collectedAmount), method: 'CASH' }); setError(null); setCollectOpen(true); }}>Collect</Button>
                    )}
                    {canTxn && isOpenRecv(r) && (
                      <Button size="icon" variant="ghost" title="Edit" aria-label="Edit receivable" onClick={() => openRecvEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    )}
                    {canDeleteLedger && r.collectedAmount === 0 && (
                      <Button size="icon" variant="ghost" title="Delete" aria-label="Delete receivable" onClick={() => deleteRecv(r)}><Trash2 className="h-3.5 w-3.5 text-red-600" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {receivables.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No receivables.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{detail?.code} — {detail?.name}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">Current balance</span>
                <span className={`text-lg font-bold ${balanceClass(detail.currentBalance)}`}>{fmt(detail.currentBalance)}</span>
              </div>
              {canTxn && (
                <div className="flex justify-end gap-2">
                  {CASH_TYPES.includes(detail.type) && (
                    <Button size="sm" variant="outline" onClick={() => openTransfer(detail.id)}>
                      <ArrowLeftRight className="h-4 w-4 mr-1" /> Transfer
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => openManualEntry(detail)}>
                    <Plus className="h-4 w-4 mr-1" /> Manual Entry
                  </Button>
                </div>
              )}
              <div className="max-h-80 overflow-auto">
                {txnLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Dir</TableHead><TableHead>Amount</TableHead><TableHead>Ref</TableHead><TableHead>Description</TableHead><TableHead className="w-20" /></TableRow></TableHeader>
                    <TableBody>
                      {txns.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{new Date(t.transactionDate).toLocaleDateString()}</TableCell>
                          <TableCell><Badge className={t.direction === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{t.direction}</Badge></TableCell>
                          <TableCell className={`whitespace-nowrap tabular-nums ${t.direction === 'OUT' ? 'text-red-600' : 'text-emerald-700'}`}>{fmt(t.amount)}</TableCell>
                          <TableCell><Badge variant="outline" className="whitespace-nowrap text-[10px]">{refLabel(t.referenceType)}</Badge></TableCell>
                          <TableCell className="text-sm">{t.description ?? '—'}</TableCell>
                          <TableCell className="whitespace-nowrap text-right">
                            {isUserTxn(t) ? (
                              <>
                                {canTxn && (
                                  <Button size="icon" variant="ghost" title="Edit" aria-label="Edit entry" onClick={() => openTxnEdit(t)} disabled={deletingTxnId === t.id}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {canDeleteLedger && (
                                  <Button size="icon" variant="ghost" title="Delete" aria-label="Delete entry" onClick={() => deleteTxn(t)} disabled={deletingTxnId === t.id}>
                                    {deletingTxnId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-red-600" />}
                                  </Button>
                                )}
                              </>
                            ) : (
                              // A span, not a disabled button: disabled buttons drop pointer events, so the title tooltip would never show.
                              <span title={LOCKED_TITLE} aria-label={LOCKED_TITLE} className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center text-muted-foreground/60">
                                <Lock className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {txns.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No transactions.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                )}
              </div>
              {error && !txnEdit && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!txnEdit} onOpenChange={(o) => !o && setTxnEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit {txnEdit?.referenceType === 'TRANSFER' ? 'transfer' : 'entry'} — {detail?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Direction</Label>
              <Select value={txnForm.direction} onValueChange={(v) => setTxnForm({ ...txnForm, direction: v })} disabled={txnEdit?.referenceType === 'TRANSFER'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="IN">IN (money in)</SelectItem><SelectItem value="OUT">OUT (money out)</SelectItem></SelectContent>
              </Select>
              {txnEdit?.referenceType === 'TRANSFER' && <p className="mt-1 text-xs text-muted-foreground">A transfer's direction is fixed; the other side of the transfer is updated with it.</p>}
            </div>
            <div><Label>Amount</Label><Input type="number" min={0} step="0.01" value={txnForm.amount} onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })} /></div>
            <div><Label>Date</Label><Input type="date" value={txnForm.transactionDate} max={todayYmd()} onChange={(e) => setTxnForm({ ...txnForm, transactionDate: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={txnForm.description} onChange={(e) => setTxnForm({ ...txnForm, description: e.target.value })} /></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxnEdit(null)}>Cancel</Button>
            <Button onClick={saveTxnEdit} disabled={saving || !txnForm.amount || !txnForm.transactionDate}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!recvEdit} onOpenChange={(o) => !o && setRecvEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Receivable — {recvEdit?.customerName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Customer</Label><Input value={recvEditForm.customerName} onChange={(e) => setRecvEditForm({ ...recvEditForm, customerName: e.target.value })} /></div>
            <div>
              <Label>Amount</Label>
              <Input type="number" min={recvEdit?.collectedAmount ?? 0} step="0.01" value={recvEditForm.amount} onChange={(e) => setRecvEditForm({ ...recvEditForm, amount: e.target.value })} />
              {recvEdit && recvEdit.collectedAmount > 0 && <p className="mt-1 text-xs text-muted-foreground">At least {fmt(recvEdit.collectedAmount)} — the amount already collected.</p>}
            </div>
            <div><Label>Due date</Label><Input type="date" value={recvEditForm.dueDate} onChange={(e) => setRecvEditForm({ ...recvEditForm, dueDate: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={recvEditForm.notes} onChange={(e) => setRecvEditForm({ ...recvEditForm, notes: e.target.value })} /></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecvEdit(null)}>Cancel</Button>
            <Button onClick={saveRecvEdit} disabled={saving || !recvEditForm.customerName.trim() || !recvEditForm.amount}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <Dialog open={entryOpen} onOpenChange={(o) => { setEntryOpen(o); if (!o) setEntryAccount(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Manual Entry — {entryTarget?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Direction</Label>
              <Select value={entryForm.direction} onValueChange={(v) => setEntryForm({ ...entryForm, direction: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="IN">IN (money in)</SelectItem><SelectItem value="OUT">OUT (money out)</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Amount</Label><Input type="number" value={entryForm.amount} onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })} /></div>
            <div><Label>Date</Label><Input type="date" value={entryForm.transactionDate} max={todayYmd()} onChange={(e) => setEntryForm({ ...entryForm, transactionDate: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={entryForm.description} onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })} /></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryOpen(false)}>Cancel</Button>
            <Button onClick={doEntry} disabled={saving || !entryForm.amount || !entryForm.transactionDate}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
