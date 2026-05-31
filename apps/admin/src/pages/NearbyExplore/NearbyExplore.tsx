import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

const SECTION_KEYS = [
  'nearbySectionEyebrow',
  'nearbySectionTitle',
  'nearbySectionSubtitle',
  'nearbySectionFootnote',
] as const;

type SpotRow = {
  id: string;
  slug: string;
  title: string;
  emoji: string;
  badge: string;
  distance: string;
  bullets: string[];
  bestFor: string;
  imageUrl: string;
  imageAlt: string;
  body: string;
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

const publicSiteBase =
  (typeof import.meta.env.VITE_PUBLIC_SITE_URL === 'string' && import.meta.env.VITE_PUBLIC_SITE_URL.trim()) ||
  'http://localhost:3002';

const NearbyExplore: React.FC = () => {
  const { user } = useAuth();
  const isSuper = user?.role === 'SUPER_ADMIN';
  const [items, setItems] = useState<SpotRow[]>([]);
  const [section, setSection] = useState({
    nearbySectionEyebrow: '',
    nearbySectionTitle: '',
    nearbySectionSubtitle: '',
    nearbySectionFootnote: '',
  });
  const [sectionSaving, setSectionSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SpotRow | null>(null);
  const [form, setForm] = useState({
    slug: '',
    title: '',
    emoji: '',
    badge: '',
    distance: '',
    bulletsText: '',
    bestFor: '',
    imageUrl: '',
    imageAlt: '',
    body: '',
    sortOrder: '0',
    isActive: true,
  });

  const loadSettings = async () => {
    const res = await api.get('/public/settings');
    const map = (res.data as { settings?: Record<string, string> })?.settings ?? {};
    setSection({
      nearbySectionEyebrow: map.nearbySectionEyebrow ?? '',
      nearbySectionTitle: map.nearbySectionTitle ?? '',
      nearbySectionSubtitle: map.nearbySectionSubtitle ?? '',
      nearbySectionFootnote: map.nearbySectionFootnote ?? '',
    });
  };

  const fetchSpots = async () => {
    const res = await api.get('/nearby-spots');
    setItems(unwrapList(res, ['items']) as SpotRow[]);
  };

  const fetchAll = async () => {
    try {
      await Promise.all([fetchSpots(), loadSettings()]);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isSuper) void fetchAll();
  }, [isSuper]);

  const saveSection = async () => {
    setSectionSaving(true);
    try {
      await Promise.all(
        SECTION_KEYS.map((key) =>
          api.put(`/settings/${encodeURIComponent(key)}`, {
            value: section[key] ?? '',
          })
        )
      );
      await loadSettings();
      alert('Section headings saved.');
    } catch (e) {
      console.error(e);
      alert('Could not save section text.');
    } finally {
      setSectionSaving(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm({
      slug: '',
      title: '',
      emoji: '',
      badge: '',
      distance: '',
      bulletsText: '',
      bestFor: '',
      imageUrl: '',
      imageAlt: '',
      body: '',
      sortOrder: String(items.length ? Math.max(...items.map((i) => i.sortOrder)) + 1 : 0),
      isActive: true,
    });
    setOpen(true);
  };

  const openEdit = (row: SpotRow) => {
    setEditing(row);
    setForm({
      slug: row.slug,
      title: row.title,
      emoji: row.emoji,
      badge: row.badge,
      distance: row.distance,
      bulletsText: (row.bullets || []).join('\n'),
      bestFor: row.bestFor,
      imageUrl: row.imageUrl,
      imageAlt: row.imageAlt,
      body: row.body,
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

  const parseBullets = (text: string) =>
    text
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

  const handleSaveSpot = async () => {
    if (!form.imageUrl.trim()) {
      alert('Image URL or upload is required.');
      return;
    }
    if (!editing && !form.slug.trim()) {
      alert('Slug is required (e.g. lawachara-national-park). Lowercase, hyphens only.');
      return;
    }
    const bullets = parseBullets(form.bulletsText);
    const payload = {
      title: form.title.trim(),
      emoji: form.emoji.trim(),
      badge: form.badge.trim(),
      distance: form.distance.trim(),
      bullets,
      bestFor: form.bestFor.trim(),
      imageUrl: form.imageUrl.trim(),
      imageAlt: form.imageAlt.trim(),
      body: form.body,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };
    try {
      if (editing) {
        await api.put(`/nearby-spots/${editing.id}`, payload);
      } else {
        await api.post('/nearby-spots', { ...payload, slug: form.slug.trim().toLowerCase() });
      }
      setOpen(false);
      await fetchSpots();
    } catch (e) {
      console.error(e);
      alert('Save failed. Check slug is unique and valid (lowercase letters, numbers, hyphens).');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this place from the public site?')) return;
    try {
      await api.delete(`/nearby-spots/${id}`);
      await fetchSpots();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isSuper) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Only Super Admin can manage nearby explore spots.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content"
        title="Nearby Explore"
        description="Section title and footnote appear on the home page; each spot appears in the carousel and has its own page at /explore/[slug] on the guest website."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Section text (home page)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Eyebrow</Label>
              <Input
                value={section.nearbySectionEyebrow}
                onChange={(e) => setSection((s) => ({ ...s, nearbySectionEyebrow: e.target.value }))}
                placeholder="Explore · আশেপাশে"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Main title</Label>
              <Input
                value={section.nearbySectionTitle}
                onChange={(e) => setSection((s) => ({ ...s, nearbySectionTitle: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Subtitle</Label>
              <Textarea
                rows={3}
                value={section.nearbySectionSubtitle}
                onChange={(e) => setSection((s) => ({ ...s, nearbySectionSubtitle: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Footnote (small text under carousel)</Label>
              <Textarea
                rows={2}
                value={section.nearbySectionFootnote}
                onChange={(e) => setSection((s) => ({ ...s, nearbySectionFootnote: e.target.value }))}
              />
            </div>
          </div>
          <Button type="button" onClick={() => void saveSection()} disabled={sectionSaving}>
            {sectionSaving ? 'Saving…' : 'Save section text'}
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Places</h2>
        <Button variant="ink" onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add place
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Preview</TableHead>
                <TableHead>Title / slug</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="relative h-14 w-14 overflow-hidden rounded-md border bg-muted">
                      <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{row.title}</div>
                    <div className="text-xs text-muted-foreground">{row.slug}</div>
                  </TableCell>
                  <TableCell>{row.sortOrder}</TableCell>
                  <TableCell>{row.isActive ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" asChild title="Open on site">
                      <a
                        href={`${String(publicSiteBase).replace(/\/$/, '')}/explore/${row.slug}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => void handleDelete(row.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No spots yet. Seed the database or add places here.</p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit place' : 'Add place'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Slug (URL)</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                disabled={!!editing}
                placeholder="lawachara-national-park"
              />
              <p className="text-xs text-muted-foreground mt-1">Lowercase, numbers, single hyphens. Cannot change after create.</p>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Emoji (optional)</Label>
                <Input value={form.emoji} onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))} />
              </div>
              <div>
                <Label>Badge</Label>
                <Input value={form.badge} onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Distance line</Label>
              <Input value={form.distance} onChange={(e) => setForm((f) => ({ ...f, distance: e.target.value }))} />
            </div>
            <div>
              <Label>Bullets (one per line)</Label>
              <Textarea rows={4} value={form.bulletsText} onChange={(e) => setForm((f) => ({ ...f, bulletsText: e.target.value }))} />
            </div>
            <div>
              <Label>Best for (short line)</Label>
              <Input value={form.bestFor} onChange={(e) => setForm((f) => ({ ...f, bestFor: e.target.value }))} />
            </div>
            <div>
              <Label>Image</Label>
              <Input type="file" accept="image/*" className="mb-2" onChange={(e) => void handleFile(e.target.files?.[0])} />
              <Textarea rows={2} value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://… or paste /rooms/… or data URL" />
            </div>
            <div>
              <Label>Image alt</Label>
              <Input value={form.imageAlt} onChange={(e) => setForm((f) => ({ ...f, imageAlt: e.target.value }))} />
            </div>
            <div>
              <Label>Full description (detail page)</Label>
              <Textarea rows={10} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="Blank line between paragraphs." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sort order</Label>
                <Input value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  Active on site
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveSpot()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NearbyExplore;
