'use client';

import Image from 'next/image';
import Link from 'next/link';
import SectionHeading from '@/components/SectionHeading';
import Container from '@/components/ui/Container';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { GalleryItem } from '@/types/resort';

type Props = {
  items: GalleryItem[];
  reserveBottomForCta?: boolean;
};

export default function GalleryPreview({ items, reserveBottomForCta }: Props) {
  const { tr } = useLanguage();
  const preview = items.slice(0, 6);

  return (
    <section
      className={cn(
        'relative bg-cream dark:bg-[#0a0f0c] pt-20 sm:pt-28',
        reserveBottomForCta ? 'pb-28 sm:pb-40' : 'pb-20 sm:pb-28'
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-forest-50/90 to-transparent dark:from-forest-900/40" aria-hidden />
      <Container className="relative z-10">
        <SectionHeading
          eyebrow={tr('gallery', 'eyebrow')}
          title={tr('gallery', 'title')}
          subtitle={tr('gallery', 'subtitle')}
          decorate
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {preview.map((g, i) => (
            <div
              key={g.id}
              className={cn(
                'group relative overflow-hidden rounded-3xl shadow-card ring-1 ring-forest-100/60 transition duration-300 hover:-translate-y-1 hover:shadow-soft',
                i === 0 && 'col-span-2 md:col-span-3 aspect-[21/11] md:aspect-[21/9]',
                i !== 0 && 'aspect-[4/5] md:aspect-square'
              )}
            >
              <Image
                src={g.src}
                alt={g.alt}
                fill
                className="object-cover transition duration-500 group-hover:scale-[1.04]"
                sizes="(max-width:768px) 50vw, 33vw"
                loading="lazy"
                unoptimized={g.src.startsWith('data:') || g.src.startsWith('http')}
              />
              <span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/65 to-transparent" />
              <span className="absolute bottom-3 left-3 text-xs font-semibold text-white/95 drop-shadow">
                {g.category}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/gallery"
            className="inline-flex rounded-full bg-forest-700 px-8 py-3 font-semibold text-white shadow-soft transition hover:bg-forest-800 hover:shadow-lg"
          >
            {tr('gallery', 'viewAll')}
          </Link>
        </div>
      </Container>
    </section>
  );
}
