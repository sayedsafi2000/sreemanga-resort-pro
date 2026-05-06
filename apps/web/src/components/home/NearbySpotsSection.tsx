'use client';

'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import SpotCoverImage from '@/components/explore/SpotCoverImage';
import SectionHeading from '@/components/SectionHeading';
import Container from '@/components/ui/Container';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { NearbyExplorePayload } from '@/types/resort';

type Props = {
  section: NearbyExplorePayload['section'];
  spots: NearbyExplorePayload['spots'];
};

function SpotCard({ spot }: { spot: Props['spots'][number] }) {
  const { t, tr } = useLanguage();
  const teaser = spot.bullets[0] ?? spot.bestFor;

  return (
    <Link
      href={`/explore/${spot.slug}`}
      prefetch={true}
      className={cn(
        'group relative w-[min(72vw,14.5rem)] shrink-0 overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-md shadow-forest-900/5',
        'backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-forest-200/85 hover:shadow-lg hover:shadow-forest-900/10',
        'sm:w-[15rem] md:w-[15.5rem]'
      )}
    >
      <div className="relative aspect-[5/3] w-full bg-stone-200">
        <SpotCoverImage
          src={spot.imageUrl}
          alt={spot.imageAlt || spot.title}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.04]"
          sizes="(max-width: 768px) 72vw, 248px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
        {spot.emoji ? (
          <span
            className="absolute left-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-base shadow-sm"
            aria-hidden
          >
            {spot.emoji}
          </span>
        ) : null}
        {spot.badge ? (
          <span
            className={cn(
              'absolute right-2.5 top-2.5 max-w-[9rem] truncate rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide shadow-sm',
              spot.badge.toLowerCase().includes('must')
                ? 'bg-amber-400 text-stone-900'
                : 'border border-white/45 bg-black/40 text-[0.6rem] font-semibold text-white backdrop-blur-sm'
            )}
          >
            {spot.badge}
          </span>
        ) : null}
        <div className="absolute bottom-0 left-0 right-0 p-3 pt-8">
          <h3 className="font-display text-[0.95rem] font-semibold leading-snug text-white drop-shadow line-clamp-2 sm:text-base">
            {spot.title}
          </h3>
          {spot.distance ? (
            <p className="mt-0.5 text-[0.65rem] font-medium text-forest-100/95">{spot.distance}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-2 px-3 pb-3 pt-2.5">
        {teaser ? (
          <p className="line-clamp-2 text-[0.7rem] leading-relaxed text-stone-600 sm:text-xs">{teaser}</p>
        ) : null}
        <span className="inline-flex items-center gap-0.5 text-[0.7rem] font-semibold text-forest-800 transition group-hover:text-forest-900">
          {t('See details', 'বিস্তারিত দেখুন')}
          <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export default function NearbySpotsSection({ section, spots }: Props) {
  const { t, tr } = useLanguage();
  if (!spots.length) return null;

  const loop = [...spots, ...spots];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-stone-warm via-cream to-[#eef3ec] dark:from-[#0a0f0c] dark:via-[#0d110d] dark:to-[#111711] py-10 sm:py-14">
      <div
        className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-forest-200/35 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-forest-200/25 blur-3xl"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.2] grain" aria-hidden />

      <Container className="relative z-10">
        <SectionHeading
          eyebrow={section.eyebrow}
          title={t(section.title, section.title)}
          subtitle={t(section.subtitle, section.subtitle)}
          decorate
        />
      </Container>

      <div className="relative z-[1] mt-2">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-cream to-transparent sm:w-14"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-cream to-transparent sm:w-14"
          aria-hidden
        />

        <div className="overflow-hidden py-2">
          <div className="flex w-max gap-3 pr-3 animate-marquee-spots will-change-transform motion-reduce:animate-none md:gap-4 md:pr-4">
            {loop.map((spot, i) => (
              <SpotCard key={`${spot.slug}-${i}`} spot={spot} />
            ))}
          </div>
        </div>
      </div>

      {section.footnote ? (
        <Container className="relative z-10 mt-6">
          <p className="mx-auto max-w-2xl text-center text-xs text-stone-500 sm:text-sm">{section.footnote}</p>
        </Container>
      ) : null}
    </section>
  );
}
