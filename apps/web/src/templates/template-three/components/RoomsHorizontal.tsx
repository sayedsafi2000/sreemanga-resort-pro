'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Room } from '@/types/resort';
import { useLanguage } from '@/contexts/LanguageContext';

export default function RoomsHorizontal({ rooms }: { rooms: Room[] }) {
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rooms.length) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add('(min-width: 768px)', () => {
        const track = trackRef.current!;
        const getAmt = () => track.scrollWidth - window.innerWidth + 128; // +128 for end padding

        gsap.to(track, {
          x: () => -getAmt(),
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: () => `+=${getAmt()}`,
            pin: true,
            scrub: 1.2,
            invalidateOnRefresh: true,
          },
        });

        // Stagger reveal cards
        const cards = gsap.utils.toArray<HTMLElement>('.t3-room-card');
        cards.forEach((card, i) => {
          gsap.fromTo(
            card,
            { opacity: 0, y: 30 },
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              delay: i * 0.08,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: sectionRef.current,
                start: 'top 80%',
                toggleActions: 'play none none none',
              },
            },
          );
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [rooms]);

  const CardEl = ({ room }: { room: Room }) => (
    <Link href="/rooms" className="t3-room-card group block flex-shrink-0">
      <div
        className="relative overflow-hidden rounded-2xl bg-[#0f2011]"
        style={{ width: 'clamp(260px, 26vw, 380px)', height: 'clamp(360px, 50vh, 520px)' }}
      >
        {room.images?.[0] ? (
          <img
            src={room.images[0]}
            alt={room.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a3a1e] to-[#0f2011]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
          <h3 className="font-display text-2xl text-white">{room.name}</h3>
          {room.price && (
            <p className="text-[#c8920c] text-sm font-sans mt-1">৳{room.price} / night</p>
          )}
          <span className="inline-block mt-3 text-[10px] uppercase tracking-widest text-white/50 font-sans group-hover:text-white/80 transition-colors">
              {t('View Details', 'বিস্তারিত দেখুন')} →
            </span>
        </div>
      </div>
    </Link>
  );

  return (
    <>
      {/* Mobile grid */}
      <section className="md:hidden bg-[#030d04] px-6 py-20">
        <div className="mb-10">
          <span className="text-[#3d7a4a] text-[10px] uppercase tracking-[0.35em] font-sans">{t('Our Rooms', 'আমাদের রুমসমূহ')}</span>
          <h2 className="font-display text-4xl text-white mt-3">{t('Curated Stays', 'বিশেষভাবে সাজানো আবাস')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {rooms.map(room => (
            <Link key={room.id} href="/rooms" className="group block">
              <div className="relative overflow-hidden rounded-2xl aspect-[4/3] bg-[#0f2011]">
                {room.images?.[0] && (
                  <img src={room.images[0]} alt={room.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-0 p-4">
                  <h3 className="font-display text-xl text-white">{room.name}</h3>
                  {room.price && <p className="text-[#c8920c] text-xs font-sans">৳{room.price} / night</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Desktop horizontal scroll */}
      <section ref={sectionRef} className="hidden md:block bg-[#030d04] overflow-hidden relative">
        <div
          ref={trackRef}
          className="flex gap-5 items-end pb-20 px-20"
          style={{ paddingTop: '140px', width: 'max-content' }}
        >
          {/* Label card */}
          <div className="flex-shrink-0 flex flex-col justify-end pb-4 pr-8" style={{ width: '18vw', minWidth: '200px' }}>
          <span className="text-[#3d7a4a] text-[10px] uppercase tracking-[0.35em] font-sans mb-4">{t('Our Rooms', 'আমাদের রুমসমূহ')}</span>
            <h2 className="font-display text-5xl lg:text-6xl text-white leading-tight">
              {t('Scroll', 'স্ক্রল করুন')}<br />{t('to', '')}<br />{t('Explore', 'ঘুরে দেখুন')}
            </h2>
            <Link
              href="/rooms"
              className="mt-6 inline-block text-xs uppercase tracking-widest text-[#c8920c] hover:text-[#d4a017] transition-colors"
            >
              {t('View All', 'সব রুম দেখুন')} →
            </Link>
          </div>

          {rooms.map(room => <CardEl key={room.id} room={room} />)}
          <div className="flex-shrink-0 w-20" />
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-6 left-20 right-20 h-px bg-[#1a3a1e]">
          <div className="h-full bg-[#c8920c] w-0 transition-none" style={{ width: '0%' }} />
        </div>
      </section>
    </>
  );
}
