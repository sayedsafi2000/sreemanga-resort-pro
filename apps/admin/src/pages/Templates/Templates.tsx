import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, Layers, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

type TemplateKey = 'template-one' | 'template-two' | 'template-three';

type TemplateMeta = {
  key: TemplateKey;
  name: string;
  description: string;
  features: string[];
  palette: string[];
};

const TEMPLATES: TemplateMeta[] = [
  {
    key: 'template-one',
    name: 'Classic Elegance',
    description:
      'A refined nature-first design with soft cream tones, card grids, and gentle scroll reveals. Warm, welcoming, and timeless.',
    features: [
      'Soft cream & forest-green palette',
      'Card-grid room layout',
      'Image collage about section',
      'Light, airy navbar',
      'Staggered scroll reveals',
    ],
    palette: ['#faf9f7', '#e3ebe3', '#527252', '#1a2d1a', '#e5a93b'],
  },
  {
    key: 'template-two',
    name: 'Immersive Premium',
    description:
      'A cinematic dark-mode experience with a fullscreen hero, dramatic editorial typography, bold split-section layouts, and gold accents.',
    features: [
      'Fullscreen dark cinematic hero',
      'Horizontal split room cards',
      'Masonry photo gallery',
      'Gold-accent typography',
      'Minimal dark navbar',
    ],
    palette: ['#09100a', '#060e07', '#e5a93b', '#eec672', '#ffffff'],
  },
  {
    key: 'template-three',
    name: 'Forest Awakening',
    description:
      'A super-animated nature journey with GSAP scroll image sequences, GSAP horizontal room exploration, clip-path reveals, and deep forest aesthetics.',
    features: [
      'GSAP 4-scene scroll image sequence hero',
      'GSAP horizontal room exploration',
      'Clip-path gallery wipe animations',
      'Floating pill navbar',
      'Nature amber & forest green palette',
    ],
    palette: ['#030d04', '#0a1b0c', '#3d7a4a', '#c8920c', '#e8f5e9'],
  },
];

