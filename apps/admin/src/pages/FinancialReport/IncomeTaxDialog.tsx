import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, Loader2, Plus, Receipt, Trash2 } from 'lucide-react';
import { METHOD_LABEL, PAY_METHODS, errMsg, fmt, todayYmd } from '@/pages/Bookings/shared';
import { fmtYmd } from './period';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The system "Income Tax" expense category (Statement.incomeTaxCategoryId); null → nothing can be recorded. */
  categoryId: string | null;
  /** Statement period (YYYY-MM-DD) — only PAID expenses dated inside it are listed. */
  from: string;
  to: string;
  /** Fired after any add / save / delete so the page can reload the statement. */
  onChanged: () => void;
};

type TaxExpense = {
  id: string;
  title: string;
  amount: number;
  /** ISO timestamp — expenses are stored at UTC midnight of the entry day, so slice(0, 10) is the day. */
  date: string;
  paymentMethod: string | null;
  status: string;
};
type Draft = { title: string; amount: string; date: string; method: string };

const toDraft = (e: TaxExpense): Draft => ({ title: e.title, amount: String(e.amount), date: e.date.slice(0, 10), method: e.paymentMethod ?? 'CASH' });
const sameDraft = (a: Draft, b: Draft) => a.title === b.title && a.amount === b.amount && a.date === b.date && a.method === b.method;
const clampToToday = (ymd: string) => (ymd > todayYmd() ? todayYmd() : ymd);
const emptyAdd = (to: string): Draft => ({ title: 'Income tax', amount: '', date: clampToToday(to), method: 'CASH' });

