import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Landmark, Loader2, Plus, Trash2 } from 'lucide-react';
import { METHOD_LABEL, PAY_METHODS, addDaysYmd, errMsg, fmt, fmtDate, todayYmd } from '@/pages/Bookings/shared';
import { FINANCE_ENTRY_TYPES, type FinanceEntry, type FinanceEntryType, isCashMovingType } from './types';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; canDelete: boolean; onChanged: () => void };

export const ENTRY_TYPE_LABEL: Record<FinanceEntryType, string> = {
  OPENING_CASH: 'Opening cash / bank balance',
  OPENING_FIXED_ASSET: 'Opening fixed assets',
  OPENING_LIABILITY: 'Opening liability',
  LOAN_RECEIVED: 'Loan received',
  LOAN_REPAID: 'Loan repaid',
  CAPITAL_IN: 'Owner capital in',
  CAPITAL_OUT: 'Owner capital out (drawings)',
};

const ENTRY_TYPE_HELP: Record<FinanceEntryType, string> = {
  OPENING_CASH: 'Money already in hand, in mobile wallets or at the bank when you started keeping records here.',
  OPENING_FIXED_ASSET: 'Book value of land, buildings, furniture and equipment owned before records began (no cash moves).',
  OPENING_LIABILITY: 'Loans or other debts still outstanding when records began (no cash moves).',
  LOAN_RECEIVED: 'Cash received from a bank or lender — increases cash and liabilities.',
  LOAN_REPAID: 'Principal paid back to a lender — reduces cash and liabilities.',
  CAPITAL_IN: 'Cash the owner put into the business outside the share scheme.',
  CAPITAL_OUT: 'Cash the owner took out for personal use.',
};

const typeLabel = (t: string) => ENTRY_TYPE_LABEL[t as FinanceEntryType] ?? t;

/** Opening balances, loans and owner capital — the money with no payment or expense row behind it. */
const OtherEntriesDialog: React.FC<Props> = ({ open, onOpenChange, canDelete, onChanged }) => {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [type, setType] = useState<FinanceEntryType>('OPENING_CASH');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('CASH');
  const [date, setDate] = useState(todayYmd());
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [earliestActivity, setEarliestActivity] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await api.get('/finance/entries');
      setEntries(unwrapList<FinanceEntry>(res, ['entries']));
      setEarliestActivity(typeof res.data?.earliestActivity === 'string' ? res.data.earliestActivity : null);
    } catch (e) {
      setListError(errMsg(e, 'Could not load entries'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setDate(type.startsWith('OPENING_') ? openingDefault : todayYmd());
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const cashMoving = isCashMovingType(type);
  const isOpening = type.startsWith('OPENING_');
  // Opening balances must be dated before the first payment/expense, or older periods stay unbalanced.
  const openingDefault = earliestActivity ? addDaysYmd(earliestActivity, -1) : todayYmd();
  useEffect(() => {
    if (isOpening) setDate(openingDefault);
    else setDate((d) => (d > todayYmd() ? todayYmd() : d));
  }, [isOpening, openingDefault]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!(amt > 0)) { setFormError('Enter an amount greater than zero'); return; }
    if (!date) { setFormError('Pick a date'); return; }
    setSaving(true);
    setFormError(null);
    try {
      await api.post('/finance/entries', {
        type,
        amount: amt,
        method: cashMoving ? method : undefined,
        date,
        description: description.trim() || undefined,
      });
      setAmount('');
      setDescription('');
      await load();
      onChanged();
    } catch (err) {
      setFormError(errMsg(err, 'Could not save the entry'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (entry: FinanceEntry) => {
    if (!window.confirm(`Delete this ${typeLabel(entry.type).toLowerCase()} of ${fmt(entry.amount)}? Its ledger postings are reversed.`)) return;
    setDeletingId(entry.id);
    setListError(null);
    try {
      await api.delete(`/finance/entries/${entry.id}`);
      await load();
      onChanged();
    } catch (err) {
      setListError(errMsg(err, 'Could not delete the entry'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Landmark className="h-4 w-4" /> Other entries</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Opening capital is derived automatically (cash + fixed assets − liabilities) — do not enter it.
          Record here only the money that has no payment or expense row behind it.
        </p>

        <form onSubmit={submit} className="space-y-3 rounded-xl border bg-slate-50/60 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as FinanceEntryType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FINANCE_ENTRY_TYPES.map((t) => <SelectItem key={t} value={t}>{ENTRY_TYPE_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ENTRY_TYPE_HELP[type]}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="fe-amount">Amount (৳)</Label>
              <Input id="fe-amount" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
            </div>
            {cashMoving && (
              <div className="space-y-1">
                <Label>Account / method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAY_METHODS.map((m) => <SelectItem key={m} value={m}>{METHOD_LABEL[m]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="fe-date">Date</Label>
              <Input id="fe-date" type="date" value={date} max={todayYmd()} onChange={(e) => setDate(e.target.value)} required />
              {isOpening && (
                <p className="text-xs text-muted-foreground">
                  Date it on or before your first recorded payment or expense{earliestActivity ? ` (first activity: ${earliestActivity})` : ''}, so every period balances.
                </p>
              )}
            </div>
            <div className={`space-y-1 ${cashMoving ? 'sm:col-span-2' : ''}`}>
              <Label htmlFor="fe-desc">Description</Label>
              <Input id="fe-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Balance at 30 Jun 2026 per bank statement" maxLength={300} />
            </div>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />} Add entry
            </Button>
          </div>
        </form>

        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Description</TableHead>
                {canDelete && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && entries.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              ) : entries.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No entries yet. Start with your opening cash balance.</TableCell></TableRow>
              ) : (
                entries.map((en) => (
                  <TableRow key={en.id}>
                    <TableCell className="whitespace-nowrap">{fmtDate(en.date)}</TableCell>
                    <TableCell className="font-medium">{typeLabel(en.type)}</TableCell>
                    <TableCell className="text-muted-foreground">{en.method ? METHOD_LABEL[en.method] ?? en.method : '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">{fmt(en.amount)}</TableCell>
                    <TableCell className="max-w-[16rem] truncate text-muted-foreground" title={en.description ?? ''}>{en.description || '—'}</TableCell>
                    {canDelete && (
                      <TableCell className="text-right">
                        <Button type="button" variant="ghost" size="icon" aria-label="Delete entry" onClick={() => remove(en)} disabled={deletingId === en.id}>
                          {deletingId === en.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-rose-600" />}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {listError && <p className="text-sm text-red-600">{listError}</p>}
        {!canDelete && entries.length > 0 && <p className="text-xs text-muted-foreground">Only a Super Admin can delete entries.</p>}
      </DialogContent>
    </Dialog>
  );
};

export default OtherEntriesDialog;
