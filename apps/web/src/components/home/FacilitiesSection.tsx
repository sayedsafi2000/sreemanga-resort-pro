'use client';

import { Droplets, UtensilsCrossed, Trees, Dumbbell, Car, Wifi } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import Container from '@/components/ui/Container';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReveal, useRevealGroup } from '@/hooks/useReveal';

const items = [
  { icon: Droplets,        key: 'pool',       num: '01' },
  { icon: UtensilsCrossed, key: 'restaurant',  num: '02' },
  { icon: Trees,           key: 'garden',      num: '03' },
  { icon: Dumbbell,        key: 'wellness',    num: '04' },
  { icon: Car,             key: 'transport',   num: '05' },
  { icon: Wifi,            key: 'wifi',        num: '06' },
];

export default function FacilitiesSection() {
  const { tr } = useLanguage();
  const { ref: headRef, visible: headVisible } = useReveal<HTMLDivElement>();
  const { ref: gridRef, visible: gridVisible } = useRevealGroup<HTMLDivElement>();

  return (
    <section className="relative overflow-hidden bg-stone-warm py-12 sm:py-16">
      <div className="pointer-events-none absolute inset-0 grain opacity-30" aria-hidden />
      <div
        className="pointer-events-none absolute -right-32 top-0 h-96 w-96 rounded-full bg-forest-200/25 blur-[100px]"
        aria-hidden
      />

      <Container className="relative z-10">
        <div ref={headRef} className={`reveal ${headVisible ? 'visible' : ''}`}>
          <SectionHeading
            eyebrow={tr('facilities', 'eyebrow')}
            title={tr('facilities', 'title')}
            subtitle={tr('facilities', 'subtitle')}
            decorate
          />
        </div>

        <div ref={gridRef} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, key, num }, i) => (
            <div
              key={key}
              className={`reveal ${gridVisible ? 'visible' : ''} group relative overflow-hidden rounded-2xl border border-forest-100/70 bg-white/80 p-6 shadow-card backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-forest-200 hover:shadow-card-hover`}
              style={{ transitionDelay: gridVisible ? `${i * 80}ms` : '0ms' }}
            >
              {/* Faint number watermark */}
              <span
                className="pointer-events-none absolute -right-2 -top-3 select-none font-display text-7xl font-bold text-forest-100/50"
                aria-hidden
              >
                {num}
              </span>

              {/* Icon — pops on card hover */}
              <span className="relative inline-flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-forest-100 to-forest-200/60 text-forest-800 shadow-inner-forest ring-1 ring-forest-200/80 transition-all duration-300 group-hover:scale-110 group-hover:from-forest-200 group-hover:to-forest-300/50 group-hover:rotate-[-6deg]">
                <Icon className="h-6 w-6" strokeWidth={1.6} aria-hidden />
              </span>

              <h3 className="relative mt-4 font-display text-lg font-semibold text-stone-900">
                {tr('facilities', key)}
              </h3>
              <p className="relative mt-1.5 text-sm leading-relaxed text-stone-500">
                {tr('facilities', (key + 'Desc') as Parameters<typeof tr>[1])}
              </p>

              {/* Bottom accent bar — slides in on hover */}
              <div className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-forest-400 to-forest-700 transition-transform duration-300 group-hover:scale-x-100" />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
