'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useReveal, useRevealGroup } from '@/hooks/useReveal';
import type { GalleryItem } from '@/types/resort';

type Props = { items: GalleryItem[] };

export default function GalleryMasonry({ items }: Props) {
  const { ref: headRef, visible: headVisible } = useReveal<HTMLDivElement>();
  const { ref: gridRef, visible: gridVisible } = useRevealGroup<HTMLDivElement>();

  if (!items.length) return null;

  const preview = items.slice(0, 8);

  // Assign varying aspect ratios to create masonry-like feel in a CSS grid
  const aspectMap = ['aspect-[3/4]', 'aspect-square', 'aspect-[3/4]', 'aspect-[4/3]', 'aspect-square', 'aspect-[3/4]', 'aspect-[4/3]', 'aspect-square'];

  return (
    <section className="bg-[#060e07] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div
          ref={headRef}
          className={`reveal ${headVisible ? 'visible' : ''} mb-14 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between`}
        >
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-8 bg-earth-400" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-earth-400">
                Visual Journal
              </span>
            </div>
            <h2 className="font-display text-4xl font-semibold text-white sm:text-5xl">
              A glimpse of<br />
              <em className="not-italic text-earth-300">our world</em>
            </h2>
          </div>
          <Link
            href="/gallery"
            className="group inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-forest-400 transition hover:text-earth-400"
          >
            Full gallery
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Masonry-style grid using CSS columns */}
        <div
          ref={gridRef}
          className="columns-2 gap-3 sm:columns-3 lg:columns-4"
        >
          {preview.map((item, i) => (
            <div
              key={item.id}
              className={`reveal ${gridVisible ? 'visible' : ''} mb-3 break-inside-avoid overflow-hidden`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <div className={`relative ${aspectMap[i % aspectMap.length]} w-full overflow-hidden group`}>
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-forest-950/0 transition-colors duration-300 group-hover:bg-forest-950/30" />
                <div className="absolute bottom-0 left-0 right-0 translate-y-full p-3 transition-transform duration-300 group-hover:translate-y-0">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-earth-400">
                    {item.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
