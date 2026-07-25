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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Eye, Star } from 'lucide-react';
import { marked } from 'marked';
import { PageHeader } from '@/components/ui/page-header';

marked.setOptions({ breaks: true, gfm: true });

const renderMarkdown = (md: string): string => {
  try {
    return marked.parse(md ?? '', { async: false }) as string;
  } catch {
    return md;
  }
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

type BlogRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  imageUrl: string;
  category: string;
  authorName: string;
  tags: string[];
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
};

const BlogCard: React.FC<{ blog: BlogRow }> = ({ blog }) => (
  <Card className="overflow-hidden">
    <div className="aspect-[16/9] relative bg-stone-100">
      <img src={blog.imageUrl} alt={blog.title} className="w-full h-full object-cover" />
      {blog.isFeatured && (
        <Badge className="absolute top-2 right-2 bg-amber-500">
          <Star className="h-3 w-3 mr-1" /> Featured
        </Badge>
      )}
    </div>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline">{blog.category}</Badge>
        {blog.tags.slice(0, 2).map(t => (
          <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
        ))}
      </div>
      <h3 className="font-semibold text-lg line-clamp-2">{blog.title}</h3>
      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{blog.summary}</p>
      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <span>{blog.authorName}</span>
        <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
      </div>
    </CardContent>
  </Card>
);

const Blogs: React.FC = () => {
  const { user } = useAuth();
  const isSuper = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';
  const [items, setItems] = useState<BlogRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BlogRow | null>(null);
  const [viewing, setViewing] = useState<BlogRow | null>(null);
  const [form, setForm] = useState({
    slug: '',
    title: '',
    summary: '',
    content: '',
    imageUrl: '',
    category: 'General',
    authorName: "Nirjon Nature's Hideout",
    tags: '',
    sortOrder: '0',
    isActive: true,
    isFeatured: false,
  });

  const fetchAll = async () => {
    if (!isSuper) return;
    try {
      const res = await api.get('/blogs');
      setItems(unwrapList(res, ['blogs']) as BlogRow[]);
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
      slug: '',
      title: '',
      summary: '',
      content: '',
      imageUrl: '',
      category: 'General',
      authorName: user?.name || "Nirjon Nature's Hideout",
      tags: '',
      sortOrder: String(items.length ? Math.max(...items.map((i) => i.sortOrder)) + 1 : 0),
      isActive: true,
      isFeatured: false,
    });
    setOpen(true);
  };

  const openEdit = (item: BlogRow) => {
    setEditing(item);
    setForm({
      slug: item.slug,
      title: item.title,
      summary: item.summary,
      content: item.content,
      imageUrl: item.imageUrl,
      category: item.category,
      authorName: item.authorName,
      tags: item.tags.join(', '),
      sortOrder: String(item.sortOrder),
      isActive: item.isActive,
      isFeatured: item.isFeatured,
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
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
        sortOrder: Number(form.sortOrder),
      };
      if (editing) {
        await api.put(`/blogs/${editing.id}`, payload);
      } else {
        await api.post('/blogs', payload);
      }
      setOpen(false);
      void fetchAll();
    } catch (e) {
      console.error(e);
      alert('Save failed. Check image size (large base64 may hit server limit).');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this blog?')) return;
    try {
      await api.delete(`/blogs/${id}`);
      void fetchAll();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isSuper) return <div>Access denied</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content"
        title="Blog Posts"
        description="Manage articles and news shown on the public website."
        actions={
          <Button variant="default" onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New Blog</Button>
        }
      />

      {/* Blog Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((blog) => (
          <div key={blog.id} className="relative group">
            <BlogCard blog={blog} />
            <div className="absolute top-2 left-2 right-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
              <Button size="sm" variant="secondary" onClick={() => setViewing(blog)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => openEdit(blog)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleDelete(blog.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Blog' : 'New Blog'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Blog title" />
            </div>
            <div className="grid gap-2">
              <Label>Slug (URL)</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} placeholder="blog-url-slug" />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="General" />
            </div>
            <div className="grid gap-2">
              <Label>Summary (Short description)</Label>
              <Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Brief summary for cards..." rows={3} />
            </div>
            <div className="grid gap-2">
              <Label>Content (Full article)</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Write markdown here. Use **bold**, *italic*, [links](url), and lists." rows={8} />
              <details className="rounded border bg-muted/30">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Markdown preview</summary>
                <div
                  className="prose prose-sm max-w-none px-3 py-2"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(form.content) }}
                />
              </details>
            </div>
            <div className="grid gap-2">
              <Label>Featured Image</Label>
              <Input type="file" accept="image/*" onChange={(e) => void handleFile(e.target.files?.[0])} />
              <p className="text-xs text-muted-foreground">Or paste URL / data URL below (e.g. /gallery/photo.jpg from your web app).</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="b-imgurl">Image URL or data URL</Label>
              <textarea
                id="b-imgurl"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://... or /path/from/site or data:image/..."
              />
              {form.imageUrl && (
                <div className="mt-2 rounded-md border p-1">
                  <img src={form.imageUrl} alt="Preview" className="h-32 w-full object-cover rounded" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Author</Label>
                <Input value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Tags (comma separated)</Label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="tea, nature, travel" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
                <Label>Featured</Label>
              </div>
              <div className="grid gap-2">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewing && (
            <>
              <img src={viewing.imageUrl} alt={viewing.title} className="w-full h-64 object-cover rounded-lg" />
              <div className="flex items-center gap-2 mt-4">
                <Badge>{viewing.category}</Badge>
                {viewing.tags.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
              </div>
              <h2 className="text-2xl font-bold mt-2">{viewing.title}</h2>
              <p className="text-muted-foreground">By {viewing.authorName} · {new Date(viewing.createdAt).toLocaleDateString()}</p>
              <div
                className="prose max-w-none mt-4"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(viewing.content) }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Blogs;