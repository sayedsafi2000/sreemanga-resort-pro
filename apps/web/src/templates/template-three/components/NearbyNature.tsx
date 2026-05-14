'use client';

import { useRevealGroup } from '@/hooks/useReveal';
import Link from 'next/link';
import type { NearbyExplorePayload } from '@/types/resort';

interface Props {
  section?: NearbyExplorePayload['section'];
  spots: NearbyExplorePayload['spots'];
}

export default function NearbyNature({ spots }: Props) {
  const { ref, visible } = useRevealGroup<HTMLDivElement>();

  return (
    <section className="bg-[#0a1b0c] py-24 px-6 overflow-hidden">
      {/* Marquee strip */}
      <div className="overflow-hidden mb-16 -mx-6">
        <div
          className="flex gap-8 text-[#1a3a1e] font-display text-6xl md:text-8xl whitespace-nowrap t3-marquee"
        >
          {Array(6).fill('NATURE · EXPLORE · DISCOVER · UNWIND ·').map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-14">
          <div>
            <span className="text-[#3d7a4a] text-[10px] uppercase tracking-[0.35em] font-sans">Nearby</span>
            <h2 className="font-display text-4xl md:text-5xl text-white mt-3">Explore Around</h2>
          </div>
          <Link
            href="/explore"
            className="hidden md:inline-block text-xs uppercase tracking-widest text-[#c8920c] hover:text-[#d4a017] transition-colors"
          >
            All Spots →
          </Link>
        </div>

        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {spots.slice(0, 6).map((spot, i) => (
            <div
              key={spot.id}
              className={`group relative overflow-hidden rounded-2xl aspect-[4/3] transition-all duration-700 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              {spot.imageUrl ? (
                <img
                  src={spot.imageUrl}
                  alt={spot.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1a3a1e] to-[#0a1b0c]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="font-display text-xl text-white">{spot.title}</h3>
                {spot.distance && (
                  <p className="text-[#c8920c] text-xs font-sans mt-1">{spot.distance}</p>
                )}
              </div>
              {/* Hover line */}
              <div className="absolute bottom-0 left-0 h-0.5 bg-[#c8920c] w-0 group-hover:w-full transition-all duration-500" />
            </div>
          ))}
        </div>

        <div className="text-center mt-10 md:hidden">
          <Link
            href="/explore"
            className="inline-block px-8 py-3 border border-[#3d7a4a] text-[#a8d4a8] text-xs uppercase tracking-widest rounded-full hover:border-[#c8920c] hover:text-[#c8920c] transition-colors"
          >
            View All Spots
          </Link>
        </div>
      </div>

    </section>
  );
}
