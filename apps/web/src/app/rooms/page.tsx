import type { Metadata } from 'next';
import Link from 'next/link';
import RoomCard from '@/components/RoomCard';
import SectionHeading from '@/components/SectionHeading';
import Container from '@/components/ui/Container';
import { getRooms } from '@/lib/resort-api';
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
  const rooms = await getRooms(filter ? { type: filter } : undefined);

  return (
    <div className="bg-cream pb-20 pt-10 sm:pt-14">
      <Container>
        <SectionHeading
          align="left"
          eyebrow="Rooms"
          title="Find your rhythm"
          subtitle="Every room opens to greenery—choose a category, then view details."
        />

        <div className="mb-10 flex flex-wrap gap-2">
          <FilterChip href="/rooms" active={!filter}>
            All
          </FilterChip>
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

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active ? 'bg-forest-800 text-white shadow-card' : 'bg-white text-stone-700 shadow-card hover:bg-forest-50'
      }`}
    >
      {children}
    </Link>
  );
}
