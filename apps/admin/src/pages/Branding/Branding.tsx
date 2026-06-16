import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Image as ImageIcon, Building2, Phone, Mail, MapPin } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/ui/page-header';

interface BrandingSettings {
  site_name: string;
  site_tagline: string;
  site_logo: string;
  site_favicon: string;
  contact_phone: string;
  contact_email: string;
  contact_location: string;
}

const Branding = () => {
  const [settings, setSettings] = useState<BrandingSettings>({
    site_name: 'Pina Vista',
    site_tagline: 'A Nature Resort',
    site_logo: '',
    site_favicon: '',
    contact_phone: '+880 XXX-XXXXXX',
    contact_email: 'info@resortnirjon.com',
    contact_location: 'Sreemangal, Bangladesh',
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/branding');
      if (response.data?.settings) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Failed to load branding settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: keyof BrandingSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'favicon') => {
    if (!file) return;

    const setUploading = type === 'logo' ? setUploadingLogo : setUploadingFavicon;
    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        handleInputChange(type === 'logo' ? 'site_logo' : 'site_favicon', base64);
        setUploading(false);
      };
      reader.onerror = () => {
        alert('Failed to read file');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert('Failed to upload image');
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/branding', settings);
      alert('Branding settings saved successfully!');
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration"
        title="Branding & Identity"
        description="Customize your resort's name, logo, and contact information across all platforms."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Site Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Resort Name *</Label>
              <Input
                value={settings.site_name}
                onChange={(e) => handleInputChange('site_name', e.target.value)}
                placeholder="e.g., Nirjon Nature's Hideout"
              />
              <p className="text-xs text-muted-foreground">
                This will appear in the sidebar and throughout the platform
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input
                value={settings.site_tagline}
                onChange={(e) => handleInputChange('site_tagline', e.target.value)}
                placeholder="e.g., A Nature Resort"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                value={settings.contact_phone}
                onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                placeholder="+880 XXX-XXXXXX"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                type="email"
                value={settings.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                placeholder="info@resortnirjon.com"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </Label>
              <Input
                value={settings.contact_location}
                onChange={(e) => handleInputChange('contact_location', e.target.value)}
                placeholder="Sreemangal, Bangladesh"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Site Logo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.site_logo && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <img
                  src={settings.site_logo}
                  alt="Site Logo"
                  className="mx-auto max-h-24 w-auto object-contain"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Upload Logo</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, 'logo');
                }}
                disabled={uploadingLogo}
              />
              <p className="text-xs text-muted-foreground">
                Recommended: PNG with transparent background, max 200KB
              </p>
            </div>

            {uploadingLogo && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Favicon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.site_favicon && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <img
                  src={settings.site_favicon}
                  alt="Favicon"
                  className="mx-auto h-16 w-16 object-contain"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Upload Favicon</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, 'favicon');
                }}
                disabled={uploadingFavicon}
              />
              <p className="text-xs text-muted-foreground">
                32x32px or 64x64px PNG/ICO
              </p>
            </div>

            {uploadingFavicon && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || uploadingLogo || uploadingFavicon}
          size="lg"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default Branding;
