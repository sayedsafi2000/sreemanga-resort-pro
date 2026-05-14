'use client';

import Link from 'next/link';
import { ArrowRight, Utensils } from 'lucide-react';
import { useReveal, useRevealGroup } from '@/hooks/useReveal';
import type { MenuItem } from '@/types/resort';
import Image from 'next/image';
import restaurantBg from '@/assets/484617672_630330766444611_3236540395920013731_n.jpg';

type Props = {
  teaser: string;
  highlights: MenuItem[];
};

export default function RestaurantDark({ teaser, highlights }: Props) {
  const { ref: leftRef, visible: leftVisible } = useReveal<HTMLDivElement>({ threshold: 0.05 });
  const { ref: rightRef, visible: rightVisible } = useRevealGroup<HTMLDivElement>();

  const featured = highlights.filter((m) => m.isAvailable !== false).slice(0, 4);

  return (
    <section className="overflow-hidden bg-[#09100a] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-stretch gap-12 lg:grid-cols-2">

          {/* Left — image + overlay text */}
          <div
            ref={leftRef}
            className={`reveal-left ${leftVisible ? 'visible' : ''} relative min-h-[360px] overflow-hidden`}
          >
            <Image
              src={restaurantBg}
              alt="Restaurant dining"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-950/90 via-forest-950/50 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-8">
              <div className="mb-3 flex items-center gap-3">
                <span className="h-px w-6 bg-earth-400" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-earth-400">
                  Dining
                </span>
              </div>
              <h2 className="font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
                Farm-to-table<br />
                <em className="not-italic text-earth-300">cuisine</em>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-forest-200/65">
                {teaser}
              </p>
              <Link
                href="/restaurant"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-earth-400 transition hover:text-earth-300"
              >
                View menu <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Right — menu item list */}
          <div
            ref={rightRef}
            className="flex flex-col justify-center"
          >
            <div className="space-y-1">
              {featured.map((item, i) => (
                <div
                  key={item.id}
                  className={`reveal ${rightVisible ? 'visible' : ''} flex items-start justify-between gap-4 border-b border-forest-900/50 py-5`}
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-earth-400/20 bg-earth-400/5 text-earth-500">
                      <Utensils className="h-4 w-4" strokeWidth={1.5} />
                    </span>
                    <div>
                      <p className="font-semibold text-white">{item.name}</p>
                      {item.description && (
                        <p className="mt-0.5 text-xs text-forest-400/70 line-clamp-1">
                          {item.description}
                        </p>
                      )}
                      <span className="mt-1 inline-block text-[9px] font-semibold uppercase tracking-wider text-forest-600">
                        {item.category}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 font-display text-lg font-semibold text-earth-400">
                    ৳{item.price}
                  </span>
                </div>
              ))}
            </div>

            {featured.length === 0 && (
              <p className="text-sm text-forest-400/60">Menu items coming soon.</p>
            )}

            <div className="mt-8">
              <Link
                href="/restaurant"
                className="inline-flex items-center gap-2 border border-forest-700/60 px-7 py-3 text-sm font-semibold uppercase tracking-widest text-forest-300 transition-all duration-200 hover:border-earth-400/50 hover:text-earth-400"
              >
                Full restaurant menu
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