/** Edits the "(-) Income Tax" line of the Financial Report: PAID expenses in the Income Tax category for the period. */
const IncomeTaxDialog: React.FC<Props> = ({ open, onOpenChange, categoryId, from, to, onChanged }) => {
  const [rows, setRows] = useState<TaxExpense[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<Draft>(emptyAdd(to));
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const load = async () => {
    if (!categoryId) { setRows([]); setDrafts({}); return; }
    setLoading(true);
    setListError(null);
    try {
      const q = new URLSearchParams({ categoryId, from, to });
      const res = await api.get(`/expenditures?${q.toString()}`);
      // The API filters by category + dates; status is filtered here too so a PENDING bill never shows as paid tax.
      const list = unwrapList<TaxExpense>(res, ['expenditures']).filter((e) => e.status === 'PAID');
      setRows(list);
      const seed: Record<string, Draft> = {};
      list.forEach((e) => { seed[e.id] = toDraft(e); });
      setDrafts(seed);
    } catch (e) {
      setListError(errMsg(e, 'Could not load income tax entries'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setAddForm(emptyAdd(to));
    setAddError(null);
    setListError(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, categoryId, from, to]);

  const setDraft = (id: string, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const save = async (e: TaxExpense) => {
    const d = drafts[e.id];
    if (!d) return;
    const amt = Number(d.amount);
    if (!d.title.trim()) { setListError('Title is required'); return; }
    if (!(amt > 0)) { setListError('Amount must be greater than zero'); return; }
    if (!d.date) { setListError('Pick a date'); return; }
    setBusyId(e.id);
    setListError(null);
    try {
      await api.patch(`/expenditures/${e.id}`, { title: d.title.trim(), amount: amt, date: d.date, paymentMethod: d.method });
      await load();
      onChanged();
    } catch (err) {
      setListError(errMsg(err, 'Could not save the entry'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (e: TaxExpense) => {
    if (!window.confirm(`Delete "${e.title}" (${fmt(e.amount)}) dated ${fmtYmd(e.date.slice(0, 10))}?`)) return;
    setBusyId(e.id);
    setListError(null);
    try {
      await api.delete(`/expenditures/${e.id}`);
      await load();
      onChanged();
    } catch (err) {
      setListError(errMsg(err, 'Could not delete the entry'));
    } finally {
      setBusyId(null);
    }
  };

  const add = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!categoryId) return;
    const amt = Number(addForm.amount);
    if (!(amt > 0)) { setAddError('Enter an amount greater than zero'); return; }
    if (!addForm.date) { setAddError('Pick a date'); return; }
    setAdding(true);
    setAddError(null);
    try {
      await api.post('/expenditures', {
        title: addForm.title.trim() || 'Income tax',
        amount: amt,
        categoryId,
        date: addForm.date,
        paymentMethod: addForm.method,
        status: 'PAID',
      });
      setAddForm((f) => ({ ...f, amount: '' }));
      await load();
      onChanged();
    } catch (err) {
      setAddError(errMsg(err, 'Could not add the entry'));
    } finally {
      setAdding(false);
    }
  };

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Receipt className="h-4 w-4" /> Income tax — {fmtYmd(from)} to {fmtYmd(to)}</DialogTitle>
        </DialogHeader>

        {!categoryId ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No Income Tax category found — open Expenditures → Manage Categories to create one (kind: Income Tax).
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Paid expenses in the Income Tax category dated inside this period. Changing a date outside the period moves the entry to that period's report.
            </p>

            <form onSubmit={add} className="space-y-3 rounded-xl border bg-slate-50/60 p-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label htmlFor="it-title">Title</Label>
                  <Input id="it-title" value={addForm.title} onChange={(e) => setAddForm({ ...addForm, title: e.target.value })} maxLength={200} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="it-amount">Amount (৳)</Label>
                  <Input id="it-amount" type="number" min={0} step="0.01" value={addForm.amount} onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })} placeholder="0.00" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="it-date">Date</Label>
                  <Input id="it-date" type="date" value={addForm.date} max={todayYmd()} onChange={(e) => setAddForm({ ...addForm, date: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label>Method</Label>
                  <Select value={addForm.method} onValueChange={(v) => setAddForm({ ...addForm, method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAY_METHODS.map((m) => <SelectItem key={m} value={m}>{METHOD_LABEL[m]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {addError && <p className="text-sm text-red-600">{addError}</p>}
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={adding}>
                  {adding ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />} Add income tax
                </Button>
              </div>
            </form>

            <div className="overflow-x-auto rounded-xl border">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-36">Date</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-32 text-right">Amount</TableHead>
                    <TableHead className="w-40">Method</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && rows.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No income tax recorded in this period.</TableCell></TableRow>
                  ) : (
                    rows.map((e) => {
                      const d = drafts[e.id] ?? toDraft(e);
                      const dirty = !sameDraft(d, toDraft(e));
                      const busy = busyId === e.id;
                      return (
                        <TableRow key={e.id} className={dirty ? 'bg-amber-50/40' : ''}>
                          <TableCell>
                            <Input type="date" className="h-8 text-xs" value={d.date} max={todayYmd()} onChange={(ev) => setDraft(e.id, { date: ev.target.value })} aria-label="Date" />
                          </TableCell>
                          <TableCell>
                            <Input className="h-8 text-xs" value={d.title} onChange={(ev) => setDraft(e.id, { title: ev.target.value })} maxLength={200} aria-label="Title" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} step="0.01" className="h-8 text-right text-xs tabular-nums" value={d.amount} onChange={(ev) => setDraft(e.id, { amount: ev.target.value })} aria-label="Amount" />
                          </TableCell>
                          <TableCell>
                            <Select value={d.method} onValueChange={(v) => setDraft(e.id, { method: v })}>
                              <SelectTrigger className="h-8 text-xs" aria-label="Method"><SelectValue /></SelectTrigger>
                              <SelectContent>{PAY_METHODS.map((m) => <SelectItem key={m} value={m}>{METHOD_LABEL[m]}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right">
                            <Button type="button" variant="ghost" size="icon" aria-label="Save" title={dirty ? 'Save changes' : 'No changes'} onClick={() => save(e)} disabled={busy || !dirty}>
                              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className={`h-4 w-4 ${dirty ? 'text-emerald-600' : 'text-slate-300'}`} />}
                            </Button>
                            <Button type="button" variant="ghost" size="icon" aria-label="Delete" title="Delete" onClick={() => remove(e)} disabled={busy}>
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between text-sm">
              {listError ? <p className="text-red-600">{listError}</p> : <span />}
              <p className="whitespace-nowrap text-muted-foreground">Total: <span className="font-semibold text-foreground tabular-nums">{fmt(total)}</span></p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default IncomeTaxDialog;
