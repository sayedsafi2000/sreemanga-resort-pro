'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { GalleryItem } from '@/types/resort';

interface Props {
  items: GalleryItem[];
}

export default function GalleryNature({ items }: Props) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const cells = gsap.utils.toArray<HTMLElement>('.t3-gi');

      gsap.fromTo(
        cells,
        { clipPath: 'inset(0 100% 0 0)', scale: 1.08 },
        {
          clipPath: 'inset(0 0% 0 0)',
          scale: 1,
          duration: 0.9,
          ease: 'power3.inOut',
          stagger: { each: 0.07, from: 'start' },
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 72%',
            toggleActions: 'play none none none',
          },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [items]);

  const shown = items.slice(0, 9);

  return (
    <section ref={sectionRef} className="bg-[#050e05] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-14">
          <div>
            <span className="text-[#3d7a4a] text-[10px] uppercase tracking-[0.35em] font-sans">Gallery</span>
            <h2 className="font-display text-4xl md:text-5xl text-white mt-3">Visual Journey</h2>
          </div>
          <Link
            href="/gallery"
            className="hidden md:inline-block text-xs uppercase tracking-widest text-[#c8920c] hover:text-[#d4a017] transition-colors"
          >
            Full Gallery →
          </Link>
        </div>

        {/* Masonry-like grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[200px] gap-3">
          {shown.map((item, i) => {
            const isLarge = i === 0 || i === 5;
            return (
              <div
                key={item.id}
                className={`t3-gi relative overflow-hidden rounded-xl group ${isLarge ? 'col-span-2 row-span-2' : ''}`}
                style={{ clipPath: 'inset(0 100% 0 0)' }}
              >
                {item.src ? (
                  <img
                    src={item.src}
                    alt={item.alt || ''}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#1a3a1e] to-[#0f2011]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {item.alt && (
                  <p className="absolute bottom-0 left-0 right-0 px-4 py-3 text-white text-xs font-sans translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-black/60 backdrop-blur-sm">
                    {item.alt}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10 md:hidden">
          <Link
            href="/gallery"
            className="inline-block px-8 py-3 border border-[#3d7a4a] text-[#a8d4a8] text-xs uppercase tracking-widest rounded-full hover:border-[#c8920c] hover:text-[#c8920c] transition-colors"
          >
            View All Photos
          </Link>
        </div>
      </div>
    </section>
  );
}
