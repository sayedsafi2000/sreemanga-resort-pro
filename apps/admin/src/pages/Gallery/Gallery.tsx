import React, { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, ImageIcon } from 'lucide-react';

type GalleryRow = {
  id: string;
  imageUrl: string;
  alt: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const Gallery: React.FC = () => {
  const { user } = useAuth();
  const isSuper = user?.role === 'SUPER_ADMIN';
  const [items, setItems] = useState<GalleryRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryRow | null>(null);
  const [form, setForm] = useState({
    imageUrl: '',
    alt: '',
    category: 'Nature',
    sortOrder: '0',
    isActive: true,
  });

  const categorySuggestions = useMemo(() => {
    const fromApi = new Set(categories);
    items.forEach((i) => fromApi.add(i.category));
    return Array.from(fromApi).filter(Boolean).sort();
  }, [categories, items]);

  const fetchAll = async () => {
    try {
      const [listRes, catRes] = await Promise.all([
        api.get('/gallery'),
        api.get('/gallery/categories'),
      ]);
      setItems(unwrapList(listRes, ['items']) as GalleryRow[]);
      setCategories(unwrapList(catRes, ['categories']) as string[]);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isSuper) void fetchAll();
  }, [isSuper]);

  const openNew = () => {
    setEditing(null);
    setForm({
      imageUrl: '',
      alt: '',
      category: 'Nature',
      sortOrder: String(items.length ? Math.max(...items.map((i) => i.sortOrder)) + 1 : 0),
      isActive: true,
    });
    setOpen(true);
  };

  const openEdit = (row: GalleryRow) => {
    setEditing(row);
    setForm({
      imageUrl: row.imageUrl,
      alt: row.alt,
      category: row.category,
      sortOrder: String(row.sortOrder),
      isActive: row.isActive,
    });
    setOpen(true);
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setForm((f) => ({ ...f, imageUrl: dataUrl }));
  };

  const handleSave = async () => {
    if (!form.imageUrl.trim()) {
      alert('Add an image file or paste image URL / data URL.');
      return;
    }
    const payload = {
      imageUrl: form.imageUrl.trim(),
      alt: form.alt.trim(),
      category: form.category.trim() || 'General',
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };
    try {
      if (editing) {
        await api.put(`/gallery/${editing.id}`, payload);
      } else {
        await api.post('/gallery', payload);
      }
      setOpen(false);
      await fetchAll();
    } catch (e) {
      console.error(e);
      alert('Save failed. Check image size (large base64 may hit server limit).');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this gallery image from the public site?')) return;
    try {
      await api.delete(`/gallery/${id}`);
      await fetchAll();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isSuper) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Only Super Admin can manage the public gallery.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Site gallery</h1>
          <p className="text-sm text-muted-foreground">
            Images appear on the public website gallery. Set <strong>category</strong> freely (used for filters) and{' '}
            <strong>sort order</strong> (lower = earlier). Upload file or paste a URL.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add image
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Preview</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Alt</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="relative h-16 w-16 overflow-hidden rounded-md border bg-muted">
                      <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.category}</Badge>
                  </TableCell>
                  <TableCell>{row.sortOrder}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{row.alt || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={row.isActive ? 'default' : 'secondary'}>{row.isActive ? 'Yes' : 'No'}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="icon" onClick={() => openEdit(row)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(row.id)} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    No gallery images yet. Add photos for the public gallery page.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit gallery image' : 'Add gallery image'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Image file</Label>
              <Input type="file" accept="image/*" onChange={(e) => void handleFile(e.target.files?.[0])} />
              <p className="text-xs text-muted-foreground">Or paste URL / data URL below (e.g. /gallery/photo.jpg from your web app).</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-url">Image URL or data URL</Label>
              <textarea
                id="g-url"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://... or /path/from/site or data:image/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-alt">Alt text (accessibility)</Label>
              <Input id="g-alt" value={form.alt} onChange={(e) => setForm((f) => ({ ...f, alt: e.target.value }))} placeholder="Short description" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-cat">Category</Label>
              <Input
                id="g-cat"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                list="gallery-category-suggestions"
                placeholder="Nature, Rooms, Dining, …"
              />
              <datalist id="gallery-category-suggestions">
                {categorySuggestions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-order">Sort order</Label>
              <Input
                id="g-order"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Lower numbers appear first in the grid.</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Visible on public site
            </label>
            {form.imageUrl && (
              <div className="flex items-center gap-2 rounded-md border p-2 text-xs text-muted-foreground">
                <ImageIcon className="h-4 w-4 shrink-0" />
                Preview
                <div className="relative ml-auto h-14 w-20 overflow-hidden rounded border">
                  <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Gallery;
