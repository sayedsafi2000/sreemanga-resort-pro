'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';

interface Props {
  aboutShort?: string;
  aboutShortBn?: string;
  aboutLong?: string;
  aboutLongBn?: string;
}

const STATS = [
  { target: 15, suffix: '+', label: 'Acres of Nature' },
  { target: 12, suffix: '+', label: 'Room Types' },
  { target: 5, suffix: '★', label: 'Guest Rating' },
  { target: 2000, suffix: '+', label: 'Happy Guests' },
];

export default function AboutNature({ aboutShort, aboutLong }: Props) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const counterRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Image clip-path wipe reveal
      if (imgRef.current) {
        gsap.fromTo(
          imgRef.current,
          { clipPath: 'inset(0 100% 0 0)' },
          {
            clipPath: 'inset(0 0% 0 0)',
            duration: 1.5,
            ease: 'power3.inOut',
            scrollTrigger: {
              trigger: imgRef.current,
              start: 'top 75%',
              toggleActions: 'play none none none',
            },
          },
        );
      }

      // Text stagger
      const lines = gsap.utils.toArray<HTMLElement>('.t3-about-line');
      gsap.fromTo(
        lines,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.15,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            toggleActions: 'play none none none',
          },
        },
      );
    }, sectionRef);

    // Counter animations (IntersectionObserver)
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const idx = parseInt(el.dataset.idx || '0');
          const target = STATS[idx]?.target ?? 0;
          let current = 0;
          const steps = 60;
          const increment = target / steps;
          const timer = setInterval(() => {
            current = Math.min(current + increment, target);
            el.textContent = Math.round(current).toString();
            if (current >= target) clearInterval(timer);
          }, 18);
          observer.unobserve(el);
        });
      },
      { threshold: 0.5 },
    );
    counterRefs.current.forEach(el => el && observer.observe(el));

    return () => {
      ctx.revert();
      observer.disconnect();
    };
  }, []);

  return (
    <section ref={sectionRef} className="bg-[#050e05] py-24 md:py-36 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Image with wipe reveal */}
          <div
            ref={imgRef}
            className="relative rounded-3xl overflow-hidden"
            style={{ aspectRatio: '4/5', clipPath: 'inset(0 100% 0 0)' }}
          >
            <img
              src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=85"
              alt="Nature at our resort"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050e05]/50 to-transparent" />
            {/* Floating badge */}
            <div className="absolute bottom-8 left-8 bg-[#030d04]/90 backdrop-blur-sm rounded-2xl p-4 border border-[#1a3a1e]">
              <p className="text-[#c8920c] font-display text-2xl">Sreemangal</p>
              <p className="text-[#6b9b6b] text-xs font-sans uppercase tracking-wider mt-1">Bangladesh's Tea Capital</p>
            </div>
          </div>

          {/* Text content */}
          <div>
            <span className="t3-about-line inline-block text-[#3d7a4a] text-[10px] uppercase tracking-[0.35em] font-sans mb-4">
              About Us
            </span>
            <h2 className="t3-about-line font-display text-4xl md:text-5xl lg:text-6xl text-white leading-tight mb-6">
              Rooted in<br />Nature's Grace
            </h2>
            <p className="t3-about-line text-[#a8d4a8] leading-relaxed mb-4 text-base">
              {aboutShort || 'Nestled in the heart of Sreemangal, surrounded by endless tea gardens and verdant forests, we offer a sanctuary where nature heals and inspires.'}
            </p>
            {aboutLong && (
              <p className="t3-about-line text-[#5a8a5a] leading-relaxed text-sm">{aboutLong}</p>
            )}

            <Link
              href="/rooms"
              className="t3-about-line inline-block mt-8 px-8 py-3 border border-[#3d7a4a] text-[#a8d4a8] text-xs uppercase tracking-widest rounded-full hover:border-[#c8920c] hover:text-[#c8920c] transition-colors"
            >
              Explore Our Rooms
            </Link>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-6 mt-12 pt-10 border-t border-[#1a3a1e]">
              {STATS.map((stat, i) => (
                <div key={i} className="t3-about-line">
                  <div className="font-display text-4xl text-[#c8920c]">
                    <span ref={el => { counterRefs.current[i] = el; }} data-idx={i}>0</span>
                    {stat.suffix}
                  </div>
                  <p className="text-[#5a8a5a] text-xs font-sans mt-1 uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
