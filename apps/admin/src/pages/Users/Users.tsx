import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { InitialsAvatar } from '@/components/ui/avatar';

const staffRoles = ['SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING', 'RESTAURANT_STAFF', 'ACCOUNTANT'];

const emptyForm = () => ({
  name: '',
  email: '',
  phone: '',
  password: '',
  currentPassword: '',
  role: 'RECEPTIONIST',
});

const Users: React.FC = () => {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm());

  const roleChoices = (() => {
    let roles =
      authUser?.role === 'SUPER_ADMIN'
        ? [...staffRoles]
        : staffRoles.filter((r) => r !== 'SUPER_ADMIN');
    // Preserve portal logins created from Shareholders
    if (editing?.role === 'SHAREHOLDER' || form.role === 'SHAREHOLDER') {
      if (!roles.includes('SHAREHOLDER')) roles = [...roles, 'SHAREHOLDER'];
    }
    return roles;
  })();

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(unwrapList(res, ['users']));
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };
  const openEdit = (u: any) => {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      password: '',
      currentPassword: '',
      role: u.role,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      alert('Name and email are required.');
      return;
    }
    if (!editing && !form.password.trim()) {
      alert('Password is required for new users.');
      return;
    }
    if (form.password && form.password.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    if (form.phone.trim() && form.phone.trim().length < 6) {
      alert('Phone must be at least 6 characters.');
      return;
    }
    const phone = form.phone.trim() || null;
    try {
      if (editing) {
        await api.put(`/users/${editing.id}`, {
          name: form.name,
          email: form.email,
          phone,
          role: form.role,
        });
        if (form.password) {
          const isSelf = authUser?.id === editing.id;
          if (isSelf) {
            await api.put(`/users/${editing.id}/password`, {
              currentPassword: form.currentPassword,
              newPassword: form.password,
            });
          } else {
            await api.put(`/users/${editing.id}/password`, { newPassword: form.password });
          }
        }
      } else {
        await api.post('/users', {
          name: form.name,
          email: form.email,
          phone,
          password: form.password,
          role: form.role,
        });
      }
      setOpen(false);
      fetchUsers();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    try { await api.delete(`/users/${id}`); fetchUsers(); } catch (err) { console.error(err); }
  };

  const roleColor = (r: string) => {
    switch (r) { case 'SUPER_ADMIN': return 'destructive'; case 'MANAGER': return 'default'; default: return 'secondary'; }
  };

  const editingSelf = editing && authUser?.id === editing.id;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Staff Management"
        description="Manage admin accounts, roles, and access."
        actions={
          <Button variant="default" onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add User</Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const lockSa = u.role === 'SUPER_ADMIN' && authUser?.role !== 'SUPER_ADMIN';
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2.5">
                        <InitialsAvatar name={u.name} className="h-8 w-8" />
                        {u.name}
                      </div>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.phone || '—'}</TableCell>
                    <TableCell><Badge variant={roleColor(u.role) as any}>{u.role}</Badge></TableCell>
                    <TableCell className="text-right">
                      {!lockSa && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit User' : 'Add User'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Optional"
              />
            </div>
            {!editing && (
              <div className="space-y-2"><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            )}
            {editing && (
              <>
                <div className="space-y-2"><Label>New password (optional)</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
                {editingSelf && form.password && (
                  <div className="space-y-2"><Label>Current password</Label><Input type="password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} /></div>
                )}
              </>
            )}
            <div className="space-y-2"><Label>Role</Label><Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roleChoices.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
