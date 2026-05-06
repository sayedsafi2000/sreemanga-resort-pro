'use client';

import Link from 'next/link';
import Image from 'next/image';
import SectionHeading from '@/components/SectionHeading';
import Container from '@/components/ui/Container';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MenuItem } from '@/types/resort';
import { cn } from '@/lib/utils';
import diningPhoto from '@/assets/484791845_630037146473973_4981468135839957015_n.jpg';

type Props = {
  teaser: string;
  highlights: MenuItem[];
};

export default function RestaurantPreview({ teaser, highlights }: Props) {
  const { t, tr } = useLanguage();
  const displayTeaser = teaser.includes('Seasonal') ? tr('restaurant', 'teaser') : t(teaser, teaser);

  return (
    <section className="relative overflow-hidden bg-[#0f2d18] py-10 text-white sm:py-14">
      <div
        className="pointer-events-none absolute -left-28 top-1/4 h-80 w-80 rounded-full bg-forest-500/14 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-forest-400/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        aria-hidden
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%,rgba(253,253,246,0.25),transparent 40%), radial-gradient(circle at 80% 0%,rgba(34,197,94,0.35),transparent 42%)',
        }}
      />
      <Container className="relative z-10">
        <SectionHeading 
          eyebrow={tr('dining', 'eyebrow')} 
          title={tr('dining', 'title')} 
          subtitle={displayTeaser} 
          dark decorate 
        />

        <div className="flex flex-col gap-4">
          <p className="text-base leading-relaxed text-forest-100">
            {tr('dining', 'desc')}
          </p>
        </div>

        <div>
          <ul className="space-y-4">
            {highlights.slice(0, 4).map((item, i) => (
              <li
                key={item.id}
                className={cn(
                  'flex items-baseline justify-between gap-4 rounded-xl border border-white/10 bg-white/10 px-5 py-3.5 shadow-inner backdrop-blur-md',
                  i === 0 && 'ring-1 ring-forest-300/55'
                )}
              >
                <span className="font-medium">{item.name}</span>
                <span className="shrink-0 text-forest-200">${item.price.toLocaleString()}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/restaurant"
            className="mt-8 inline-flex rounded-full bg-white px-8 py-3 font-semibold text-forest-900 transition hover:bg-forest-50"
          >
            {tr('dining', 'explore')}
          </Link>
        </div>
      </Container>
    </section>
  );
}
