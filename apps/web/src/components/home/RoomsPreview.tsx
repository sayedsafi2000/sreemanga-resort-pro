'use client';

import Link from 'next/link';
import SectionHeading from '@/components/SectionHeading';
import Container from '@/components/ui/Container';
import RoomCard from '@/components/RoomCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReveal, useRevealGroup } from '@/hooks/useReveal';
import type { Room } from '@/types/resort';

type Props = { rooms: Room[] };

export default function RoomsPreview({ rooms }: Props) {
  const { tr } = useLanguage();
  const top = rooms.slice(0, 4);

  const { ref: headRef, visible: headVisible } = useReveal<HTMLDivElement>();
  const { ref: gridRef, visible: gridVisible } = useRevealGroup<HTMLDivElement>();
  const { ref: ctaRef, visible: ctaVisible } = useReveal<HTMLDivElement>();

  return (
    <section className="relative -mt-[30px] overflow-hidden bg-stone-warm py-14 sm:py-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-forest-100/30 to-transparent" aria-hidden />

      <Container className="relative z-10">

        {/* Heading reveal */}
        <div
          ref={headRef}
          className={`reveal ${headVisible ? 'visible' : ''}`}
        >
          <SectionHeading
            eyebrow={tr('sections', 'stay')}
            title={tr('sections', 'stayTitle')}
            subtitle={tr('sections', 'staySubtitle')}
            decorate
          />
        </div>

        {/* Cards — stagger from container observer */}
        <div ref={gridRef} className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {top.map((room, i) => (
            <div
              key={room.id}
              className={`reveal ${gridVisible ? 'visible' : ''}`}
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <RoomCard room={room} />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          ref={ctaRef}
          className={`mt-10 text-center reveal ${ctaVisible ? 'visible' : ''}`}
          style={{ transitionDelay: '200ms' }}
        >
          <Link
            href="/rooms"
            className="inline-flex items-center gap-2 rounded-full border border-forest-200 bg-white px-7 py-3 text-sm font-semibold text-forest-800 shadow-card transition hover:bg-forest-50 hover:shadow-card-hover hover:-translate-y-px"
          >
            {tr('home', 'seeAllRooms')}
          </Link>
        </div>
      </Container>
    </section>
  );
}
