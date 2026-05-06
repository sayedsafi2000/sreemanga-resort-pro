'use client';

import { Droplets, UtensilsCrossed, Trees, Dumbbell, Car, Wifi } from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import Container from '@/components/ui/Container';
import { useLanguage } from '@/contexts/LanguageContext';

const items = [
  { icon: Droplets, key: 'pool' },
  { icon: UtensilsCrossed, key: 'restaurant' },
  { icon: Trees, key: 'garden' },
  { icon: Dumbbell, key: 'wellness' },
  { icon: Car, key: 'transport' },
  { icon: Wifi, key: 'wifi' },
];

export default function FacilitiesSection() {
  const { tr } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-white py-10 sm:py-14 dark:bg-[#0a0f0c]">
      <div className="pointer-events-none absolute inset-0 grain opacity-40 dark:opacity-15" aria-hidden />
      <Container className="relative z-10">
        <SectionHeading
          eyebrow={tr('facilities', 'eyebrow')}
          title={tr('facilities', 'title')}
          subtitle={tr('facilities', 'subtitle')}
          decorate
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="group rounded-[1.65rem] border border-forest-100/90 bg-gradient-to-br from-white via-cream to-forest-50/40 p-6 shadow-card transition hover:-translate-y-1 hover:shadow-soft dark:border-stone-800 dark:from-[#141a16] dark:via-[#141a16] dark:to-[#161d16]"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-forest-100 to-forest-200/80 text-forest-900 shadow-inner transition group-hover:rotate-2 group-hover:scale-105 dark:from-[#243329] dark:to-[#2d4136] dark:text-forest-100">
                <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold text-stone-900 dark:text-[#e4e4e3]">{tr('facilities', key)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-[#a3a3a3]">{tr('facilities', key + 'Desc')}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
