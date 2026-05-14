'use client';

import { useReveal } from '@/hooks/useReveal';
import Link from 'next/link';
import type { MenuItem } from '@/types/resort';

interface Props {
  teaser?: string;
  highlights?: MenuItem[];
}

export default function RestaurantNature({ teaser, highlights = [] }: Props) {
  const { ref: imgRef, visible: imgVisible } = useReveal<HTMLDivElement>();
  const { ref: textRef, visible: textVisible } = useReveal<HTMLDivElement>();

  return (
    <section className="bg-[#030d04] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image */}
          <div
            ref={imgRef}
            className={`relative rounded-3xl overflow-hidden aspect-[4/3] transition-all duration-1000 ${
              imgVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
            }`}
          >
            <img
              src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=85"
              alt="Forest dining"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#030d04]/50" />
            {/* Leaf overlay */}
            <div className="absolute top-4 left-4 text-8xl opacity-10 pointer-events-none select-none">🌿</div>
          </div>

          {/* Content */}
          <div
            ref={textRef}
            className={`transition-all duration-1000 delay-200 ${
              textVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
            }`}
          >
            <span className="text-[#3d7a4a] text-[10px] uppercase tracking-[0.35em] font-sans">Dining</span>
            <h2 className="font-display text-4xl md:text-5xl text-white mt-3 mb-6 leading-tight">
              {teaser || 'Forest-to-Table\nDining'}
            </h2>
            <p className="text-[#a8d4a8] leading-relaxed mb-8 text-sm">
              Organic, seasonal menus inspired by the rich flavors of Sreemangal—crafted with
              ingredients plucked fresh from our gardens each morning.
            </p>

            {/* Menu highlights */}
            {highlights.slice(0, 5).map((item, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-3 border-b border-[#1a3a1e]"
              >
                <span className="text-white text-sm font-sans">{item.name}</span>
                <span className="text-[#c8920c] text-sm font-sans">৳{item.price}</span>
              </div>
            ))}

            <Link
              href="/restaurant"
              className="inline-block mt-8 px-8 py-3 border border-[#3d7a4a] text-[#a8d4a8] text-xs uppercase tracking-widest rounded-full hover:border-[#c8920c] hover:text-[#c8920c] transition-colors"
            >
              View Full Menu
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
