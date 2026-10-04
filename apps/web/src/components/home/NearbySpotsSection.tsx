'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import SpotCoverImage from '@/components/explore/SpotCoverImage';
import SectionHeading from '@/components/SectionHeading';
import Container from '@/components/ui/Container';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReveal } from '@/hooks/useReveal';
import { cn } from '@/lib/utils';
import type { NearbyExplorePayload } from '@/types/resort';

type Props = {
  section: NearbyExplorePayload['section'];
  spots: NearbyExplorePayload['spots'];
};

function SpotCard({ spot }: { spot: Props['spots'][number] }) {
  const { t, lx } = useLanguage();
  const teaser = lx(spot.bullets[0] ?? spot.bestFor, spot.bulletsBn?.[0] ?? spot.bestForBn);

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
              'absolute right-2.5 top-2.5 max-w-[9rem] truncate rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide shadow-sm',
              spot.badge.toLowerCase().includes('must')
                ? 'bg-amber-400 text-stone-900'
                : 'border border-white/45 bg-black/40 font-semibold text-white backdrop-blur-sm'
            )}
          >
            {lx(spot.badge, spot.badgeBn)}
          </span>
        ) : null}
        <div className="absolute bottom-0 left-0 right-0 p-3 pt-8">
          <h3 className="min-h-[2.75rem] font-display text-base font-semibold leading-snug text-white drop-shadow line-clamp-2">
            {lx(spot.title, spot.titleBn)}
          </h3>
          <p className="mt-0.5 min-h-[1rem] text-xs font-medium text-forest-100/95">{lx(spot.distance, spot.distanceBn) || '\u00a0'}</p>
        </div>
      </div>
      <div className="space-y-2 px-3 pb-3 pt-2.5">
        <p className="min-h-[2.25rem] line-clamp-2 text-xs leading-relaxed text-stone-600">{teaser || '\u00a0'}</p>
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-forest-800 transition group-hover:text-forest-900">
          {t('See details', 'বিস্তারিত দেখুন')}
          <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export default function NearbySpotsSection({ section, spots }: Props) {
  const { language, tr } = useLanguage();
  if (!spots.length) return null;
  // Admin writes this section's copy in Bangla; English mode falls back to the built-in strings
  // so the page is fully English, and Bangla mode shows the admin text (or the built-in Bangla).
  const bn = language === 'bn';
  const hasBangla = (s: string) => /[\u0980-\u09FF]/.test(s);
  // Admin can type both columns; otherwise: Bangla mode → admin Bangla text, English mode → admin
  // English text; anything missing falls back to the built-in strings.
  const pick = (en: string | null | undefined, bnText: string | null | undefined, key: string) => {
    const e = en?.trim() ?? ''; const b = bnText?.trim() ?? '';
    if (bn) return b || (e && hasBangla(e) ? e : tr('sections', key));
    return e && !hasBangla(e) ? e : tr('sections', key);
  };

  const loop = [...spots, ...spots];
  const { ref: headRef, visible: headVisible } = useReveal<HTMLDivElement>();

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
        <div ref={headRef} className={`reveal ${headVisible ? 'visible' : ''}`}>
          <SectionHeading
            eyebrow={pick(section.eyebrow, section.eyebrowBn, 'exploreEyebrow')}
            title={pick(section.title, section.titleBn, 'exploreTitle')}
            subtitle={pick(section.subtitle, section.subtitleBn, 'exploreSubtitle')}
            decorate
          />
        </div>
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

      <Container className="relative z-10 mt-6">
        <p className="mx-auto max-w-2xl text-center text-xs text-stone-500 sm:text-sm">{pick(section.footnote, section.footnoteBn, 'exploreFootnote')}</p>
      </Container>
    </section>
  );
}
