'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  images: string[];
  alt: string;
  className?: string;
};

export default function ImageCarousel({ images, alt, className }: Props) {
  const slides = images.length ? images : ['/rooms/room1.avif'];
  const [i, setI] = useState(0);
  const prev = () => setI((x) => (x - 1 + slides.length) % slides.length);
  const next = () => setI((x) => (x + 1) % slides.length);

  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-stone-100 shadow-card', className)}>
      <div className="relative aspect-[16/10] w-full">
        <Image
          key={slides[i]}
          src={slides[i]}
          alt={`${alt} ${i + 1}`}
          fill
          className="object-cover"
          priority={i === 0}
          unoptimized={slides[i].startsWith('http')}
        />
      </div>
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-stone-800 shadow-md transition hover:bg-white"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-stone-800 shadow-md transition hover:bg-white"
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setI(idx)}
                className={cn(
                  'h-2 rounded-full transition-all',
                  idx === i ? 'w-6 bg-white' : 'w-2 bg-white/50'
                )}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
