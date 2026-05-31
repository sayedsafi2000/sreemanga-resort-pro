'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/ui/page-header';
import {
  Plus,
  Search,
  TrendingUp,
  DollarSign,
  Calendar,
  Edit,
  Trash2,
  Loader2,
  Paperclip,
  X as XIcon,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Settings2,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
} from 'lucide-react';

const STAFF_SALARY_CATEGORY_NAME = 'Staff Salary';

const TAB_LABELS: Record<string, string> = {
  overview: 'Overview',
  expenses: 'All Expenses',
  pending: 'Pending Payments',
};

// ── Custom-field types ────────────────────────────────────────────────────────

export type FieldType = 'text' | 'number' | 'date' | 'textarea' | 'select';

export type CategoryField = {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
};

function toKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// ── Domain types ──────────────────────────────────────────────────────────────

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  isActive?: boolean;
  fields?: CategoryField[];
  _count?: { expenses: number };
};

type Expense = {
  id: string;
  title: string;
  amount: number;
  categoryId: string;
  category: Category;
  date: string;
  paymentMethod: string;
  paidTo: string;
  description: string;
  status: string;
  attachment?: string;
  metadata?: Record<string, string | number>;
  createdBy?: { id: string; name: string; role: string } | null;
  salaryId?: string | null;
};

type PendingPayment = {
  id: string;
  title: string;
  amount: number;
  categoryId?: string | null;
  category?: Category | null;
  dueDate: string;
  notes?: string | null;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  paidExpenseId?: string | null;
  createdBy?: { id: string; name: string; role: string } | null;
  createdAt: string;
};

type Stats = {
  todayTotal: number;
  monthTotal: number;
  categoryBreakdown: { categoryId: string; categoryName: string; total: number }[];
};

// ── Image compression ─────────────────────────────────────────────────────────

const MAX_RECEIPT_DIMENSION = 1600;
const RECEIPT_JPEG_QUALITY = 0.85;

async function fileToCompressedDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Could not load image'));
    i.src = dataUrl;
  });
  const longest = Math.max(img.width, img.height);
  const scale = longest > MAX_RECEIPT_DIMENSION ? MAX_RECEIPT_DIMENSION / longest : 1;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', RECEIPT_JPEG_QUALITY);
}

// ── Constants ─────────────────────────────────────────────────────────────────

const paymentMethods = ['CASH', 'BKASH', 'NAGAD', 'CARD'] as const;
const statuses = ['PAID', 'PENDING', 'CANCELLED'] as const;

const DEFAULT_EXPENSE_FORM = {
  title: '',
  amount: '',
  categoryId: '',
  date: new Date().toISOString().split('T')[0],
  paymentMethod: 'CASH',
  paidTo: '',
  description: '',
  status: 'PAID',
  attachment: '',
};

const DEFAULT_PENDING_FORM = {
  title: '',
  amount: '',
  categoryId: '',
  dueDate: '',
  notes: '',
};

function csvDownload(filename: string, rows: string[][]): void {
  const csv = rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c ?? '');
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(',')
    )
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Field Builder ─────────────────────────────────────────────────────────────

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'textarea', label: 'Multiline text' },
  { value: 'select', label: 'Dropdown' },
];

