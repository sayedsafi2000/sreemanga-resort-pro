'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Leaf, Wind } from 'lucide-react';
import { useEffect, useState } from 'react';
import Container from '@/components/ui/Container';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  resortName: string;
  tagline: string;
  taglineBn?: string;
  heroImages: string[];
};

const AUTO_SLIDE_MS = 4500;

export default function HeroSection({ resortName, tagline, taglineBn = '', heroImages }: Props) {
  const { t, tr } = useLanguage();
  const displayTagline = taglineBn ? t(tagline, taglineBn) : tagline;
  const slides = heroImages.length ? heroImages : [];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    // Preload slides so manual dot navigation feels instant.
    slides.forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
  }, [slides]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, AUTO_SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const goToSlide = (idx: number) => {
    setActiveIndex(idx);
  };

  return (
    <section className="relative overflow-hidden pt-16 sm:-mt-32 sm:pt-32">
      <div
        className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-forest-700/25 blur-3xl animate-float"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-10 bottom-32 h-64 w-64 rounded-full bg-forest-400/20 blur-3xl animate-float [animation-delay:1.2s]"
        aria-hidden
      />
      <div className="absolute inset-0">
        {slides.map((image, idx) => (
          <Image
            key={`${image}-${idx}`}
            src={image}
            alt=""
            fill
            className={`object-cover transition-all duration-[1.5s] ease-out ${activeIndex === idx ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}
            priority={idx === 0}
            loading={idx === 0 ? 'eager' : 'lazy'}
            sizes="100vw"
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-forest-950/55 via-stone-900/45 to-stone-950/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-forest-900/25 via-transparent to-transparent" />
        <div className="absolute inset-0 opacity-25 mix-blend-soft-light [background-image:linear-gradient(115deg,transparent_40%,rgba(183,208,191,0.4)_48%,transparent_56%)]" />
      </div>

      <Container className="relative z-10 flex min-h-[min(90vh,980px)] flex-col justify-center py-12 sm:py-16 lg:py-20">
        <div className="mb-5 flex max-w-xl flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/95 backdrop-blur-md">
            <Leaf className="h-3.5 w-3.5 text-forest-200" aria-hidden />
shade & soft sounds · eco stay

            calm winds & open field views
          </span>
        </div>
        <p className="mb-4 max-w-xl animate-fade-up text-sm font-medium uppercase tracking-[0.28em] text-forest-100/95">
          {tr('hero', 'subtitle')}
        </p>
        <h1 className="font-display text-balance text-4xl font-semibold leading-tight text-white drop-shadow-[0_6px_30px_rgba(0,0,0,0.55)] sm:text-6xl lg:text-7xl">
          <span className="bg-gradient-to-br from-white via-forest-100 to-forest-200 bg-clip-text text-transparent">
            {resortName}
          </span>
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/92 sm:text-xl">{displayTagline}</p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/booking"
            className="inline-flex rounded-full bg-forest-100 px-8 py-3.5 text-base font-semibold text-forest-950 shadow-soft ring-2 ring-white/50 transition hover:scale-[1.02] hover:bg-white hover:shadow-lg"
          >
            {tr('hero', 'ctaBook')}
          </Link>
          <Link
            href="/rooms"
            className="inline-flex rounded-full border border-white/45 bg-white/10 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
          >
            {tr('nav', 'rooms')}
          </Link>
        </div>
        {slides.length > 1 && (
          <div className="pointer-events-auto relative z-20 mt-8 flex gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onMouseDown={() => goToSlide(idx)}
                onClick={() => goToSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2.5 rounded-full transition-all ${activeIndex === idx ? 'w-8 bg-stone-warm' : 'w-2.5 bg-stone-warm/60'}`}
              />
            ))}
          </div>
        )}
      </Container>

      
    </section>
  );
}
