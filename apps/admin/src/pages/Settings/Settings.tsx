import React, { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save } from 'lucide-react';

const FIELD_KEYS = [
  'resortName',
  'resortAddress',
  'resortPhone',
  'resortEmail',
  'resortDescription',
  'checkInTime',
  'checkOutTime',
  'mapEmbedUrl',
] as const;

function emptySettingsRecord(): Record<string, string> {
  return FIELD_KEYS.reduce<Record<string, string>>((acc, k) => {
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
        const res = await api.get('/settings');
        const map = (res.data as { settings?: Record<string, string> })?.settings;
        const merged =
          map && typeof map === 'object' ? { ...defaults, ...map } : { ...defaults };
        setSettings(merged);
      } catch (err) {
        console.error(err);
        setMessage({ type: 'err', text: 'Failed to load settings.' });
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
      // Per-key upsert via existing API — reliable regardless of bulk route ordering.
      await Promise.all(
        FIELD_KEYS.map((key) =>
          api.put(`/settings/${encodeURIComponent(key)}`, {
            value: settings[key] ?? '',
          })
        )
      );
      const res = await api.get('/settings');
      const map = (res.data as { settings?: Record<string, string> })?.settings;
      const merged =
        map && typeof map === 'object' ? { ...defaults, ...map } : { ...defaults };
      setSettings(merged);
      setMessage({ type: 'ok', text: 'Settings saved successfully.' });
    } catch (err: unknown) {
      console.error(err);
      const ax = err as { response?: { data?: { message?: string } } };
      const msg =
        ax.response?.data?.message || 'Could not save settings. Check you are logged in as SUPER_ADMIN or MANAGER.';
      setMessage({ type: 'err', text: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const fields = [
    { key: 'resortName', label: 'Resort Name' },
    { key: 'resortAddress', label: 'Address' },
    { key: 'resortPhone', label: 'Phone' },
    { key: 'resortEmail', label: 'Email' },
    { key: 'resortDescription', label: 'Description', multiline: true },
    { key: 'checkInTime', label: 'Check-in Time' },
    { key: 'checkOutTime', label: 'Check-out Time' },
    { key: 'mapEmbedUrl', label: 'Map Embed URL' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}</Button>
      </div>
      {message && (
        <p className={`text-sm rounded-md px-3 py-2 ${message.type === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </p>
      )}
      <Card>
        <CardHeader><CardTitle>Resort Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label>{field.label}</Label>
              {field.multiline ? (
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={settings[field.key] ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
              ) : (
                <Input value={settings[field.key] ?? ''} onChange={(e) => handleChange(field.key, e.target.value)} />
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
