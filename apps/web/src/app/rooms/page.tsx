import type { Metadata } from 'next';
import Link from 'next/link';
import RoomCard from '@/components/RoomCard';
import DarkRoomCard from '@/templates/template-two/components/DarkRoomCard';
import DarkPageHeader from '@/templates/template-two/components/DarkPageHeader';
import SectionHeading from '@/components/SectionHeading';
import Container from '@/components/ui/Container';
import { getRooms, getSettings } from '@/lib/resort-api';
import { ROOM_TYPE_LABEL, ROOM_TYPES } from '@/lib/room-labels';
import type { RoomType } from '@/types/resort';

export const metadata: Metadata = {
  title: 'Rooms',
  description:
    'Explore deluxe suites, family rooms, and garden villas at our Sreemangal nature resort. Filter by room type and book your stay.',
};

function isRoomType(v: string | undefined): v is RoomType {
  return !!v && (ROOM_TYPES as string[]).includes(v);
}

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const filter = isRoomType(searchParams?.type) ? searchParams.type : undefined;
  const [rooms, settings] = await Promise.all([
    getRooms(filter ? { type: filter } : undefined),
    getSettings(),
  ]);
  const isT2 = settings.activeTemplate === 'template-two' || settings.activeTemplate === 'template-three';

  if (isT2) {
    return (
      <div className="min-h-screen bg-[#09100a] pb-24">
        <DarkPageHeader
          eyebrow="Accommodation"
          title="Rooms & Suites"
          subtitle="Every room opens to greenery—choose a category, then view details and book your perfect stay."
        />
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Filter chips */}
          <div className="mb-10 flex flex-wrap gap-2">
            <DarkFilterChip href="/rooms" active={!filter}>All</DarkFilterChip>
            {ROOM_TYPES.map((t) => (
              <DarkFilterChip key={t} href={`/rooms?type=${t}`} active={filter === t}>
                {ROOM_TYPE_LABEL[t]}
              </DarkFilterChip>
            ))}
          </div>

          {rooms.length === 0 ? (
            <p className="border border-forest-900/60 bg-[#0a130b] p-8 text-center text-forest-400">
              No rooms in this category right now.{' '}
              <Link href="/rooms" className="font-semibold text-earth-400 underline">
                Clear filter
              </Link>
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <DarkRoomCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-24 pt-10 sm:pt-14">
      <Container>
        <SectionHeading
          align="left"
          eyebrow="Rooms"
          title="Find your rhythm"
          subtitle="Every room opens to greenery—choose a category, then view details."
        />
        <div className="mb-10 flex flex-wrap gap-2">
          <FilterChip href="/rooms" active={!filter}>All</FilterChip>
          {ROOM_TYPES.map((t) => (
            <FilterChip key={t} href={`/rooms?type=${t}`} active={filter === t}>
              {ROOM_TYPE_LABEL[t]}
            </FilterChip>
          ))}
        </div>
        {rooms.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-stone-600 shadow-card">
            No rooms in this category right now.{' '}
            <Link href="/rooms" className="font-semibold text-forest-800 underline">
              Clear filter
            </Link>
          </p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`rounded-full px-4 py-2 text-sm font-semibold shadow-card transition-all duration-200 hover:-translate-y-px ${
        active ? 'bg-forest-800 text-white shadow-soft' : 'bg-white text-stone-600 hover:bg-forest-50 hover:text-forest-800'
      }`}
    >
      {children}
    </Link>
  );
}

function DarkFilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-all duration-200 ${
        active
          ? 'border border-earth-400 bg-earth-400/10 text-earth-400'
          : 'border border-forest-800/60 text-forest-400 hover:border-forest-600 hover:text-forest-200'
      }`}
    >
      {children}
    </Link>
  );
}
