import React, { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';

type FieldType = 'text' | 'textarea' | 'url' | 'email' | 'time' | 'tel';

type Field = {
  key: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  hint?: string;
};

type Section = {
  title: string;
  description?: string;
  fields: Field[];
};

const SECTIONS: Section[] = [
  {
    title: 'Branding',
    description: 'Public site name, tagline, logo and hero image.',
    fields: [
      { key: 'resortName', label: 'Resort Name' },
      { key: 'tagline', label: 'Tagline', placeholder: 'Nature retreat in Sreemangal' },
      { key: 'logoUrl', label: 'Logo URL', type: 'url', hint: 'Public URL to header logo image.' },
      { key: 'heroImage', label: 'Hero Image URL', type: 'url', hint: 'Public URL used as homepage hero / OG image.' },
    ],
  },
  {
    title: 'Contact',
    fields: [
      { key: 'resortAddress', label: 'Address' },
      { key: 'resortPhone', label: 'Phone', type: 'tel' },
      { key: 'resortEmail', label: 'Email', type: 'email' },
    ],
  },
  {
    title: 'Hours',
    fields: [
      { key: 'checkInTime', label: 'Check-in Time', type: 'time' },
      { key: 'checkOutTime', label: 'Check-out Time', type: 'time' },
    ],
  },
  {
    title: 'About',
    description: 'Long-form copy for the homepage and about sections.',
    fields: [
      { key: 'resortDescription', label: 'Short Description (admin only)', type: 'textarea' },
      { key: 'aboutShort', label: 'About — short (homepage)', type: 'textarea' },
      { key: 'aboutLong', label: 'About — long (about page)', type: 'textarea' },
    ],
  },
  {
    title: 'Restaurant',
    fields: [
      { key: 'restaurantTeaser', label: 'Restaurant Teaser', type: 'textarea', placeholder: 'Seasonal dishes with local ingredients...' },
    ],
  },
  {
    title: 'Map',
    fields: [
      { key: 'mapEmbedUrl', label: 'Google Maps Embed URL', type: 'url' },
    ],
  },
  {
    title: 'Payment Accounts',
    description: 'Shown to guests when they pick Instant payment in the manual booking flow.',
    fields: [
      { key: 'bkashNumber', label: 'bKash number', type: 'tel', placeholder: '017XXXXXXXX' },
      { key: 'bankAccountName', label: 'Bank account name' },
      { key: 'bankAccountNumber', label: 'Bank account number' },
      { key: 'bankName', label: 'Bank name' },
      { key: 'bankBranch', label: 'Bank branch' },
    ],
  },
  {
    title: 'Social',
    fields: [
      { key: 'socialFacebook', label: 'Facebook URL', type: 'url' },
      { key: 'socialInstagram', label: 'Instagram URL', type: 'url' },
      { key: 'socialYoutube', label: 'YouTube URL', type: 'url' },
    ],
  },
  {
    title: 'Testimonials',
    description: 'Up to three testimonials shown on the homepage. Quote + author required to render.',
    fields: [
      { key: 'testimonial1Quote', label: 'Testimonial 1 — Quote', type: 'textarea' },
      { key: 'testimonial1Author', label: 'Testimonial 1 — Author' },
      { key: 'testimonial1Role', label: 'Testimonial 1 — Role (optional)' },
      { key: 'testimonial2Quote', label: 'Testimonial 2 — Quote', type: 'textarea' },
      { key: 'testimonial2Author', label: 'Testimonial 2 — Author' },
      { key: 'testimonial2Role', label: 'Testimonial 2 — Role (optional)' },
      { key: 'testimonial3Quote', label: 'Testimonial 3 — Quote', type: 'textarea' },
      { key: 'testimonial3Author', label: 'Testimonial 3 — Author' },
      { key: 'testimonial3Role', label: 'Testimonial 3 — Role (optional)' },
    ],
  },
  {
    title: 'Bengali Translations',
    description: 'Optional Bengali variants of brand and about copy.',
    fields: [
      { key: 'site_name_bn', label: 'Resort Name (Bengali)' },
      { key: 'tagline_bn', label: 'Tagline (Bengali)' },
      { key: 'aboutShort_bn', label: 'About — short (Bengali)', type: 'textarea' },
      { key: 'aboutLong_bn', label: 'About — long (Bengali)', type: 'textarea' },
    ],
  },
];

const ALL_KEYS: string[] = SECTIONS.flatMap((s) => s.fields.map((f) => f.key));

function emptySettingsRecord(): Record<string, string> {
  return ALL_KEYS.reduce<Record<string, string>>((acc, k) => {
    acc[k] = '';
    return acc;
  }, {});
}

const Settings: React.FC = () => {
  const defaults = useMemo(() => emptySettingsRecord(), []);
  const [settings, setSettings] = useState<Record<string, string>>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Same key/value map as GET /api/settings; no auth required (avoids 403 if token hiccups).
        const res = await api.get('/public/settings');
        const map = (res.data as { settings?: Record<string, string> })?.settings;
        const merged =
          map && typeof map === 'object' ? { ...defaults, ...map } : { ...defaults };
        setSettings(merged);
      } catch (err: unknown) {
        console.error(err);
        const ax = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
        const detail =
          ax.response?.data?.message ||
          (ax.response?.status === 404
            ? 'API not found. Set VITE_API_URL to your API root (e.g. http://localhost:8000 or …/api).'
            : ax.message);
        setMessage({
          type: 'err',
          text: detail ? `Failed to load settings: ${detail}` : 'Failed to load settings.',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [defaults]);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await Promise.all(
        ALL_KEYS.map((key) =>
          api.put(`/settings/${encodeURIComponent(key)}`, {
            value: settings[key] ?? '',
          })
        )
      );
      const res = await api.get('/public/settings');
      const map = (res.data as { settings?: Record<string, string> })?.settings;
      const merged =
        map && typeof map === 'object' ? { ...defaults, ...map } : { ...defaults };
      setSettings(merged);
      setMessage({ type: 'ok', text: 'Settings saved successfully.' });
    } catch (err: unknown) {
      console.error(err);
      const ax = err as { response?: { data?: { message?: string } } };
      const msg =
        ax.response?.data?.message ||
        'Could not save settings. You must be logged in as SUPER_ADMIN (Settings API is restricted).';
      setMessage({ type: 'err', text: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div>
          <p className="eyebrow mb-1">Configuration</p>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Public site copy, contact, social, testimonials, Bengali translations.
          </p>
        </div>
        <Button variant="ink" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {message && (
        <p
          className={`text-sm rounded-md px-3 py-2 ${
            message.type === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </p>
      )}

      {SECTIONS.map((section, idx) => (
        <details key={section.title} open={idx < 3} className="rounded-lg border bg-background">
          <summary className="cursor-pointer px-4 py-3 text-base font-semibold hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex w-full items-center justify-between">
              <span>
                {section.title}
                {section.description && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    — {section.description}
                  </span>
                )}
              </span>
              <span className="text-muted-foreground text-xs">▾</span>
            </span>
          </summary>
          <div className="space-y-4 border-t px-4 py-4">
            {section.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                {field.type === 'textarea' ? (
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={settings[field.key] ?? ''}
                    placeholder={field.placeholder}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  />
                ) : (
                  <Input
                    type={field.type ?? 'text'}
                    value={settings[field.key] ?? ''}
                    placeholder={field.placeholder}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  />
                )}
                {field.hint && (
                  <p className="text-xs text-muted-foreground">{field.hint}</p>
                )}
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
};

export default Settings;
