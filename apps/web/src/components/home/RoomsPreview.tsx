'use client';

import Link from 'next/link';
import SectionHeading from '@/components/SectionHeading';
import Container from '@/components/ui/Container';
import RoomCard from '@/components/RoomCard';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Room } from '@/types/resort';

type Props = {
  rooms: Room[];
};

export default function RoomsPreview({ rooms }: Props) {
  const { t, tr } = useLanguage();
  const top = rooms.slice(0, 4);

  return (
    <section className="relative -mt-[30px] overflow-hidden bg-stone-warm dark:bg-[#0a0f0c] py-12 sm:py-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-forest-100/35 to-transparent dark:from-forest-900/35" aria-hidden />
      <Container className="relative z-10">
        <SectionHeading
          eyebrow={tr('sections', 'stay')}
          title={tr('sections', 'stayTitle')}
          subtitle={tr('sections', 'staySubtitle')}
          decorate
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {top.map((room, i) => (
            <RoomCard
              key={room.id}
              room={room}
              className={i === 1 ? 'sm:translate-y-0 xl:-translate-y-2 xl:shadow-soft' : ''}
            />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/rooms"
            className="inline-flex items-center gap-2 rounded-full border border-forest-200 bg-forest-50 px-6 py-2.5 text-sm font-medium text-forest-800 transition hover:bg-forest-100"
          >
            {tr('home', 'seeAllRooms')}
          </Link>
        </div>
      </Container>
    </section>
  );
}
