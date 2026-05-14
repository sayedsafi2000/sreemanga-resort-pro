'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Leaf, Wind, Trees, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import Container from '@/components/ui/Container';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  resortName: string;
  tagline: string;
  taglineBn?: string;
  heroImages: string[];
};

const AUTO_SLIDE_MS = 5000;

const natureBadges = [
  { icon: Leaf,  label: 'Eco Stay'    },
  { icon: Trees, label: 'Tea Gardens' },
  { icon: Wind,  label: 'Fresh Air'   },
];

export default function HeroSection({ resortName, tagline, taglineBn = '', heroImages }: Props) {
  const { t, tr } = useLanguage();
  const displayTagline = taglineBn ? t(tagline, taglineBn) : tagline;
  const slides = heroImages.length ? heroImages : [];
  const [activeIndex, setActiveIndex]   = useState(0);
  const [mounted,     setMounted]       = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
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

  return (
    <section className="relative overflow-hidden pt-16 sm:-mt-32 sm:pt-32">
      {/* ── Ambient glow orbs ──────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-forest-700/20 blur-3xl animate-float" aria-hidden />
      <div className="pointer-events-none absolute -right-10 bottom-32 h-64 w-64 rounded-full bg-forest-400/15 blur-3xl animate-float [animation-delay:1.4s]" aria-hidden />

      {/* ── Slides ─────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0">
        {slides.map((image, idx) => (
          <Image
            key={`slide-${idx}`}
            src={image}
            alt=""
            fill
            className={`object-cover transition-all duration-[1600ms] ease-out ${
              activeIndex === idx ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.04]'
            }`}
            priority={idx === 0}
            loading={idx === 0 ? 'eager' : 'lazy'}
            sizes="100vw"
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-forest-950/60 via-forest-900/35 to-stone-950/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-forest-900/30 via-transparent to-transparent" />
        <div className="absolute inset-0 hero-noise opacity-60 mix-blend-overlay" aria-hidden />
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <Container className="relative z-10 flex min-h-[min(92vh,1000px)] flex-col justify-center py-12 sm:py-16 lg:py-24">

        {/* Nature badges — staggered fade-up */}
        <div className="mb-6 flex flex-wrap gap-2">
          {natureBadges.map(({ icon: Icon, label }, i) => (
            <span
              key={label}
              className="nature-tag-dark animate-fade-up"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <Icon className="h-3.5 w-3.5 text-forest-300" aria-hidden />
              {label}
            </span>
          ))}
        </div>

        {/* Eyebrow */}
        <p
          className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-forest-200/90 animate-fade-up"
          style={{ animationDelay: '200ms' }}
        >
          {tr('hero', 'subtitle')}
        </p>

        {/* Resort name — bold entrance */}
        <h1
          className="font-display text-balance text-4xl font-semibold leading-tight text-white drop-shadow-[0_6px_30px_rgba(0,0,0,0.55)] sm:text-6xl lg:text-7xl animate-fade-up"
          style={{ animationDelay: '320ms' }}
        >
          <span className="bg-gradient-to-br from-white via-forest-100 to-forest-300 bg-clip-text text-transparent">
            {resortName}
          </span>
        </h1>

        {/* Tagline */}
        <p
          className="mt-5 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl animate-fade-up"
          style={{ animationDelay: '440ms' }}
        >
          {displayTagline}
        </p>

        {/* CTAs */}
        <div
          className="mt-10 flex flex-wrap items-center gap-4 animate-fade-up"
          style={{ animationDelay: '560ms' }}
        >
          <Link
            href="/booking"
            className="btn-book-light shadow-glow ring-2 ring-white/30"
          >
            {tr('hero', 'ctaBook')}
          </Link>
          <Link
            href="/rooms"
            className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-8 py-3 text-base font-semibold text-white backdrop-blur-md transition-all duration-200 hover:bg-white/18 hover:-translate-y-px active:scale-[0.98]"
          >
            {tr('nav', 'rooms')}
          </Link>
        </div>

        {/* Slide dots */}
        {slides.length > 1 && (
          <div
            className="pointer-events-auto relative z-20 mt-10 flex items-center gap-2 animate-fade-up"
            style={{ animationDelay: '680ms' }}
          >
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  activeIndex === idx
                    ? 'h-2.5 w-8 bg-forest-100'
                    : 'h-2 w-2 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </Container>

      {/* ── Scroll indicator ───────────────────────────────────────────────── */}
      <div
        className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 animate-bounce sm:flex flex-col items-center gap-1 text-white/40"
        style={{ animationDelay: '1.2s' }}
      >
        <span className="text-[10px] uppercase tracking-widest">Scroll</span>
        <ChevronDown className="h-4 w-4" />
      </div>
    </section>
  );
}
