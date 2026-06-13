'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Fallback images if no heroImages are provided
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=85',
  'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=85',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1920&q=85',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=85',
];

const SCENES = [
  { tag: 'Sreemangal, Bangladesh', headline: 'Escape Into\nNature', cta: false },
  { tag: 'Ancient Tea Gardens', headline: 'Into the\nWild Heart', cta: false },
  { tag: 'Forest Sanctuary', headline: 'Breathe.\nUnwind.', cta: false },
  { tag: 'Book Your Escape', headline: 'Begin Your\nStory Here', cta: true },
];

interface Props {
  resortName: string;
  tagline?: string;
  heroImages?: string[];
}

export default function HeroScrollSequence({ resortName, heroImages = [] }: Props) {
  const IMAGES = heroImages.length >= 2 ? heroImages : FALLBACK_IMAGES;
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const imgEls = gsap.utils.toArray<HTMLElement>('.t3-hi');
      const textEls = gsap.utils.toArray<HTMLElement>('.t3-ht');
      const n = imgEls.length;

      // Animate scroll indicator out
      gsap.to('.t3-scroll-hint', {
        opacity: 0,
        y: -10,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=200',
          scrub: true,
        },
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 2,
        },
      });

      for (let i = 1; i < n; i++) {
        const pos = (i - 1) / (n - 1);
        tl.to(imgEls[i - 1], { opacity: 0, scale: 1.04, duration: 0.45 }, pos)
          .to(textEls[i - 1], { opacity: 0, y: -24, duration: 0.3 }, pos)
          .fromTo(imgEls[i], { opacity: 0, scale: 1.07 }, { opacity: 1, scale: 1, duration: 0.45 }, pos + 0.06)
          .fromTo(textEls[i], { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.35 }, pos + 0.12);
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative" style={{ height: '500vh' }}>
      <div className="sticky top-0 h-screen overflow-hidden bg-[#030d04]">
        {/* Background image layers */}
        {IMAGES.map((src, i) => (
          <div
            key={i}
            className={`t3-hi absolute inset-0 ${i > 0 ? 'opacity-0' : ''}`}
            style={{ willChange: 'opacity, transform' }}
          >
            <img
              src={src}
              alt=""
              className="w-full h-full object-cover"
              style={{ transform: 'scale(1.06)', transformOrigin: 'center' }}
              loading={i === 0 ? 'eager' : 'lazy'}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#030d04]/25 via-transparent to-[#030d04]/75" />
          </div>
        ))}

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(3,13,4,0.6) 100%)' }} />

        {/* Text scenes */}
        {SCENES.map((scene, i) => (
          <div
            key={i}
            className={`t3-ht absolute inset-0 flex flex-col items-center justify-center text-center px-6 ${i > 0 ? 'opacity-0' : ''}`}
            style={{ pointerEvents: i === SCENES.length - 1 ? 'auto' : 'none' }}
          >
            <span className="inline-block text-[#c8920c] text-[10px] uppercase tracking-[0.4em] font-sans mb-5">
              {i === 0 ? resortName : scene.tag}
            </span>
            <h1
              className="font-display text-white leading-[0.88]"
              style={{ fontSize: 'clamp(3.2rem, 10vw, 9rem)', whiteSpace: 'pre-line' }}
            >
              {scene.headline}
            </h1>
            {scene.cta && (
              <div className="flex flex-wrap gap-4 justify-center mt-10">
                <Link
                  href="/booking"
                  className="px-9 py-4 bg-[#c8920c] text-white text-xs uppercase tracking-[0.2em] rounded-full hover:bg-[#d4a017] transition-colors"
                >
                  Book Your Stay
                </Link>
                <Link
                  href="/rooms"
                  className="px-9 py-4 border border-white/35 text-white text-xs uppercase tracking-[0.2em] rounded-full hover:bg-white/8 hover:border-white/60 transition-all"
                >
                  Explore Rooms
                </Link>
              </div>
            )}
          </div>
        ))}

        {/* Image progress dots */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2">
          {IMAGES.map((_, i) => (
            <div
              key={i}
              className={`t3-hi-dot w-1 rounded-full transition-all duration-500 ${i === 0 ? 'h-6 bg-[#c8920c]' : 'h-2 bg-white/25'}`}
            />
          ))}
        </div>

        {/* Scroll hint */}
        <div className="t3-scroll-hint absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-white/35 text-[10px] uppercase tracking-[0.3em] font-sans">Scroll to explore</span>
          <div className="relative w-px h-12 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/50 to-transparent t3-scroll-line" />
          </div>
        </div>
      </div>

    </section>
  );
}