function TemplatePalettePreview({ template }: { template: TemplateMeta }) {
  const isT2 = template.key === 'template-two';
  const isT3 = template.key === 'template-three';

  return (
    <div
      className={`relative h-36 w-full overflow-hidden rounded-lg ${
        isT3 ? 'bg-[#030d04]' : isT2 ? 'bg-[#09100a]' : 'bg-[#faf9f7]'
      }`}
    >
      {isT3 ? (
        /* Forest Awakening mock */
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a1b0c]/30 via-transparent to-[#030d04]/90" />
          {/* Floating pill nav */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[#030d04]/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-[#1a3a1e]">
            <div className="w-3 h-3 rounded-full bg-[#3d7a4a]" />
            <div className="h-1.5 w-12 rounded bg-white/40" />
            <div className="h-4 w-8 rounded-full bg-[#c8920c]" />
          </div>
          {/* Hero text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <div className="h-1.5 w-20 rounded bg-[#c8920c]/60" />
            <div className="h-5 w-32 rounded bg-white/80" />
            <div className="h-3 w-24 rounded bg-white/40 mt-0.5" />
          </div>
          {/* Image dots */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1">
            <div className="w-1 h-4 rounded-full bg-[#c8920c]" />
            <div className="w-1 h-1.5 rounded-full bg-white/25" />
            <div className="w-1 h-1.5 rounded-full bg-white/25" />
          </div>
          {/* BG grid */}
          <div className="absolute inset-0 -z-10 grid grid-cols-3 gap-px opacity-15">
            <div className="bg-[#0a1b0c]" />
            <div className="bg-[#1a3a1e]" />
            <div className="bg-[#0f2011]" />
          </div>
        </>
      ) : isT2 ? (
        /* Immersive Premium mock */
        <>
          {/* Simulated hero */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#09100a] via-[#09100a]/50 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <div className="mb-1.5 flex items-center gap-2">
              <div className="h-px w-5 bg-[#e5a93b]" />
              <div className="h-1.5 w-16 rounded bg-[#e5a93b]/70" />
            </div>
            <div className="h-4 w-36 rounded bg-white/90" />
            <div className="mt-1 h-2.5 w-24 rounded bg-white/50" />
            <div className="mt-3 flex gap-2">
              <div className="h-5 w-14 rounded-none bg-[#e5a93b]" />
              <div className="h-5 w-14 rounded-none border border-white/30 bg-transparent" />
            </div>
          </div>
          {/* Background image simulation */}
          <div className="absolute inset-0 -z-10 grid grid-cols-3 gap-px opacity-20">
            <div className="bg-forest-700" />
            <div className="bg-forest-800" />
            <div className="bg-forest-900" />
          </div>
        </>
      ) : (
        /* Classic Elegance mock */
        <>
          {/* Simulated navbar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between bg-white/90 px-4 py-2 shadow-sm">
            <div className="h-3 w-20 rounded bg-[#527252]" />
            <div className="flex gap-2">
              <div className="h-2.5 w-8 rounded bg-[#a6c2a6]" />
              <div className="h-2.5 w-8 rounded bg-[#a6c2a6]" />
              <div className="h-2.5 w-8 rounded bg-[#a6c2a6]" />
            </div>
          </div>
          {/* Simulated hero */}
          <div className="absolute top-8 left-0 right-0 h-16 bg-[#253f25]/80 flex flex-col justify-center px-4 gap-1">
            <div className="h-2 w-28 rounded bg-white/80" />
            <div className="h-1.5 w-20 rounded bg-white/50" />
          </div>
          {/* Simulated cards */}
          <div className="absolute bottom-0 left-0 right-0 flex gap-1.5 px-3 pb-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex-1 rounded bg-white shadow-sm">
                <div className="h-8 w-full rounded-t bg-[#a6c2a6]/40" />
                <div className="p-1">
                  <div className="h-1.5 w-full rounded bg-[#527252]/30" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const Templates: React.FC = () => {
  const [activeTemplate, setActiveTemplate] = useState<TemplateKey>('template-one');
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<TemplateKey | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/settings/activeTemplate')
      .then((res) => {
        if (cancelled) return;
        const value = res.data?.setting?.value as TemplateKey | undefined;
        if (value === 'template-two' || value === 'template-one') {
          setActiveTemplate(value);
        }
      })
      .catch(() => {
        // setting not yet created — defaults to template-one
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleActivate(key: TemplateKey) {
    if (key === activeTemplate || activating) return;
    setActivating(key);
    try {
      await api.put('/settings/activeTemplate', { value: key });
      setActiveTemplate(key);
      showToast('success', `"${TEMPLATES.find((t) => t.key === key)?.name}" is now active.`);
    } catch {
      showToast('error', 'Failed to activate template. Please try again.');
    } finally {
      setActivating(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Configuration"
        title="Website Templates"
        description="Choose the frontend design for your public website. Changes take effect immediately."
      />

      {/* Toast notification */}
      {toast && (
        <div
          className={`flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          {toast.message}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Info banner */}
          <div className="flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-700">
            <Layers className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            <span>
              Activating a template instantly changes the public website's visual design while all content,
              routes, and functionality remain unchanged.
            </span>
          </div>

          {/* Template cards */}
          <div className="grid gap-5 sm:grid-cols-2">
            {TEMPLATES.map((template) => {
              const isActive = template.key === activeTemplate;
              const isActivating = activating === template.key;

              return (
                <Card
                  key={template.key}
                  className={`relative overflow-hidden transition-all duration-200 ${
                    isActive
                      ? 'ring-2 ring-primary shadow-md'
                      : 'hover:shadow-md'
                  }`}
                >
                  {/* Active badge */}
                  {isActive && (
                    <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Active
                    </div>
                  )}

                  <CardContent className="p-5 space-y-4">
                    {/* Visual preview */}
                    <TemplatePalettePreview template={template} />

                    {/* Info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-foreground">{template.name}</h2>
                        {isActive && (
                          <Badge variant="secondary" className="text-[10px]">
                            Live
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {template.description}
                      </p>
                    </div>

                    {/* Feature list */}
                    <ul className="space-y-1.5">
                      {template.features.map((feat) => (
                        <li key={feat} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                          {feat}
                        </li>
                      ))}
                    </ul>

                    {/* Palette swatches */}
                    <div className="flex gap-1.5">
                      {template.palette.map((color) => (
                        <span
                          key={color}
                          className="h-5 w-5 shrink-0 rounded-full border border-black/10 shadow-sm"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>

                    {/* Action */}
                    <Button
                      className="w-full"
                      variant={isActive ? 'outline' : 'default'}
                      disabled={isActive || activating !== null}
                      onClick={() => handleActivate(template.key)}
                    >
                      {isActivating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Activating…
                        </>
                      ) : isActive ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Currently Active
                        </>
                      ) : (
                        'Activate Template'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Footer note */}
          <p className="text-xs text-muted-foreground">
            More templates can be added by the development team. Each template uses the same content,
            APIs, and backend — only the visual presentation layer changes.
          </p>
        </>
      )}
    </div>
  );
};

export default Templates;
