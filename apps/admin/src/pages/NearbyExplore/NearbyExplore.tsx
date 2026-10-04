import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { unwrapList } from '@/lib/apiResponse';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BiField } from '@/components/ui/bi-field';
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
  'nearbySectionEyebrow_bn',
  'nearbySectionTitle_bn',
  'nearbySectionSubtitle_bn',
  'nearbySectionFootnote_bn',
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
  titleBn?: string | null;
  badgeBn?: string | null;
  distanceBn?: string | null;
  bulletsBn?: string[] | null;
  bestForBn?: string | null;
  bodyBn?: string | null;
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
  const [section, setSection] = useState<Record<(typeof SECTION_KEYS)[number], string>>({
    nearbySectionEyebrow: '', nearbySectionTitle: '', nearbySectionSubtitle: '', nearbySectionFootnote: '',
    nearbySectionEyebrow_bn: '', nearbySectionTitle_bn: '', nearbySectionSubtitle_bn: '', nearbySectionFootnote_bn: '',
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
    titleBn: '', badgeBn: '', distanceBn: '', bulletsTextBn: '', bestForBn: '', bodyBn: '',
    sortOrder: '0',
    isActive: true,
  });

  const loadSettings = async () => {
    const res = await api.get('/public/settings');
    const map = (res.data as { settings?: Record<string, string> })?.settings ?? {};
    setSection(Object.fromEntries(SECTION_KEYS.map((k) => [k, map[k] ?? ''])) as Record<(typeof SECTION_KEYS)[number], string>);
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
      titleBn: '', badgeBn: '', distanceBn: '', bulletsTextBn: '', bestForBn: '', bodyBn: '',
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
      titleBn: row.titleBn ?? '', badgeBn: row.badgeBn ?? '', distanceBn: row.distanceBn ?? '',
      bulletsTextBn: (row.bulletsBn || []).join('\n'), bestForBn: row.bestForBn ?? '', bodyBn: row.bodyBn ?? '',
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
      titleBn: form.titleBn.trim(), badgeBn: form.badgeBn.trim(), distanceBn: form.distanceBn.trim(),
      bulletsBn: parseBullets(form.bulletsTextBn), bestForBn: form.bestForBn.trim(), bodyBn: form.bodyBn,
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
          <div className="space-y-4">
            <BiField label="Eyebrow" value={section.nearbySectionEyebrow} onChange={(v) => setSection((s) => ({ ...s, nearbySectionEyebrow: v }))} bn={section.nearbySectionEyebrow_bn} onChangeBn={(v) => setSection((s) => ({ ...s, nearbySectionEyebrow_bn: v }))} placeholder="Explore · Around" placeholderBn="ঘুরে দেখুন · আশেপাশে" />
            <BiField label="Main title" value={section.nearbySectionTitle} onChange={(v) => setSection((s) => ({ ...s, nearbySectionTitle: v }))} bn={section.nearbySectionTitle_bn} onChangeBn={(v) => setSection((s) => ({ ...s, nearbySectionTitle_bn: v }))} placeholder="Best places to explore around" placeholderBn="আশেপাশে ঘুরার সেরা জায়গা" />
            <BiField label="Subtitle" textarea rows={3} value={section.nearbySectionSubtitle} onChange={(v) => setSection((s) => ({ ...s, nearbySectionSubtitle: v }))} bn={section.nearbySectionSubtitle_bn} onChangeBn={(v) => setSection((s) => ({ ...s, nearbySectionSubtitle_bn: v }))} />
            <BiField label="Footnote (small text under carousel)" textarea rows={2} value={section.nearbySectionFootnote} onChange={(v) => setSection((s) => ({ ...s, nearbySectionFootnote: v }))} bn={section.nearbySectionFootnote_bn} onChangeBn={(v) => setSection((s) => ({ ...s, nearbySectionFootnote_bn: v }))} />
            <p className="text-xs text-muted-foreground">The website shows the English column when a visitor picks EN and the Bangla column for বাংলা. An empty Bangla box shows the built-in Bangla text.</p>
          </div>
          <Button type="button" onClick={() => void saveSection()} disabled={sectionSaving}>
            {sectionSaving ? 'Saving…' : 'Save section text'}
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Places</h2>
        <Button variant="default" onClick={openNew}>
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
            <BiField label="Title" required value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} bn={form.titleBn} onChangeBn={(v) => setForm((f) => ({ ...f, titleBn: v }))} placeholder="Lawachara National Park" placeholderBn="লাউয়াছড়া জাতীয় উদ্যান" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Emoji (optional)</Label>
                <Input value={form.emoji} onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <BiField label="Badge" value={form.badge} onChange={(v) => setForm((f) => ({ ...f, badge: v }))} bn={form.badgeBn} onChangeBn={(v) => setForm((f) => ({ ...f, badgeBn: v }))} placeholder="Must visit" placeholderBn="অবশ্যই দেখুন" />
              </div>
            </div>
            <BiField label="Distance line" value={form.distance} onChange={(v) => setForm((f) => ({ ...f, distance: v }))} bn={form.distanceBn} onChangeBn={(v) => setForm((f) => ({ ...f, distanceBn: v }))} placeholder="~8–12 km" placeholderBn="~৮–১২ কিমি" />
            <BiField label="Bullets (one per line)" textarea rows={4} value={form.bulletsText} onChange={(v) => setForm((f) => ({ ...f, bulletsText: v }))} bn={form.bulletsTextBn} onChangeBn={(v) => setForm((f) => ({ ...f, bulletsTextBn: v }))} hint="Keep the same number of lines in both columns so they match up." />
            <BiField label="Best for (short line)" value={form.bestFor} onChange={(v) => setForm((f) => ({ ...f, bestFor: v }))} bn={form.bestForBn} onChangeBn={(v) => setForm((f) => ({ ...f, bestForBn: v }))} />
            <div>
              <Label>Image</Label>
              <Input type="file" accept="image/*" className="mb-2" onChange={(e) => void handleFile(e.target.files?.[0])} />
              <Textarea rows={2} value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://… or paste /rooms/… or data URL" />
            </div>
            <div>
              <Label>Image alt</Label>
              <Input value={form.imageAlt} onChange={(e) => setForm((f) => ({ ...f, imageAlt: e.target.value }))} />
            </div>
            <BiField label="Full description (detail page)" textarea rows={10} value={form.body} onChange={(v) => setForm((f) => ({ ...f, body: v }))} bn={form.bodyBn} onChangeBn={(v) => setForm((f) => ({ ...f, bodyBn: v }))} placeholder="Blank line between paragraphs." placeholderBn="অনুচ্ছেদের মাঝে একটি খালি লাইন।" />
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
