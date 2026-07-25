import React, { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

type Dept = { id: string; name: string; _count?: { staff: number; designations: number } };
type Desig = { id: string; title: string; departmentId: string; department?: { name: string } };
type Staff = {
  id: string; employeeId?: string | null; basicSalary?: number | null; isActive: boolean;
  user?: { id: string; name: string; email: string }; department?: { name: string } | null; designation?: { title: string } | null;
};
type Shift = { id: string; name: string; startTime: string; endTime: string };
type AttRow = { staff: Staff; attendance: { id: string; status: string; checkIn?: string | null } | null };
type Leave = {
  id: string; type: string; startDate: string; endDate: string; totalDays: number; status: string; reason?: string | null;
  staff?: { user?: { name: string } };
};
type UserLite = { id: string; name: string; email: string; role: string };

const ATT_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE', 'HOLIDAY'];
const LEAVE_STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800', APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800', CANCELLED: 'bg-gray-100 text-gray-600',
};
const fmt = (n?: number | null) => (n != null ? `৳${n.toLocaleString()}` : '—');
const today = () => new Date().toISOString().slice(0, 10);

const StaffHR: React.FC = () => {
  const [tab, setTab] = useState<'directory' | 'departments' | 'shifts' | 'attendance' | 'leave'>('directory');
  const [depts, setDepts] = useState<Dept[]>([]);
  const [desigs, setDesigs] = useState<Desig[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [attDate, setAttDate] = useState(today());
  const [attRows, setAttRows] = useState<AttRow[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // dialogs
  const [deptOpen, setDeptOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [desigOpen, setDesigOpen] = useState(false);
  const [desigForm, setDesigForm] = useState({ title: '', departmentId: '' });
  const [shiftOpen, setShiftOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState({ name: '', startTime: '09:00', endTime: '17:00' });
  const [staffOpen, setStaffOpen] = useState(false);
  const [staffForm, setStaffForm] = useState<any>({ userId: '', employeeId: '', departmentId: '', designationId: '', basicSalary: '' });

  const loadCore = async () => {
    setLoading(true);
    try {
      const [d, dg, s, sh, u, lv, sum] = await Promise.all([
        api.get('/staff/departments'), api.get('/staff/designations'), api.get('/staff'),
        api.get('/staff/shifts'), api.get('/users'), api.get('/staff/leaves'),
        api.get('/staff/dashboard/summary'),
      ]);
      setDepts(unwrapList<Dept>(d, ['departments']));
      setDesigs(unwrapList<Desig>(dg, ['designations']));
      setStaff(unwrapList<Staff>(s, ['staff']));
      setShifts(unwrapList<Shift>(sh, ['shifts']));
      setUsers(unwrapList<UserLite>(u, ['users']));
      setLeaves(unwrapList<Leave>(lv, ['leaves']));
      setSummary(sum.data?.summary ?? null);
    } finally { setLoading(false); }
  };
  useEffect(() => { loadCore(); }, []);

  const loadAttendance = async (date: string) => {
    const r = await api.get(`/staff/attendance/today`);
    // 'today' endpoint always returns today; for arbitrary date, list + merge
    if (date === today()) { setAttRows(r.data?.rows ?? []); return; }
    const [staffRes, attRes] = await Promise.all([api.get('/staff?active=true'), api.get(`/staff/attendance?date=${date}`)]);
    const list = unwrapList<Staff>(staffRes, ['staff']);
    const att = unwrapList<any>(attRes, ['attendance']);
    const byStaff = new Map(att.map((a: any) => [a.staffId, a]));
    setAttRows(list.map((st) => ({ staff: st, attendance: byStaff.get(st.id) ?? null })));
  };
  useEffect(() => { if (tab === 'attendance') loadAttendance(attDate); /* eslint-disable-next-line */ }, [tab, attDate]);

  const usersWithoutProfile = useMemo(() => {
    const withProfile = new Set(staff.map((s) => s.user?.id));
    return users.filter((u) => u.role !== 'SHAREHOLDER' && !withProfile.has(u.id));
  }, [users, staff]);

  const err = (e: any) => setError(e?.response?.data?.message || 'Action failed');

  const saveDept = async () => { setSaving(true); setError(null); try { await api.post('/staff/departments', { name: deptName }); setDeptOpen(false); setDeptName(''); await loadCore(); } catch (e) { err(e); } finally { setSaving(false); } };
  const saveDesig = async () => { setSaving(true); setError(null); try { await api.post('/staff/designations', desigForm); setDesigOpen(false); await loadCore(); } catch (e) { err(e); } finally { setSaving(false); } };
  const saveShift = async () => { setSaving(true); setError(null); try { await api.post('/staff/shifts', shiftForm); setShiftOpen(false); await loadCore(); } catch (e) { err(e); } finally { setSaving(false); } };
  const saveStaff = async () => {
    setSaving(true); setError(null);
    try {
      await api.post('/staff', {
        userId: staffForm.userId, employeeId: staffForm.employeeId || null,
        departmentId: staffForm.departmentId || null, designationId: staffForm.designationId || null,
        basicSalary: staffForm.basicSalary === '' ? null : Number(staffForm.basicSalary),
      });
      setStaffOpen(false); await loadCore();
    } catch (e) { err(e); } finally { setSaving(false); }
  };

  const setAtt = async (staffId: string, status: string) => {
    await api.post('/staff/attendance/mark', { staffId, date: attDate, status });
    await loadAttendance(attDate);
    await loadCore();
  };
  const leaveAction = async (id: string, action: 'approve' | 'reject') => {
    await api.post(`/staff/leaves/${id}/${action}`);
    await loadCore();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Staff HR" description="Directory, departments, shifts, attendance and leave" />

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Total Staff</div><div className="text-2xl font-bold">{summary.totalStaff}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Present Today</div><div className="text-2xl font-bold text-green-700">{summary.presentToday}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">On Leave</div><div className="text-2xl font-bold text-amber-700">{summary.onLeaveToday}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Pending Leaves</div><div className="text-2xl font-bold text-blue-700">{summary.pendingLeaves}</div></CardContent></Card>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(['directory', 'departments', 'shifts', 'attendance', 'leave'] as const).map((t) => (
          <Button key={t} variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)} className="capitalize">{t}</Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : tab === 'directory' ? (
        <Card><CardContent className="p-4 space-y-4">
          <div className="flex justify-end"><Button onClick={() => { setStaffForm({ userId: usersWithoutProfile[0]?.id ?? '', employeeId: '', departmentId: '', designationId: '', basicSalary: '' }); setError(null); setStaffOpen(true); }} disabled={usersWithoutProfile.length === 0}><Plus className="h-4 w-4 mr-1" /> Add Staff</Button></div>
          <Table>
            <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>ID</TableHead><TableHead>Department</TableHead><TableHead>Designation</TableHead><TableHead>Salary</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {staff.map((s) => (
                <TableRow key={s.id}>
                  <TableCell><div className="font-medium">{s.user?.name}</div><div className="text-xs text-muted-foreground">{s.user?.email}</div></TableCell>
                  <TableCell>{s.employeeId ?? '—'}</TableCell>
                  <TableCell>{s.department?.name ?? '—'}</TableCell>
                  <TableCell>{s.designation?.title ?? '—'}</TableCell>
                  <TableCell>{fmt(s.basicSalary)}</TableCell>
                  <TableCell><Badge className={s.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>{s.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                </TableRow>
              ))}
              {staff.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No staff profiles yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent></Card>
      ) : tab === 'departments' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Departments</h3><Button size="sm" onClick={() => { setDeptName(''); setError(null); setDeptOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
            <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Staff</TableHead><TableHead>Roles</TableHead></TableRow></TableHeader>
              <TableBody>{depts.map((d) => (<TableRow key={d.id}><TableCell className="font-medium">{d.name}</TableCell><TableCell>{d._count?.staff ?? 0}</TableCell><TableCell>{d._count?.designations ?? 0}</TableCell></TableRow>))}
                {depts.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">None yet.</TableCell></TableRow>}</TableBody></Table>
          </CardContent></Card>
          <Card><CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Designations</h3><Button size="sm" onClick={() => { setDesigForm({ title: '', departmentId: depts[0]?.id ?? '' }); setError(null); setDesigOpen(true); }} disabled={depts.length === 0}><Plus className="h-4 w-4 mr-1" /> Add</Button></div>
            <Table><TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Department</TableHead></TableRow></TableHeader>
              <TableBody>{desigs.map((d) => (<TableRow key={d.id}><TableCell className="font-medium">{d.title}</TableCell><TableCell>{d.department?.name ?? '—'}</TableCell></TableRow>))}
                {desigs.length === 0 && <TableRow><TableCell colSpan={2} className="text-center py-6 text-muted-foreground">None yet.</TableCell></TableRow>}</TableBody></Table>
          </CardContent></Card>
        </div>
      ) : tab === 'shifts' ? (
        <Card><CardContent className="p-4 space-y-3">
          <div className="flex justify-end"><Button size="sm" onClick={() => { setShiftForm({ name: '', startTime: '09:00', endTime: '17:00' }); setError(null); setShiftOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Add Shift</Button></div>
          <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead></TableRow></TableHeader>
            <TableBody>{shifts.map((s) => (<TableRow key={s.id}><TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.startTime}</TableCell><TableCell>{s.endTime}</TableCell></TableRow>))}
              {shifts.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">None yet.</TableCell></TableRow>}</TableBody></Table>
        </CardContent></Card>
      ) : tab === 'attendance' ? (
        <Card><CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Label>Date</Label>
            <Input type="date" className="w-auto" value={attDate} onChange={(e) => setAttDate(e.target.value)} />
          </div>
          <Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Department</TableHead><TableHead>Check-in</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {attRows.map((row) => (
                <TableRow key={row.staff.id}>
                  <TableCell className="font-medium">{row.staff.user?.name}</TableCell>
                  <TableCell>{row.staff.department?.name ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.attendance?.checkIn ? new Date(row.attendance.checkIn).toLocaleTimeString() : '—'}</TableCell>
                  <TableCell>
                    <Select value={row.attendance?.status ?? ''} onValueChange={(v) => setAtt(row.staff.id, v)}>
                      <SelectTrigger className="w-[140px]"><SelectValue placeholder="Mark" /></SelectTrigger>
                      <SelectContent>{ATT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {attRows.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No active staff.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-4">
          <Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {leaves.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.staff?.user?.name ?? '—'}</TableCell>
                  <TableCell>{l.type}</TableCell>
                  <TableCell className="text-sm">{new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}</TableCell>
                  <TableCell>{l.totalDays}</TableCell>
                  <TableCell><Badge className={LEAVE_STATUS_COLOR[l.status]}>{l.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    {l.status === 'PENDING' && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" onClick={() => leaveAction(l.id, 'approve')}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => leaveAction(l.id, 'reject')}>Reject</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {leaves.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No leave requests.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}

      {/* Department dialog */}
      <Dialog open={deptOpen} onOpenChange={setDeptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Department</DialogTitle></DialogHeader>
          <div className="space-y-3"><div><Label>Name</Label><Input value={deptName} onChange={(e) => setDeptName(e.target.value)} /></div>{error && <p className="text-sm text-red-600">{error}</p>}</div>
          <DialogFooter><Button variant="outline" onClick={() => setDeptOpen(false)}>Cancel</Button><Button onClick={saveDept} disabled={saving || !deptName}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Designation dialog */}
      <Dialog open={desigOpen} onOpenChange={setDesigOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Designation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={desigForm.title} onChange={(e) => setDesigForm({ ...desigForm, title: e.target.value })} /></div>
            <div><Label>Department</Label>
              <Select value={desigForm.departmentId} onValueChange={(v) => setDesigForm({ ...desigForm, departmentId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDesigOpen(false)}>Cancel</Button><Button onClick={saveDesig} disabled={saving || !desigForm.title || !desigForm.departmentId}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift dialog */}
      <Dialog open={shiftOpen} onOpenChange={setShiftOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Shift</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={shiftForm.name} onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start</Label><Input type="time" value={shiftForm.startTime} onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })} /></div>
              <div><Label>End</Label><Input type="time" value={shiftForm.endTime} onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })} /></div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShiftOpen(false)}>Cancel</Button><Button onClick={saveShift} disabled={saving || !shiftForm.name}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff dialog */}
      <Dialog open={staffOpen} onOpenChange={setStaffOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Staff Profile</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>User Account</Label>
              <Select value={staffForm.userId} onValueChange={(v) => setStaffForm({ ...staffForm, userId: v })}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>{usersWithoutProfile.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Employee ID</Label><Input value={staffForm.employeeId} onChange={(e) => setStaffForm({ ...staffForm, employeeId: e.target.value })} /></div>
              <div><Label>Basic Salary</Label><Input type="number" value={staffForm.basicSalary} onChange={(e) => setStaffForm({ ...staffForm, basicSalary: e.target.value })} /></div>
              <div><Label>Department</Label>
                <Select value={staffForm.departmentId} onValueChange={(v) => setStaffForm({ ...staffForm, departmentId: v, designationId: '' })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Designation</Label>
                <Select value={staffForm.designationId} onValueChange={(v) => setStaffForm({ ...staffForm, designationId: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{desigs.filter((d) => d.departmentId === staffForm.departmentId).map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setStaffOpen(false)}>Cancel</Button><Button onClick={saveStaff} disabled={saving || !staffForm.userId}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffHR;
