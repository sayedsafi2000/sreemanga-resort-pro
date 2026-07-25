import React, { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Save, Building2, Phone, Clock, BookOpen, UtensilsCrossed,
  Map, CreditCard, Share2, MessageSquareQuote,
  CheckCircle2, AlertCircle, ChevronDown, Loader2, Globe,
} from 'lucide-react';

type FieldType = 'text' | 'textarea' | 'url' | 'email' | 'time' | 'tel';

type Field = {
  key: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  hint?: string;
  icon?: React.ReactNode;
};

type Section = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  fields: Field[];
};

const SECTIONS: Section[] = [
  {
    id: 'branding',
    title: 'Branding',
    description: 'Resort name, tagline and media assets',
    icon: <Building2 className="h-4 w-4" />,
    color: 'bg-violet-100 text-violet-600',
    fields: [
      { key: 'resortName', label: 'Resort Name', placeholder: "Nirjon Nature's Hideout" },
      { key: 'tagline', label: 'Tagline', placeholder: 'Nature retreat in Sreemangal' },
      { key: 'logoUrl', label: 'Logo URL', type: 'url', placeholder: 'https://…/logo.png', hint: 'Public URL to header logo image.' },
      { key: 'heroImage', label: 'Hero Image URL', type: 'url', placeholder: 'https://…/hero.jpg', hint: 'Used as homepage hero / OG share image.' },
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    description: 'Address, phone and email',
    icon: <Phone className="h-4 w-4" />,
    color: 'bg-emerald-100 text-emerald-600',
    fields: [
      { key: 'resortAddress', label: 'Address', placeholder: 'Sreemangal, Moulvibazar, Bangladesh' },
      { key: 'resortPhone', label: 'Phone', type: 'tel', placeholder: '+880 17XX-XXXXXX' },
      { key: 'resortEmail', label: 'Email', type: 'email', placeholder: 'info@yourresort.com' },
    ],
  },
  {
    id: 'hours',
    title: 'Check-in / Check-out',
    description: 'Guest arrival and departure times',
    icon: <Clock className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-600',
    fields: [
      { key: 'checkInTime', label: 'Check-in Time', type: 'time' },
      { key: 'checkOutTime', label: 'Check-out Time', type: 'time' },
    ],
  },
  {
    id: 'about',
    title: 'About',
    description: 'Homepage and about page copy',
    icon: <BookOpen className="h-4 w-4" />,
    color: 'bg-amber-100 text-amber-600',
    fields: [
      { key: 'resortDescription', label: 'Short Description (admin only)', type: 'textarea', placeholder: 'Internal note about the resort…' },
      { key: 'aboutShort', label: 'About — Short (homepage)', type: 'textarea', placeholder: 'One or two sentences for the homepage hero…' },
      { key: 'aboutLong', label: 'About — Long (about page)', type: 'textarea', placeholder: 'Full story of your resort, what makes it special…' },
    ],
  },
  {
    id: 'restaurant',
    title: 'Restaurant',
    description: 'Dining section teaser text',
    icon: <UtensilsCrossed className="h-4 w-4" />,
    color: 'bg-orange-100 text-orange-600',
    fields: [
      { key: 'restaurantTeaser', label: 'Restaurant Teaser', type: 'textarea', placeholder: 'Seasonal dishes with local ingredients served fresh every day.' },
    ],
  },
  {
    id: 'map',
    title: 'Map',
    description: 'Google Maps embed for contact page',
    icon: <Map className="h-4 w-4" />,
    color: 'bg-cyan-100 text-cyan-600',
    fields: [
      { key: 'mapEmbedUrl', label: 'Google Maps Embed URL', type: 'url', placeholder: 'https://www.google.com/maps/embed?pb=…', hint: 'Paste the embed src URL from Google Maps → Share → Embed a map.' },
    ],
  },
  {
    id: 'payment',
    title: 'Payment Accounts',
    description: 'Shown to guests during instant payment',
    icon: <CreditCard className="h-4 w-4" />,
    color: 'bg-pink-100 text-pink-600',
    fields: [
      { key: 'bkashNumber', label: 'bKash Number', type: 'tel', placeholder: '017XXXXXXXX' },
      { key: 'bankAccountName', label: 'Bank Account Name', placeholder: 'Resort Nirjon Ltd.' },
      { key: 'bankAccountNumber', label: 'Bank Account Number', placeholder: '1234567890' },
      { key: 'bankName', label: 'Bank Name', placeholder: 'Dutch-Bangla Bank' },
      { key: 'bankBranch', label: 'Bank Branch', placeholder: 'Sreemangal Branch' },
    ],
  },
  {
    id: 'social',
    title: 'Social Media',
    description: 'Links shown in footer and about page',
    icon: <Share2 className="h-4 w-4" />,
    color: 'bg-indigo-100 text-indigo-600',
    fields: [
      { key: 'socialFacebook', label: 'Facebook Page URL', type: 'url', placeholder: 'https://facebook.com/yourresort' },
      { key: 'socialInstagram', label: 'Instagram Profile URL', type: 'url', placeholder: 'https://instagram.com/yourresort' },
      { key: 'socialYoutube', label: 'YouTube Channel URL', type: 'url', placeholder: 'https://youtube.com/@yourresort' },
    ],
  },
  {
    id: 'testimonials',
    title: 'Testimonials',
    description: 'Up to 3 guest quotes on the homepage',
    icon: <MessageSquareQuote className="h-4 w-4" />,
    color: 'bg-teal-100 text-teal-600',
    fields: [
      { key: 'testimonial1Quote', label: 'Quote 1', type: 'textarea', placeholder: 'An amazing escape into nature...' },
      { key: 'testimonial1Author', label: 'Author 1', placeholder: 'Sarah Johnson' },
      { key: 'testimonial1Role', label: 'Role / Location 1 (optional)', placeholder: 'Traveler from Dhaka' },
      { key: 'testimonial2Quote', label: 'Quote 2', type: 'textarea', placeholder: 'The most peaceful stay we have ever had...' },
      { key: 'testimonial2Author', label: 'Author 2', placeholder: 'Rafiq Ahmed' },
      { key: 'testimonial2Role', label: 'Role / Location 2 (optional)', placeholder: 'Family from Chittagong' },
      { key: 'testimonial3Quote', label: 'Quote 3', type: 'textarea', placeholder: 'Highly recommended for nature lovers...' },
      { key: 'testimonial3Author', label: 'Author 3', placeholder: 'Mina Roy' },
      { key: 'testimonial3Role', label: 'Role / Location 3 (optional)', placeholder: 'Solo traveler' },
    ],
  },
];

const ALL_KEYS: string[] = SECTIONS.flatMap((s) => s.fields.map((f) => f.key));

function emptySettingsRecord(): Record<string, string> {
  return ALL_KEYS.reduce<Record<string, string>>((acc, k) => { acc[k] = ''; return acc; }, {});
}

/** Count how many fields in a section have a value */
function sectionFillCount(fields: Field[], settings: Record<string, string>): number {
  return fields.filter((f) => (settings[f.key] ?? '').trim().length > 0).length;
}

// ── Accordion Section ─────────────────────────────────────────────────────────
interface SectionCardProps {
  section: Section;
  settings: Record<string, string>;
  onChange: (key: string, value: string) => void;
  defaultOpen: boolean;
}

const SectionCard: React.FC<SectionCardProps> = ({ section, settings, onChange, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen);
  const filled = sectionFillCount(section.fields, settings);
  const total = section.fields.length;
  const allFilled = filled === total;
  const noneFilled = filled === 0;

  return (
    <div className={`rounded-2xl border bg-white transition-shadow ${open ? 'shadow-md' : 'shadow-sm hover:shadow-md'}`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        {/* Icon */}
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${section.color}`}>
          {section.icon}
        </div>

        {/* Title + description */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground leading-tight">{section.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{section.description}</p>
        </div>

        {/* Fill status pill */}
        <div className="flex items-center gap-2 shrink-0">
          {allFilled ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> Complete
            </span>
          ) : noneFilled ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
              <AlertCircle className="h-3 w-3" /> Empty
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              {filled}/{total}
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Progress bar */}
      <div className="mx-5 h-0.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${allFilled ? 'bg-emerald-500' : 'bg-primary'}`}
          style={{ width: `${(filled / total) * 100}%` }}
        />
      </div>

      {/* Body */}
      {open && (
        <div className="px-5 pb-5 pt-4">
          {/* Testimonials: 3-column card layout */}
          {section.id === 'testimonials' ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="rounded-xl border border-dashed border-border bg-muted/30 p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Testimonial {n}</p>
                  {['Quote', 'Author', 'Role'].map((sub) => {
                    const key = `testimonial${n}${sub}` as string;
                    const field = section.fields.find((f) => f.key === key);
                    if (!field) return null;
                    return (
                      <div key={key} className="space-y-1.5">
                        <Label className="text-xs">{sub}{sub === 'Role' ? ' (optional)' : ''}</Label>
                        {sub === 'Quote' ? (
                          <textarea
                            rows={3}
                            value={settings[key] ?? ''}
                            placeholder={field.placeholder}
                            onChange={(e) => onChange(key, e.target.value)}
                            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                          />
                        ) : (
                          <Input
                            value={settings[key] ?? ''}
                            placeholder={field.placeholder}
                            onChange={(e) => onChange(key, e.target.value)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : section.id === 'hours' ? (
            /* Hours: side-by-side */
            <div className="grid grid-cols-2 gap-4">
              {section.fields.map((field) => (
                <FieldRow key={field.key} field={field} value={settings[field.key] ?? ''} onChange={onChange} />
              ))}
            </div>
          ) : section.id === 'social' ? (
            /* Social: each with icon prefix */
            <div className="space-y-3">
              {section.fields.map((field) => {
                const brand = field.key.replace('social', '').toLowerCase();
                const brandColor: Record<string, string> = {
                  facebook: 'text-blue-600',
                  instagram: 'text-pink-600',
                  youtube: 'text-red-600',
                };
                return (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <Globe className={`h-3.5 w-3.5 ${brandColor[brand] ?? 'text-muted-foreground'}`} />
                      {field.label}
                    </Label>
                    <Input
                      type="url"
                      value={settings[field.key] ?? ''}
                      placeholder={field.placeholder}
                      onChange={(e) => onChange(field.key, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          ) : section.id === 'contact' ? (
            /* Contact: 1+2 grid */
            <div className="space-y-4">
              <FieldRow field={section.fields[0]} value={settings[section.fields[0].key] ?? ''} onChange={onChange} />
              <div className="grid grid-cols-2 gap-4">
                {section.fields.slice(1).map((field) => (
                  <FieldRow key={field.key} field={field} value={settings[field.key] ?? ''} onChange={onChange} />
                ))}
              </div>
            </div>
          ) : section.id === 'payment' ? (
            /* Payment: bkash full width + bank 2-col */
            <div className="space-y-4">
              <FieldRow field={section.fields[0]} value={settings[section.fields[0].key] ?? ''} onChange={onChange} />
              <div className="grid gap-4 sm:grid-cols-2">
                {section.fields.slice(1).map((field) => (
                  <FieldRow key={field.key} field={field} value={settings[field.key] ?? ''} onChange={onChange} />
                ))}
              </div>
            </div>
          ) : (
            /* Default: stacked */
            <div className="space-y-4">
              {section.fields.map((field) => (
                <FieldRow key={field.key} field={field} value={settings[field.key] ?? ''} onChange={onChange} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Single field row ──────────────────────────────────────────────────────────
function FieldRow({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string;
  onChange: (key: string, val: string) => void;
}) {
  const isFilled = value.trim().length > 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm">{field.label}</Label>
        {isFilled && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
      </div>
      {field.type === 'textarea' ? (
        <textarea
          rows={3}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
        />
      ) : (
        <Input
          type={field.type ?? 'text'}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      )}
      {field.hint && <p className="text-[11px] text-muted-foreground">{field.hint}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const Settings: React.FC = () => {
  const defaults = useMemo(() => emptySettingsRecord(), []);
  const [settings, setSettings] = useState<Record<string, string>>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/public/settings');
        const map = (res.data as { settings?: Record<string, string> })?.settings;
        setSettings(map && typeof map === 'object' ? { ...defaults, ...map } : { ...defaults });
      } catch (err: unknown) {
        const ax = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
        const detail = ax.response?.data?.message || (ax.response?.status === 404 ? 'API not found.' : ax.message);
        setMessage({ type: 'err', text: detail ? `Failed to load: ${detail}` : 'Failed to load settings.' });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [defaults]);

  const handleChange = (key: string, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await Promise.all(
        ALL_KEYS.map((key) => api.put(`/settings/${encodeURIComponent(key)}`, { value: settings[key] ?? '' }))
      );
      const res = await api.get('/public/settings');
      const map = (res.data as { settings?: Record<string, string> })?.settings;
      setSettings(map && typeof map === 'object' ? { ...defaults, ...map } : { ...defaults });
      setMessage({ type: 'ok', text: 'All settings saved successfully.' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setMessage({ type: 'err', text: ax.response?.data?.message || 'Could not save. Must be SUPER_ADMIN.' });
    } finally {
      setSaving(false);
    }
  };

  // Overall completion
  const totalFilled = ALL_KEYS.filter((k) => (settings[k] ?? '').trim().length > 0).length;
  const overallPct = Math.round((totalFilled / ALL_KEYS.length) * 100);

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 -mx-4 bg-background/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-1">Configuration</p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Site Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure your public website content, contact info, and integrations.
            </p>
          </div>
          <Button variant="default" onClick={handleSave} disabled={saving} className="shrink-0">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? 'Saving…' : 'Save All'}
          </Button>
        </div>

        {/* Overall progress bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <span className="text-xs font-semibold tabular text-muted-foreground w-10 text-right">{overallPct}%</span>
        </div>
      </div>

      {/* ── Status message ─────────────────────────────────────────────── */}
      {message && (
        <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium ${
          message.type === 'ok'
            ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border border-red-200 bg-red-50 text-red-700'
        }`}>
          {message.type === 'ok'
            ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            : <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          }
          {message.text}
        </div>
      )}

      {/* ── Sections ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {SECTIONS.map((section, idx) => (
          <SectionCard
            key={section.id}
            section={section}
            settings={settings}
            onChange={handleChange}
            defaultOpen={idx < 2}
          />
        ))}
      </div>

      {/* ── Bottom save ────────────────────────────────────────────────── */}
      <div className="flex justify-end pt-2">
        <Button variant="default" size="lg" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {saving ? 'Saving…' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
