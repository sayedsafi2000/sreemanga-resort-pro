'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, MapPin } from 'lucide-react';
import { useReveal, useRevealGroup } from '@/hooks/useReveal';
import type { NearbyExplorePayload } from '@/types/resort';

type Props = {
  section: NearbyExplorePayload['section'];
  spots: NearbyExplorePayload['spots'];
};

export default function NearbyDark({ section, spots }: Props) {
  const { ref: headRef, visible: headVisible } = useReveal<HTMLDivElement>();
  const { ref: gridRef, visible: gridVisible } = useRevealGroup<HTMLDivElement>();

  const visible = spots.slice(0, 6);

  return (
    <section className="bg-[#09100a] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div
          ref={headRef}
          className={`reveal ${headVisible ? 'visible' : ''} mb-14 max-w-2xl`}
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-8 bg-earth-400" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-earth-400">
              {section.eyebrow}
            </span>
          </div>
          <h2 className="font-display text-4xl font-semibold text-white sm:text-5xl">
            {section.title}
          </h2>
          {section.subtitle && (
            <p className="mt-4 text-sm leading-relaxed text-forest-300/60">
              {section.subtitle}
            </p>
          )}
        </div>

        {/* Cards grid */}
        <div
          ref={gridRef}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visible.map((spot, i) => (
            <Link
              key={spot.id}
              href={`/explore/${spot.slug}`}
              className={`reveal ${gridVisible ? 'visible' : ''} group relative flex min-h-[240px] flex-col justify-end overflow-hidden`}
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              {/* Image */}
              {spot.imageUrl ? (
                <Image
                  src={spot.imageUrl}
                  alt={spot.imageAlt || spot.title}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div className="absolute inset-0 bg-forest-900" />
              )}

              {/* Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-forest-950/90 via-forest-950/40 to-transparent" />

              {/* Content */}
              <div className="relative z-10 p-5">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-earth-400">
                  <MapPin className="h-3 w-3" />
                  {spot.distance}
                </div>
                <h3 className="font-display text-xl font-semibold text-white">
                  {spot.emoji} {spot.title}
                </h3>
                <p className="mt-1 text-xs text-forest-300/70 line-clamp-2">
                  {spot.bullets?.[0]}
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-earth-400 opacity-0 transition-all duration-300 group-hover:opacity-100">
                  Explore
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className={`reveal ${headVisible ? 'visible' : ''} mt-10 text-center`} style={{ transitionDelay: '400ms' }}>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 border border-forest-700/60 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-forest-300 transition-all duration-200 hover:border-earth-400/50 hover:text-earth-400"
          >
            All destinations
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
