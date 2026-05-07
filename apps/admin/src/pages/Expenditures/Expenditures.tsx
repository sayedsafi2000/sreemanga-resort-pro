'use client';

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Plus, Search, TrendingUp, DollarSign, Calendar, Edit, Trash2, Loader2, Paperclip, X as XIcon } from 'lucide-react';

type Category = { id: string; name: string; sortOrder: number };
type Expense = { id: string; title: string; amount: number; categoryId: string; category: Category; date: string; paymentMethod: string; paidTo: string; description: string; status: string; attachment?: string };
type Stats = { todayTotal: number; monthTotal: number; categoryBreakdown: { categoryId: string; categoryName: string; total: number }[] };

const MAX_RECEIPT_DIMENSION = 1600;
const RECEIPT_JPEG_QUALITY = 0.85;

async function fileToCompressedDataUrl(file: File): Promise<string> {
  // Non-image files (e.g. PDFs) — passthrough as data URL.
  if (!file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }
  // Resize images down to MAX_RECEIPT_DIMENSION on the longest side, JPEG quality 0.85,
  // so receipts don't blow past the server's 10mb JSON body limit.
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

const paymentMethods = ['CASH', 'BKASH', 'NAGAD', 'CARD'] as const;
const statuses = ['PAID', 'PENDING', 'CANCELLED'] as const;

export default function Expenditures() {
  const navigate = useNavigate();
  const tab = new URLSearchParams(window.location.search).get('tab') || 'overview';

  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialogs
  const [openCategory, setOpenCategory] = useState(false);
  const [openExpense, setOpenExpense] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form states
  const [categoryName, setCategoryName] = useState('');
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
    paidTo: '',
    description: '',
    status: 'PAID',
    attachment: '',
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const canEdit = true; // Would check role

  const setTabNavigate = (next: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', next);
    navigate(`?${params.toString()}`, { replace: true });
  };

  useEffect(() => {
    fetchData();
  }, [search, statusFilter]);

  const fetchData = async () => {
    try {
      const [catRes, expRes, statsRes] = await Promise.all([
        api.get('/expenditures/categories'),
        api.get(`/expenditures?search=${search}&status=${statusFilter !== 'all' ? statusFilter : ''}`),
        api.get('/expenditures/stats'),
      ]);
      setCategories(unwrapList(catRes, ['categories']) || []);
      setExpenses(unwrapList(expRes, ['expenditures']) || []);
      const statsData = (statsRes as any).stats;
      if (statsData) setStats(statsData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;
    setSaving(true);
    try {
      if (editingCategory) {
        await api.patch(`/expenditures/categories/${editingCategory.id}`, { name: categoryName });
      } else {
        await api.post('/expenditures/categories', { name: categoryName });
      }
      setOpenCategory(false);
      setCategoryName('');
      setEditingCategory(null);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      await api.delete(`/expenditures/categories/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.title || !expenseForm.amount || !expenseForm.categoryId || !expenseForm.date) return;
    setSaving(true);
    try {
      const data = {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
      };
      if (editingExpense) {
        await api.patch(`/expenditures/${editingExpense.id}`, data);
      } else {
        await api.post('/expenditures', data);
      }
      setOpenExpense(false);
      setExpenseForm({ title: '', amount: '', categoryId: '', date: new Date().toISOString().split('T')[0], paymentMethod: 'CASH', paidTo: '', description: '', status: 'PAID', attachment: '' });
      setEditingExpense(null);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenditures/${id}`);
      fetchData();
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
    setOpenExpense(true);
  };

  const handleAttachmentSelect = async (file: File | null | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setExpenseForm((f) => ({ ...f, attachment: dataUrl }));
    } catch (err) {
      console.error(err);
      alert('Could not read file. Please try a smaller image.');
    } finally {
      setUploading(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses;
  }, [expenses, search, statusFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {['overview', 'expenses', 'categories'].map((t) => (
          <button
            key={t}
            onClick={() => setTabNavigate(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition ${
              tab === t
                ? 'border-b-2 border-primary text-primary -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Today's Expense</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats?.todayTotal || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats?.monthTotal || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categories.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{expenses.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
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
        </div>
      )}

      {/* EXPENSES TAB */}
      {tab === 'expenses' && (
        <div className="space-y-4">
          {/* Add Button & Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
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
            <Button onClick={() => { setEditingExpense(null); setOpenExpense(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Add Expense
            </Button>
          </div>

          {/* Table */}
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
                    <TableHead>Receipt</TableHead>
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-medium">{exp.title}</TableCell>
                      <TableCell>{exp.category?.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{exp.paidTo || '—'}</TableCell>
                      <TableCell className="text-sm">{exp.paymentMethod || '—'}</TableCell>
                      <TableCell>{formatCurrency(exp.amount)}</TableCell>
                      <TableCell>{new Date(exp.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={exp.status === 'PAID' ? 'default' : 'secondary'}>
                          {exp.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {exp.attachment ? (
                          <button
                            type="button"
                            onClick={() => setPreviewUrl(exp.attachment ?? null)}
                            className="block h-10 w-10 overflow-hidden rounded border border-border hover:ring-2 hover:ring-primary"
                            title="View receipt"
                          >
                            <img src={exp.attachment} alt="Receipt" className="h-full w-full object-cover" />
                          </button>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEditExpense(exp)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(exp.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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

      {/* CATEGORIES TAB */}
      {tab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingCategory(null); setCategoryName(''); setOpenCategory(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Order</TableHead>
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell>{cat.sortOrder}</TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingCategory(cat);
                              setCategoryName(cat.name);
                              setOpenCategory(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {categories.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No categories
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add/Edit Category Dialog */}
      <Dialog open={openCategory} onOpenChange={setOpenCategory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g., Staff Salary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCategory(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={saving || !categoryName.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Lightbox */}
      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <img src={previewUrl} alt="Receipt" className="mx-auto max-h-[70vh] w-auto rounded" />
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Expense Dialog */}
      <Dialog open={openExpense} onOpenChange={setOpenExpense}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={expenseForm.title}
                onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                placeholder="e.g., Receptionist salary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={expenseForm.categoryId}
                onValueChange={(v) => setExpenseForm({ ...expenseForm, categoryId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={expenseForm.paymentMethod}
                  onValueChange={(v) => setExpenseForm({ ...expenseForm, paymentMethod: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={expenseForm.status}
                  onValueChange={(v) => setExpenseForm({ ...expenseForm, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Paid To</Label>
              <Input
                value={expenseForm.paidTo}
                onChange={(e) => setExpenseForm({ ...expenseForm, paidTo: e.target.value })}
                placeholder="Staff/vendor name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Paperclip className="h-4 w-4" /> Receipt (optional)</Label>
              {expenseForm.attachment ? (
                <div className="flex items-start gap-3">
                  <img
                    src={expenseForm.attachment}
                    alt="Receipt preview"
                    className="h-24 w-24 rounded border border-border object-cover"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setExpenseForm({ ...expenseForm, attachment: '' })}
                  >
                    <XIcon className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              ) : (
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleAttachmentSelect(e.target.files?.[0])}
                  disabled={uploading}
                />
              )}
              {uploading && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Processing...
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenExpense(false)}>Cancel</Button>
            <Button
              onClick={handleSaveExpense}
              disabled={
                saving ||
                !expenseForm.title ||
                !expenseForm.amount ||
                !expenseForm.categoryId ||
                !expenseForm.date
              }
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}