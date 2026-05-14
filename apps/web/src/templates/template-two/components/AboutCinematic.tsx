'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';
import { useLanguage } from '@/contexts/LanguageContext';
import aboutMain from '@/assets/484617672_630330766444611_3236540395920013731_n.jpg';
import aboutAccentA from '@/assets/488846677_644425541701800_5934371764185234027_n.jpg';

type Props = {
  aboutShort: string;
  aboutShortBn?: string;
  aboutLong: string;
  aboutLongBn?: string;
};

const stats = [
  { value: '5+', label: 'Acres of nature' },
  { value: '12', label: 'Room types' },
  { value: '100%', label: 'Eco-friendly' },
  { value: '∞', label: 'Moments to cherish' },
];

export default function AboutCinematic({
  aboutShort,
  aboutShortBn = '',
  aboutLong,
  aboutLongBn = '',
}: Props) {
  const { t } = useLanguage();
  const displayAboutShort = aboutShortBn ? t(aboutShort, aboutShortBn) : aboutShort;
  const displayAboutLong = aboutLongBn ? t(aboutLong, aboutLongBn) : aboutLong;

  const { ref: leftRef, visible: leftVisible } = useReveal<HTMLDivElement>({ threshold: 0.05 });
  const { ref: rightRef, visible: rightVisible } = useReveal<HTMLDivElement>({ threshold: 0.05 });
  const { ref: statsRef, visible: statsVisible } = useReveal<HTMLDivElement>();

  return (
    <section className="overflow-hidden bg-[#060e07] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Main split layout */}
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">

          {/* Left — images */}
          <div
            ref={leftRef}
            className={`reveal-left ${leftVisible ? 'visible' : ''} relative`}
          >
            {/* Main image */}
            <div className="relative aspect-[4/5] overflow-hidden">
              <Image
                src={aboutMain}
                alt="Resort surrounded by tea gardens"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 90vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060e07]/80 to-transparent" />
            </div>

            {/* Floating accent image */}
            <div
              className={`reveal-scale ${leftVisible ? 'visible' : ''} absolute -bottom-8 -right-6 w-2/5 overflow-hidden border-4 border-[#060e07] shadow-2xl sm:-right-10`}
              style={{ transitionDelay: '250ms' }}
            >
              <div className="relative aspect-[3/4]">
                <Image
                  src={aboutAccentA}
                  alt="Resort detail"
                  fill
                  className="object-cover"
                  sizes="25vw"
                />
              </div>
            </div>

            {/* Gold line accent */}
            <div className="absolute -left-4 top-12 h-1/2 w-px bg-gradient-to-b from-earth-400/60 to-transparent hidden lg:block" />
          </div>

          {/* Right — copy */}
          <div
            ref={rightRef}
            className={`reveal-right ${rightVisible ? 'visible' : ''} space-y-8`}
          >
            <div>
              <div className="mb-5 flex items-center gap-3">
                <span className="h-px w-8 bg-earth-400" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-earth-400">
                  Our Story
                </span>
              </div>
              <h2 className="font-display text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Where the tea garden<br />
                <em className="not-italic text-earth-300">meets your soul</em>
              </h2>
            </div>

            <p className="text-base leading-relaxed text-forest-200/65">
              {displayAboutShort}
            </p>

            <div className="border-l-2 border-earth-400/40 pl-5">
              {displayAboutLong
                .split(/\n\n+/)
                .slice(0, 2)
                .map((para, i) => (
                  <p key={i} className={`text-sm leading-relaxed text-forest-300/60 ${i > 0 ? 'mt-3' : ''}`}>
                    {para}
                  </p>
                ))}
            </div>

            <Link
              href="/rooms"
              className="group inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-widest text-earth-400 transition hover:text-earth-300"
            >
              Explore our rooms
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div
          ref={statsRef}
          className={`reveal ${statsVisible ? 'visible' : ''} mt-20 grid grid-cols-2 gap-px border border-forest-800/40 bg-forest-900/20 sm:grid-cols-4`}
        >
          {stats.map(({ value, label }, i) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 bg-[#060e07] px-6 py-8 text-center"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <span className="font-display text-4xl font-semibold text-earth-400 sm:text-5xl">
                {value}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-forest-400">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
