import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const Guests: React.FC = () => {
  const [guests, setGuests] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', nid: '', passport: '' });

  const fetchGuests = async () => {
    try {
      const res = await api.get('/guests');
      setGuests(unwrapList(res, ['guests']));
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchGuests(); }, []);

  const openNew = () => { setEditing(null); setForm({ name: '', email: '', phone: '', address: '', nid: '', passport: '' }); setOpen(true); };
  const openEdit = (g: any) => {
    setEditing(g);
    setForm({
      name: g.name,
      email: g.email || '',
      phone: g.phone,
      address: g.address || '',
      nid: g.nid || '',
      passport: g.passport || '',
    });
    setOpen(true);
  };

  const payload = () => ({
    name: form.name,
    phone: form.phone,
    address: form.address || undefined,
    email: form.email || undefined,
    nid: form.nid || undefined,
    passport: form.passport || undefined,
  });

  const handleSave = async () => {
    try {
      if (editing) { await api.put(`/guests/${editing.id}`, payload()); } else { await api.post('/guests', payload()); }
      setOpen(false); fetchGuests();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this guest?')) return;
    try { await api.delete(`/guests/${id}`); fetchGuests(); } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Guests</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Guest</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead>
                <TableHead>NID</TableHead><TableHead>Passport</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guests.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell>{g.email || '-'}</TableCell>
                  <TableCell>{g.phone}</TableCell>
                  <TableCell>{g.nid || '-'}</TableCell>
                  <TableCell>{g.passport || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(g)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {guests.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No guests found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Guest' : 'Add Guest'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>NID</Label><Input value={form.nid} onChange={(e) => setForm({ ...form, nid: e.target.value })} placeholder="Optional" /></div>
              <div className="space-y-2"><Label>Passport</Label><Input value={form.passport} onChange={(e) => setForm({ ...form, passport: e.target.value })} placeholder="Optional" /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Guests;
