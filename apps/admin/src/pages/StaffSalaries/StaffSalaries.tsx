'use client';

import { useState, useEffect } from 'react';
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
import { DollarSign, Check, X, Loader2 } from 'lucide-react';

type User = { id: string; name: string; role: string };
type StaffWithSalary = {
  id?: string;
  user: User;
  userId: string;
  amount?: number;
  month?: number;
  year?: number;
  status?: string;
  paymentDate?: string | null;
  notes?: string | null;
  isPaid: boolean;
};

const SALARY_STATUSES = ['PENDING', 'PAID', 'CANCELLED'] as const;
type SalaryStatus = (typeof SALARY_STATUSES)[number];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const ROLE_LABELS: Record<string, string> = {
  MANAGER: 'Manager',
  RECEPTIONIST: 'Receptionist',
  HOUSEKEEPING: 'Housekeeping',
  RESTAURANT_STAFF: 'Restaurant Staff',
  ACCOUNTANT: 'Accountant',
};

export default function StaffSalaries() {
  const [staff, setStaff] = useState<StaffWithSalary[]>([]);
  const [saving, setSaving] = useState(false);
  const [year, setYear] = useState<number | string>(new Date().getFullYear());
  const [month, setMonth] = useState<number | string>(new Date().getMonth() + 1);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffWithSalary | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState<string>(todayIso());
  const [status, setStatus] = useState<SalaryStatus>('PAID');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAmounts, setBulkAmounts] = useState<Record<string, string>>({});
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const fetchData = async () => {
    try {
      const staffRes = await api.get(`/salaries/staff?year=${year}&month=${month}`);
      setStaff(unwrapList(staffRes, ['staff']) || []);
    } catch (err) {
      console.error(err);
    }
  };

  const openPayDialog = (staffMember: StaffWithSalary) => {
    setSelectedStaff(staffMember);
    setAmount((staffMember.amount || 0).toString());
    setNotes(staffMember.notes || '');
    const existingStatus = (staffMember.status as SalaryStatus | undefined) || 'PAID';
    setStatus(existingStatus);
    setPaymentDate(
      staffMember.paymentDate ? staffMember.paymentDate.slice(0, 10) : todayIso()
    );
    setOpenDialog(true);
  };

  const handleSavePayment = async () => {
    if (!selectedStaff || !amount) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        userId: selectedStaff.user.id,
        amount: parseFloat(amount),
        month,
        year,
        status,
        notes,
      };
      if (status === 'PAID') {
        payload.paymentDate = new Date(`${paymentDate}T00:00:00.000Z`).toISOString();
      } else {
        payload.paymentDate = null;
      }
      await api.post('/salaries', payload);
      setOpenDialog(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const totalSalary = staff.reduce((sum, s) => sum + (s.amount || 0), 0);
  const paidCount = staff.filter(s => s.isPaid).length;

  const toggleSelected = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const openBulkPay = () => {
    const amounts: Record<string, string> = {};
    staff.forEach((s) => {
      if (selectedIds.has(s.user.id)) {
        amounts[s.user.id] = String(s.amount || '');
      }
    });
    setBulkAmounts(amounts);
    setBulkOpen(true);
  };

  const handleBulkPay = async () => {
    setBulkSaving(true);
    try {
      const items = Array.from(selectedIds)
        .map((userId) => {
          const amt = parseFloat(bulkAmounts[userId] || '');
          if (!amt || amt <= 0) return null;
          return { userId, amount: amt };
        })
        .filter(Boolean) as Array<{ userId: string; amount: number }>;
      if (items.length === 0) {
        alert('Enter amounts for at least one staff member');
        setBulkSaving(false);
        return;
      }
      await api.post('/salaries/bulk-pay', {
        month: Number(month),
        year: Number(year),
        paymentDate: new Date().toISOString(),
        items,
      });
      setBulkOpen(false);
      setSelectedIds(new Set());
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Salaries</h1>
          <p className="text-sm text-muted-foreground">Manage monthly staff salary payments</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(year)} onValueChange={v => setYear(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(month)} onValueChange={v => setMonth(v)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Salary ({months[Number(month) - 1]} {year})</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳ {totalSalary.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Paid Staff</CardTitle>
            <Check className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidCount} / {staff.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <X className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staff.length - paidCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Salary List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all unpaid"
                    checked={
                      staff.length > 0 &&
                      staff.filter((s) => !s.isPaid).every((s) => selectedIds.has(s.user.id))
                    }
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const next = new Set(selectedIds);
                      staff.forEach((s) => {
                        if (s.isPaid) return;
                        if (checked) next.add(s.user.id);
                        else next.delete(s.user.id);
                      });
                      setSelectedIds(next);
                    }}
                  />
                </TableHead>
                <TableHead>Staff Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid On</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s) => {
                const rowStatus = (s.status as SalaryStatus | undefined) || 'PENDING';
                return (
                  <TableRow key={s.user.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Select ${s.user.name}`}
                        disabled={s.isPaid}
                        checked={selectedIds.has(s.user.id)}
                        onChange={() => toggleSelected(s.user.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{s.user.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ROLE_LABELS[s.user.role] || s.user.role}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">৳ {(s.amount || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      {rowStatus === 'PAID' ? (
                        <Badge className="bg-green-600">Paid</Badge>
                      ) : rowStatus === 'CANCELLED' ? (
                        <Badge className="bg-red-600">Cancelled</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.paymentDate ? new Date(s.paymentDate).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={rowStatus === 'PAID' ? 'outline' : 'default'}
                        onClick={() => openPayDialog(s)}
                      >
                        {rowStatus === 'PAID' ? 'Edit' : 'Pay Now'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {staff.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No staff found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedIds.size > 0 && (
        <div className="sticky bottom-4 z-30 mx-auto flex max-w-2xl items-center justify-between rounded-lg border bg-background px-4 py-2 shadow-lg">
          <span className="text-sm">
            <strong>{selectedIds.size}</strong> staff selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
            <Button size="sm" onClick={openBulkPay}>
              Pay {selectedIds.size} now
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Pay Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk pay — {months[Number(month) - 1]} {year}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {staff
              .filter((s) => selectedIds.has(s.user.id))
              .map((s) => (
                <div key={s.user.id} className="flex items-center gap-3">
                  <span className="flex-1 text-sm">
                    {s.user.name}{' '}
                    <span className="text-muted-foreground">({ROLE_LABELS[s.user.role] || s.user.role})</span>
                  </span>
                  <Input
                    type="number"
                    className="w-32"
                    value={bulkAmounts[s.user.id] || ''}
                    onChange={(e) =>
                      setBulkAmounts({ ...bulkAmounts, [s.user.id]: e.target.value })
                    }
                    placeholder="Amount"
                  />
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkPay} disabled={bulkSaving}>
              {bulkSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark all as PAID
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Salary - {selectedStaff?.user.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount (৳)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as SalaryStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SALARY_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  disabled={status !== 'PAID'}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleSavePayment} disabled={saving || !amount}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}