function FieldBuilder({
  fields,
  onChange,
}: {
  fields: CategoryField[];
  onChange: (fields: CategoryField[]) => void;
}) {
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<FieldType>('text');
  const [newRequired, setNewRequired] = useState(false);
  const [newOptions, setNewOptions] = useState('');

  const addField = () => {
    const label = newLabel.trim();
    if (!label) return;
    const key = toKey(label) || `field_${fields.length + 1}`;
    const uniqueKey = fields.some((f) => f.key === key) ? `${key}_${fields.length}` : key;
    const field: CategoryField = {
      key: uniqueKey,
      label,
      type: newType,
      required: newRequired,
      ...(newType === 'select' && {
        options: newOptions
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    };
    onChange([...fields, field]);
    setNewLabel('');
    setNewType('text');
    setNewRequired(false);
    setNewOptions('');
  };

  const removeField = (key: string) => onChange(fields.filter((f) => f.key !== key));

  const moveField = (idx: number, dir: -1 | 1) => {
    const next = [...fields];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Custom fields for this category
      </p>
      {fields.length > 0 && (
        <div className="space-y-1 rounded-md border bg-muted/30 p-2">
          {fields.map((f, idx) => (
            <div key={f.key} className="flex items-center gap-2 rounded bg-background px-2 py-1.5 text-sm">
              <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 font-medium">{f.label}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {FIELD_TYPES.find((t) => t.value === f.type)?.label ?? f.type}
              </span>
              {f.required && (
                <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700">required</span>
              )}
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => moveField(idx, -1)} disabled={idx === 0} className="rounded p-0.5 hover:bg-muted disabled:opacity-30">
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1} className="rounded p-0.5 hover:bg-muted disabled:opacity-30">
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => removeField(f.key)} className="rounded p-0.5 text-destructive hover:bg-destructive/10">
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2 rounded-md border border-dashed p-3">
        <p className="text-xs text-muted-foreground">Add a field</p>
        <div className="flex gap-2">
          <Input
            placeholder="Field label, e.g. Meter Number"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="flex-1 text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addField(); } }}
          />
          <Select value={newType} onValueChange={(v) => setNewType(v as FieldType)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {newType === 'select' && (
          <Input
            placeholder="Options separated by commas: e.g. Jan, Feb, Mar"
            value={newOptions}
            onChange={(e) => setNewOptions(e.target.value)}
            className="text-sm"
          />
        )}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={newRequired} onChange={(e) => setNewRequired(e.target.checked)} />
            Required
          </label>
          <Button type="button" size="sm" variant="outline" onClick={addField} disabled={!newLabel.trim()}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add field
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Custom fields renderer (expense form) ─────────────────────────────────────

function CustomFieldsForm({
  fields,
  values,
  onChange,
}: {
  fields: CategoryField[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}) {
  if (!fields || fields.length === 0) return null;
  const set = (key: string, value: string) => onChange({ ...values, [key]: value });

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category details</p>
      {fields.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label className="text-sm">
            {f.label}
            {f.required && <span className="ml-1 text-destructive">*</span>}
          </Label>
          {f.type === 'textarea' ? (
            <Textarea value={values[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} placeholder={f.label} rows={2} />
          ) : f.type === 'select' ? (
            <Select value={values[f.key] ?? ''} onValueChange={(v) => set(f.key, v)}>
              <SelectTrigger><SelectValue placeholder={`Select ${f.label}`} /></SelectTrigger>
              <SelectContent>
                {(f.options ?? []).map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
              value={values[f.key] ?? ''}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder={f.label}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Pending payment due-date badge ────────────────────────────────────────────

function DueBadge({ dueDate, status }: { dueDate: string; status: string }) {
  if (status !== 'PENDING') return null;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((due.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        <AlertCircle className="h-3 w-3" />
        Overdue {Math.abs(diffDays)}d
      </span>
    );
  }
  if (diffDays === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
        <Clock className="h-3 w-3" />
        Due today
      </span>
    );
  }
  if (diffDays <= 7) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
        <Clock className="h-3 w-3" />
        Due in {diffDays}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      <Calendar className="h-3 w-3" />
      {new Date(dueDate).toLocaleDateString()}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Expenditures() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'expenses';
  const categoryFilter = searchParams.get('categoryId') || 'all';

  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Expense filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialogs
  const [openCategoryManager, setOpenCategoryManager] = useState(false);
  const [openExpense, setOpenExpense] = useState(false);
  const [openPending, setOpenPending] = useState(false);
  const [openPayNow, setOpenPayNow] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingPending, setEditingPending] = useState<PendingPayment | null>(null);
  const [payingPending, setPayingPending] = useState<PendingPayment | null>(null);

  // Category form
  const [categoryName, setCategoryName] = useState('');
  const [categoryIsActive, setCategoryIsActive] = useState(true);
  const [categoryFields, setCategoryFields] = useState<CategoryField[]>([]);

  // Expense form
  const [expenseForm, setExpenseForm] = useState({ ...DEFAULT_EXPENSE_FORM });
  const [expenseMetadata, setExpenseMetadata] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Pending payment form
  const [pendingForm, setPendingForm] = useState({ ...DEFAULT_PENDING_FORM });

  // Pay-now confirm form
  const [payNowForm, setPayNowForm] = useState({
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
    paidTo: '',
    description: '',
  });

  const canEdit = true;

  const activeFields: CategoryField[] = useMemo(() => {
    if (!expenseForm.categoryId) return [];
    const cat = categories.find((c) => c.id === expenseForm.categoryId);
    return cat?.fields ?? [];
  }, [expenseForm.categoryId, categories]);

  // ── URL helpers ─────────────────────────────────────────────────────────────

  const setTabNavigate = (next: string) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('tab', next);
        if (next !== 'expenses') p.delete('categoryId');
        return p;
      },
      { replace: true }
    );
  };

  const setCategoryFilterInUrl = (value: string) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('tab', 'expenses');
        if (value === 'all') p.delete('categoryId');
        else p.set('categoryId', value);
        return p;
      },
      { replace: true }
    );
  };

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchCategories = useCallback(async () => {
    const res = await api.get('/expenditures/categories');
    setCategories(unwrapList(res, ['categories']) || []);
  }, []);

  const fetchExpenses = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (categoryFilter !== 'all') params.set('categoryId', categoryFilter);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get(`/expenditures${qs}`);
    setExpenses(unwrapList(res, ['expenditures']) || []);
  }, [search, statusFilter, categoryFilter]);

  const fetchPendingPayments = useCallback(async () => {
    const res = await api.get('/pending-payments');
    setPendingPayments((unwrapList(res, ['payments']) || []) as PendingPayment[]);
  }, []);

  const fetchStats = useCallback(async () => {
    const res = await api.get('/expenditures/stats');
    const statsData = (res as { data?: { stats?: Stats } }).data?.stats;
    if (statsData) setStats(statsData);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      setLoadError(null);
      await Promise.all([fetchCategories(), fetchExpenses(), fetchPendingPayments(), fetchStats()]);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setLoadError(ax.response?.data?.message || 'Could not load data. Please try again.');
    }
  }, [fetchCategories, fetchExpenses, fetchPendingPayments, fetchStats]);

  useEffect(() => {
    const delay = search.trim() ? 300 : 0;
    const t = setTimeout(() => void fetchAll(), delay);
    return () => clearTimeout(t);
  }, [search, statusFilter, categoryFilter, tab, fetchAll]);

  // ── Category CRUD ─────────────────────────────────────────────────────────

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;
    if (!editingCategory && categoryName.trim() === STAFF_SALARY_CATEGORY_NAME) {
      alert('The name "Staff Salary" is reserved for the system category.');
      return;
    }
    setSaving(true);
    try {
      const payload = { name: categoryName, isActive: categoryIsActive, fields: categoryFields };
      if (editingCategory) {
        await api.patch(`/expenditures/categories/${editingCategory.id}`, payload);
      } else {
        await api.post('/expenditures/categories', payload);
      }
      setCategoryName('');
      setCategoryIsActive(true);
      setCategoryFields([]);
      setEditingCategory(null);
      await fetchCategories();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Could not save category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const cat = categories.find((c) => c.id === id);
    const count = cat?._count?.expenses ?? 0;
    const msg =
      count > 0
        ? `${cat?.name} has ${count} expense${count === 1 ? '' : 's'}. Delete anyway?`
        : `Delete ${cat?.name ?? 'this category'}?`;
    if (!confirm(msg)) return;
    try {
      await api.delete(`/expenditures/categories/${id}`);
      await fetchCategories();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Could not delete category.');
    }
  };

  // ── Expense CRUD ──────────────────────────────────────────────────────────

  const handleSaveExpense = async () => {
    if (!expenseForm.title || !expenseForm.amount || !expenseForm.categoryId || !expenseForm.date) return;
    for (const f of activeFields) {
      if (f.required && !expenseMetadata[f.key]?.toString().trim()) {
        alert(`"${f.label}" is required.`);
        return;
      }
    }
    setSaving(true);
    try {
      const data = {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
        metadata: Object.keys(expenseMetadata).length > 0 ? expenseMetadata : undefined,
      };
      if (editingExpense) {
        await api.patch(`/expenditures/${editingExpense.id}`, data);
      } else {
        await api.post('/expenditures', data);
      }
      setOpenExpense(false);
      setExpenseForm({ ...DEFAULT_EXPENSE_FORM });
      setExpenseMetadata({});
      setEditingExpense(null);
      await fetchExpenses();
      await fetchStats();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Could not save expense.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenditures/${id}`);
      await fetchExpenses();
      await fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  const openEditExpense = (e: Expense) => {
    setEditingExpense(e);
    setExpenseForm({
      title: e.title,
      amount: e.amount.toString(),
      categoryId: e.categoryId,
      date: e.date.split('T')[0],
      paymentMethod: e.paymentMethod || 'CASH',
      paidTo: e.paidTo || '',
      description: e.description || '',
      status: e.status,
      attachment: e.attachment || '',
    });
    const meta: Record<string, string> = {};
    if (e.metadata) {
      for (const [k, v] of Object.entries(e.metadata)) meta[k] = String(v);
    }
    setExpenseMetadata(meta);
    setOpenExpense(true);
  };

  const handleAttachmentSelect = async (file: File | null | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setExpenseForm((f) => ({ ...f, attachment: dataUrl }));
    } catch {
      alert('Could not read file. Please try a smaller image.');
    } finally {
      setUploading(false);
    }
  };

  // ── Pending Payment CRUD ──────────────────────────────────────────────────

  const handleSavePending = async () => {
    if (!pendingForm.title || !pendingForm.amount || !pendingForm.dueDate) return;
    setSaving(true);
    try {
      const payload = {
        title: pendingForm.title,
        amount: parseFloat(pendingForm.amount),
        categoryId: pendingForm.categoryId || null,
        dueDate: pendingForm.dueDate,
        notes: pendingForm.notes || undefined,
      };
      if (editingPending) {
        await api.patch(`/pending-payments/${editingPending.id}`, payload);
      } else {
        await api.post('/pending-payments', payload);
      }
      setOpenPending(false);
      setPendingForm({ ...DEFAULT_PENDING_FORM });
      setEditingPending(null);
      await fetchPendingPayments();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Could not save pending payment.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePending = async (id: string) => {
    if (!confirm('Delete this pending payment?')) return;
    try {
      await api.delete(`/pending-payments/${id}`);
      await fetchPendingPayments();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePayNow = async () => {
    if (!payingPending) return;
    setSaving(true);
    try {
      await api.post(`/pending-payments/${payingPending.id}/pay`, payNowForm);
      setOpenPayNow(false);
      setPayingPending(null);
      await fetchPendingPayments();
      await fetchExpenses();
      await fetchStats();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Could not process payment.');
    } finally {
      setSaving(false);
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const filteredExpenses = useMemo(() => expenses, [expenses]);

  const { systemCategories, adminCategories } = useMemo(() => {
    const sys: Category[] = [];
    const adm: Category[] = [];
    for (const c of categories) {
      if (c.name === STAFF_SALARY_CATEGORY_NAME) sys.push(c);
      else adm.push(c);
    }
    adm.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return { systemCategories: sys, adminCategories: adm };
  }, [categories]);

  const { activePendingPayments, paidPendingPayments } = useMemo(() => {
    const active: PendingPayment[] = [];
    const paid: PendingPayment[] = [];
    for (const p of pendingPayments) {
      if (p.status === 'PAID') paid.push(p);
      else active.push(p);
    }
    return { activePendingPayments: active, paidPendingPayments: paid };
  }, [pendingPayments]);

  const overdueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return activePendingPayments.filter(
      (p) => p.status === 'PENDING' && new Date(p.dueDate) < today
    ).length;
  }, [activePendingPayments]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(amount);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        eyebrow="Finance"
        title="Financial Operations"
        description="Track expenses and schedule upcoming payments."
        actions={
          <>
            {overdueCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {overdueCount} overdue
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => setOpenCategoryManager(true)}>
              <Settings2 className="mr-2 h-4 w-4" />
              Manage Categories
            </Button>
          </>
        }
      />

      {loadError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b">
        {(['overview', 'expenses', 'pending'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTabNavigate(t)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition ${
              tab === t
                ? 'border-b-2 border-primary text-primary -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {TAB_LABELS[t]}
            {t === 'pending' && activePendingPayments.length > 0 && (
              <span className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                overdueCount > 0 ? 'bg-red-500 text-white' : 'bg-primary text-primary-foreground'
              }`}>
                {activePendingPayments.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="card-base card-lift p-5 fade-up fade-up-1">
              <div className="flex items-start justify-between">
                <p className="eyebrow">Today's Expense</p>
                <span className="stat-blue stat-icon-bg flex h-9 w-9 items-center justify-center rounded-lg"><TrendingUp className="h-[18px] w-[18px]" /></span>
              </div>
              <p className="mt-3 text-3xl font-bold tracking-tight value-pop">{formatCurrency(stats?.todayTotal || 0)}</p>
            </div>
            <div className="card-base card-lift p-5 fade-up fade-up-2">
              <div className="flex items-start justify-between">
                <p className="eyebrow">This Month</p>
                <span className="stat-purple stat-icon-bg flex h-9 w-9 items-center justify-center rounded-lg"><Calendar className="h-[18px] w-[18px]" /></span>
              </div>
              <p className="mt-3 text-3xl font-bold tracking-tight value-pop">{formatCurrency(stats?.monthTotal || 0)}</p>
            </div>
            <div className="card-base card-lift p-5 fade-up fade-up-3">
              <div className="flex items-start justify-between">
                <p className="eyebrow">Pending Bills</p>
                <span className="stat-amber stat-icon-bg flex h-9 w-9 items-center justify-center rounded-lg"><Clock className="h-[18px] w-[18px]" /></span>
              </div>
              <p className="mt-3 text-3xl font-bold tracking-tight value-pop">{activePendingPayments.length}</p>
              {overdueCount > 0 && (
                <p className="mt-1 text-xs text-red-600">{overdueCount} overdue</p>
              )}
            </div>
            <div className="card-base card-lift p-5 fade-up fade-up-4">
              <div className="flex items-start justify-between">
                <p className="eyebrow">Pending Amount</p>
                <span className="stat-rose stat-icon-bg flex h-9 w-9 items-center justify-center rounded-lg"><DollarSign className="h-[18px] w-[18px]" /></span>
              </div>
              <p className="mt-3 text-3xl font-bold tracking-tight value-pop">
                {formatCurrency(activePendingPayments.reduce((s, p) => s + p.amount, 0))}
              </p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown (This Month)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats?.categoryBreakdown.map((cat) => (
                    <div key={cat.categoryId} className="flex items-center justify-between">
                      <span className="text-sm">{cat.categoryName}</span>
                      <span className="font-medium">{formatCurrency(cat.total)}</span>
                    </div>
                  ))}
                  {(!stats?.categoryBreakdown || stats.categoryBreakdown.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">No expenses this month</p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Upcoming Payments
                  {overdueCount > 0 && (
                    <Badge variant="destructive" className="text-[10px]">{overdueCount} overdue</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activePendingPayments.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.title}</p>
                        {p.category && <p className="text-xs text-muted-foreground">{p.category.name}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <DueBadge dueDate={p.dueDate} status={p.status} />
                        <span className="text-sm font-medium">{formatCurrency(p.amount)}</span>
                      </div>
                    </div>
                  ))}
                  {activePendingPayments.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No upcoming payments</p>
                  )}
                  {activePendingPayments.length > 5 && (
                    <button
                      type="button"
                      className="w-full text-center text-xs text-primary hover:underline pt-1"
                      onClick={() => setTabNavigate('pending')}
                    >
                      View all {activePendingPayments.length} pending payments →
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── EXPENSES TAB ─────────────────────────────────────────────────────── */}
      {tab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilterInUrl}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.name === STAFF_SALARY_CATEGORY_NAME ? ' (system)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const rows: string[][] = [
                    ['Title', 'Category', 'Paid To', 'Method', 'Amount', 'Date', 'Status', 'Recorded by'],
                    ...filteredExpenses.map((e) => [
                      e.title, e.category?.name ?? '', e.paidTo ?? '', e.paymentMethod ?? '',
                      String(e.amount), new Date(e.date).toISOString().split('T')[0], e.status, e.createdBy?.name ?? '',
                    ]),
                  ];
                  csvDownload(`expenses-${new Date().toISOString().slice(0, 10)}.csv`, rows);
                }}
                disabled={filteredExpenses.length === 0}
              >
                Export CSV
              </Button>
              <Button onClick={() => { setEditingExpense(null); setExpenseForm({ ...DEFAULT_EXPENSE_FORM }); setExpenseMetadata({}); setOpenExpense(true); }} variant="ink">
                <Plus className="mr-2 h-4 w-4" /> Add Expense
              </Button>
            </div>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Paid To</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recorded by</TableHead>
                    <TableHead>Receipt</TableHead>
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((exp) => (
                    <ExpenseRow
                      key={exp.id}
                      exp={exp}
                      canEdit={canEdit}
                      formatCurrency={formatCurrency}
                      onEdit={openEditExpense}
                      onDelete={handleDeleteExpense}
                      onPreview={setPreviewUrl}
                    />
                  ))}
                  {filteredExpenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No expenses found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── PENDING PAYMENTS TAB ─────────────────────────────────────────────── */}
      {tab === 'pending' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Schedule upcoming bills and payments. When due, hit{' '}
              <span className="font-medium text-foreground">Pay Now</span> to convert it to an expense automatically.
            </p>
            <Button onClick={() => { setEditingPending(null); setPendingForm({ ...DEFAULT_PENDING_FORM }); setOpenPending(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Add Pending Payment
            </Button>
          </div>

          {/* Active / upcoming */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Upcoming & Overdue
                {activePendingPayments.length > 0 && (
                  <Badge variant="outline">{activePendingPayments.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activePendingPayments.map((p) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isOverdue = new Date(p.dueDate) < today && p.status === 'PENDING';
                    return (
                      <TableRow key={p.id} className={isOverdue ? 'bg-red-50/50' : ''}>
                        <TableCell className="font-medium">{p.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.category?.name ?? '—'}
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(p.amount)}</TableCell>
                        <TableCell>
                          <DueBadge dueDate={p.dueDate} status={p.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                          {p.notes || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              className="gap-1.5"
                              onClick={() => {
                                setPayingPending(p);
                                setPayNowForm({
                                  date: new Date().toISOString().split('T')[0],
                                  paymentMethod: 'CASH',
                                  paidTo: '',
                                  description: p.notes || '',
                                });
                                setOpenPayNow(true);
                              }}
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              Pay Now
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingPending(p);
                                setPendingForm({
                                  title: p.title,
                                  amount: p.amount.toString(),
                                  categoryId: p.categoryId || '',
                                  dueDate: p.dueDate.split('T')[0],
                                  notes: p.notes || '',
                                });
                                setOpenPending(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeletePending(p.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {activePendingPayments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No upcoming payments. Use "Add Pending Payment" to schedule one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Paid history */}
          {paidPendingPayments.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  Paid
                  <Badge variant="outline">{paidPendingPayments.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Was due</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paidPendingPayments.map((p) => (
                      <TableRow key={p.id} className="opacity-60">
                        <TableCell className="font-medium">
                          {p.title}
                          <Badge variant="outline" className="ml-2 text-[10px] text-green-700 border-green-300">
                            Paid
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.category?.name ?? '—'}</TableCell>
                        <TableCell>{formatCurrency(p.amount)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(p.dueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.notes || '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDeletePending(p.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Manage Categories Dialog ─────────────────────────────────────────── */}
      <Dialog open={openCategoryManager} onOpenChange={(o) => { if (!o) setEditingCategory(null); setOpenCategoryManager(o); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: form */}
            <div className="space-y-4">
              <p className="text-sm font-medium">{editingCategory ? `Editing: ${editingCategory.name}` : 'New Category'}</p>
              <div className="space-y-2">
                <Label>Category Name</Label>
                <Input
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g., Current Bill, Internet Bill"
                  disabled={editingCategory?.name === STAFF_SALARY_CATEGORY_NAME}
                />
                {editingCategory?.name === STAFF_SALARY_CATEGORY_NAME && (
                  <p className="text-xs text-muted-foreground">System category name cannot be changed.</p>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={categoryIsActive} onChange={(e) => setCategoryIsActive(e.target.checked)} />
                Active
              </label>
              <FieldBuilder fields={categoryFields} onChange={setCategoryFields} />
              <div className="flex gap-2">
                <Button onClick={handleSaveCategory} disabled={saving || !categoryName.trim()} className="flex-1">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingCategory ? 'Update' : 'Add Category'}
                </Button>
                {editingCategory && (
                  <Button variant="outline" onClick={() => { setEditingCategory(null); setCategoryName(''); setCategoryIsActive(true); setCategoryFields([]); }}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
            {/* Right: list */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Categories</p>
              <div className="max-h-96 space-y-1 overflow-y-auto">
                {[...systemCategories, ...adminCategories].map((cat) => (
                  <div key={cat.id} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate">{cat.name}</span>
                        {cat.name === STAFF_SALARY_CATEGORY_NAME && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">System</Badge>
                        )}
                        {cat.isActive === false && (
                          <Badge variant="outline" className="text-[10px] shrink-0">Inactive</Badge>
                        )}
                      </div>
                      {(cat.fields ?? []).length > 0 && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {(cat.fields ?? []).map((f) => f.label).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingCategory(cat); setCategoryName(cat.name); setCategoryIsActive(cat.isActive !== false); setCategoryFields(cat.fields ?? []); }}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      {cat.name !== STAFF_SALARY_CATEGORY_NAME && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteCategory(cat.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No categories yet.</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Receipt Lightbox ─────────────────────────────────────────────────── */}
      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Receipt</DialogTitle></DialogHeader>
          {previewUrl && <img src={previewUrl} alt="Receipt" className="mx-auto max-h-[70vh] w-auto rounded" />}
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit Expense Dialog ──────────────────────────────────────────── */}
      <Dialog open={openExpense} onOpenChange={setOpenExpense}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={expenseForm.title} onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })} placeholder="e.g., May electricity bill" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={expenseForm.categoryId} onValueChange={(v) => { setExpenseForm({ ...expenseForm, categoryId: v }); setExpenseMetadata({}); }}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.filter((cat) => cat.isActive !== false).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CustomFieldsForm fields={activeFields} values={expenseMetadata} onChange={setExpenseMetadata} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={expenseForm.paymentMethod} onValueChange={(v) => setExpenseForm({ ...expenseForm, paymentMethod: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{paymentMethods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={expenseForm.status} onValueChange={(v) => setExpenseForm({ ...expenseForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Paid To</Label>
              <Input value={expenseForm.paidTo} onChange={(e) => setExpenseForm({ ...expenseForm, paidTo: e.target.value })} placeholder="Staff/vendor name" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder="Optional notes..." />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Paperclip className="h-4 w-4" /> Receipt (optional)</Label>
              {expenseForm.attachment ? (
                <div className="flex items-start gap-3">
                  <img src={expenseForm.attachment} alt="Receipt preview" className="h-24 w-24 rounded border border-border object-cover" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setExpenseForm({ ...expenseForm, attachment: '' })}>
                    <XIcon className="mr-2 h-4 w-4" /> Remove
                  </Button>
                </div>
              ) : (
                <Input type="file" accept="image/*,application/pdf" capture="environment" onChange={(e) => handleAttachmentSelect(e.target.files?.[0])} disabled={uploading} />
              )}
              {uploading && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Processing...</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenExpense(false)}>Cancel</Button>
            <Button onClick={handleSaveExpense} disabled={saving || !expenseForm.title || !expenseForm.amount || !expenseForm.categoryId || !expenseForm.date}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit Pending Payment Dialog ─────────────────────────────────── */}
      <Dialog open={openPending} onOpenChange={setOpenPending}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPending ? 'Edit Pending Payment' : 'Add Pending Payment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={pendingForm.title} onChange={(e) => setPendingForm({ ...pendingForm, title: e.target.value })} placeholder="e.g., Monthly rent, Electricity bill" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (BDT) *</Label>
                <Input type="number" value={pendingForm.amount} onChange={(e) => setPendingForm({ ...pendingForm, amount: e.target.value })} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input type="date" value={pendingForm.dueDate} onChange={(e) => setPendingForm({ ...pendingForm, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={pendingForm.categoryId || 'none'} onValueChange={(v) => setPendingForm({ ...pendingForm, categoryId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select category (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.filter((c) => c.isActive !== false).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={pendingForm.notes} onChange={(e) => setPendingForm({ ...pendingForm, notes: e.target.value })} placeholder="Optional details..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPending(false)}>Cancel</Button>
            <Button onClick={handleSavePending} disabled={saving || !pendingForm.title || !pendingForm.amount || !pendingForm.dueDate}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Pay Now Confirm Dialog ───────────────────────────────────────────── */}
      <Dialog open={openPayNow} onOpenChange={setOpenPayNow}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Confirm Payment
            </DialogTitle>
          </DialogHeader>
          {payingPending && (
            <div className="space-y-4 py-2">
              <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                <p className="font-semibold">{payingPending.title}</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(payingPending.amount)}</p>
                {payingPending.category && (
                  <p className="text-xs text-muted-foreground">Category: {payingPending.category.name}</p>
                )}
                {payingPending.notes && (
                  <p className="text-xs text-muted-foreground">{payingPending.notes}</p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                This will create an expense record and mark the payment as done.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Input type="date" value={payNowForm.date} onChange={(e) => setPayNowForm({ ...payNowForm, date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select value={payNowForm.paymentMethod} onValueChange={(v) => setPayNowForm({ ...payNowForm, paymentMethod: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{paymentMethods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Paid To</Label>
                <Input value={payNowForm.paidTo} onChange={(e) => setPayNowForm({ ...payNowForm, paidTo: e.target.value })} placeholder="Vendor / staff name" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={payNowForm.description} onChange={(e) => setPayNowForm({ ...payNowForm, description: e.target.value })} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPayNow(false)}>Cancel</Button>
            <Button onClick={handlePayNow} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Expense row (with metadata expand) ───────────────────────────────────────

function ExpenseRow({
  exp,
  canEdit,
  formatCurrency,
  onEdit,
  onDelete,
  onPreview,
}: {
  exp: Expense;
  canEdit: boolean;
  formatCurrency: (n: number) => string;
  onEdit: (e: Expense) => void;
  onDelete: (id: string) => void;
  onPreview: (url: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const metaEntries = exp.metadata ? Object.entries(exp.metadata) : [];
  const categoryFields: CategoryField[] = exp.category?.fields ?? [];

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">
          <div className="flex items-start gap-2">
            {metaEntries.length > 0 && (
              <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground" title={expanded ? 'Hide details' : 'Show details'}>
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
            <span>
              {exp.title}
              {exp.salaryId && <Badge variant="outline" className="ml-2 text-[10px]">Payroll sync</Badge>}
              {!exp.salaryId && exp.category?.name === STAFF_SALARY_CATEGORY_NAME && (
                <Badge variant="secondary" className="ml-2 text-[10px]">Salary category</Badge>
              )}
            </span>
          </div>
        </TableCell>
        <TableCell>{exp.category?.name}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{exp.paidTo || '—'}</TableCell>
        <TableCell className="text-sm">{exp.paymentMethod || '—'}</TableCell>
        <TableCell>{formatCurrency(exp.amount)}</TableCell>
        <TableCell>{new Date(exp.date).toLocaleDateString()}</TableCell>
        <TableCell><Badge variant={exp.status === 'PAID' ? 'default' : 'secondary'}>{exp.status}</Badge></TableCell>
        <TableCell className="text-sm text-muted-foreground">{exp.createdBy?.name ?? '—'}</TableCell>
        <TableCell>
          {exp.attachment ? (
            <button type="button" onClick={() => onPreview(exp.attachment!)} className="block h-10 w-10 overflow-hidden rounded border border-border hover:ring-2 hover:ring-primary" title="View receipt">
              <img src={exp.attachment} alt="Receipt" className="h-full w-full object-cover" />
            </button>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </TableCell>
        {canEdit && (
          <TableCell className="text-right">
            <Button variant="ghost" size="icon" onClick={() => onEdit(exp)}><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(exp.id)}><Trash2 className="h-4 w-4" /></Button>
          </TableCell>
        )}
      </TableRow>
      {expanded && metaEntries.length > 0 && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={canEdit ? 10 : 9} className="py-2 pl-10">
            <div className="flex flex-wrap gap-4 text-sm">
              {metaEntries.map(([key, value]) => {
                const fieldDef = categoryFields.find((f) => f.key === key);
                const label = fieldDef?.label ?? key;
                return (
                  <div key={key}>
                    <span className="font-medium text-muted-foreground">{label}: </span>
                    <span>{String(value)}</span>
                  </div>
                );
              })}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
