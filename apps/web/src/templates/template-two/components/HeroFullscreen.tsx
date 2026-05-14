'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  resortName: string;
  tagline: string;
  taglineBn?: string;
  heroImages: string[];
};

const AUTO_SLIDE_MS = 6000;

export default function HeroFullscreen({ resortName, tagline, taglineBn = '', heroImages }: Props) {
  const { t, tr } = useLanguage();
  const displayTagline = taglineBn ? t(tagline, taglineBn) : tagline;
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroImages.length);
    }, AUTO_SLIDE_MS);
    return () => clearInterval(timer);
  }, [heroImages.length]);

  return (
    <section className="relative flex h-screen min-h-[600px] w-full items-end overflow-hidden -mt-[68px]" style={{ height: 'calc(100vh + 68px)' }}>
      {/* Slides */}
      <div className="absolute inset-0">
        {heroImages.map((src, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${
              activeIndex === idx ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Image
              src={src}
              alt=""
              fill
              className="object-cover"
              priority={idx === 0}
              sizes="100vw"
            />
          </div>
        ))}
        {/* Layered overlays for drama */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020b03] via-forest-950/60 to-forest-950/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-forest-950/50 via-transparent to-transparent" />
      </div>

      {/* Main content — pinned to bottom */}
      <div className="relative z-10 w-full pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

          {/* Eyebrow line */}
          <div
            className={`mb-6 flex items-center gap-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ transitionDelay: '100ms' }}
          >
            <span className="h-px w-12 bg-earth-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-earth-400">
              {tr('hero', 'subtitle')}
            </span>
          </div>

          {/* Resort name — huge cinematic type */}
          <h1
            className={`font-display font-semibold leading-[0.92] text-white transition-all duration-700 text-5xl sm:text-7xl lg:text-8xl xl:text-9xl ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: '250ms' }}
          >
            <span className="block">{resortName.split(' ').slice(0, Math.ceil(resortName.split(' ').length / 2)).join(' ')}</span>
            <span className="block text-earth-300/90">{resortName.split(' ').slice(Math.ceil(resortName.split(' ').length / 2)).join(' ')}</span>
          </h1>

          {/* Tagline + CTAs row */}
          <div
            className={`mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ transitionDelay: '450ms' }}
          >
            <p className="max-w-md text-base leading-relaxed text-forest-100/75 sm:text-lg">
              {displayTagline}
            </p>

            <div className="flex shrink-0 items-center gap-3">
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 rounded-none border border-earth-400 bg-earth-400 px-7 py-3.5 text-sm font-semibold uppercase tracking-widest text-forest-950 transition-all duration-200 hover:bg-earth-300 hover:border-earth-300"
              >
                {tr('hero', 'ctaBook')}
              </Link>
              <Link
                href="/rooms"
                className="inline-flex items-center gap-2 rounded-none border border-white/30 px-7 py-3.5 text-sm font-semibold uppercase tracking-widest text-white/90 transition-all duration-200 hover:border-white/60 hover:text-white"
              >
                {tr('nav', 'rooms')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Slide indicators — bottom center */}
      {heroImages.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
          {heroImages.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`Slide ${idx + 1}`}
              className={`h-px transition-all duration-500 ${
                activeIndex === idx ? 'w-12 bg-earth-400' : 'w-4 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}

      {/* Scroll line */}
      <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-3 lg:flex">
        <div className="h-16 w-px bg-gradient-to-b from-transparent to-white/30" />
        <span className="rotate-90 text-[9px] font-semibold uppercase tracking-[0.4em] text-white/40">
          Scroll
        </span>
        <div className="h-16 w-px bg-gradient-to-t from-transparent to-white/30" />
      </div>
    </section>
  );
}
