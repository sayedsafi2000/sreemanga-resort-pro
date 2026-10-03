import type { Metadata } from 'next';
import Link from 'next/link';
import RoomCard from '@/components/RoomCard';
import DarkRoomCard from '@/templates/template-two/components/DarkRoomCard';
import DarkPageHeader from '@/templates/template-two/components/DarkPageHeader';
import SectionHeading from '@/components/SectionHeading';
import Container from '@/components/ui/Container';
import { getRooms, getSettings } from '@/lib/resort-api';
import T from '@/components/T';
import { ROOM_ZONE_LABEL, ROOM_ZONES, isRoomZone } from '@/lib/room-labels';

export const metadata: Metadata = {
  title: 'Rooms',
  description:
    'Explore deluxe suites, family rooms, and garden villas at our Sreemangal nature resort. Filter by room type and book your stay.',
};

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: { zone?: string };
}) {
  // Rooms are grouped by where they are on the property (Tower Building, Zone 1–3).
  const filter = isRoomZone(searchParams?.zone) ? searchParams.zone : undefined;
  const [roomsResult, settings] = await Promise.all([
    getRooms(filter ? { zone: filter } : undefined),
    getSettings(),
  ]);
  const rooms = roomsResult.rooms;
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
            <DarkFilterChip href="/rooms" active={!filter}><T en="All rooms" bn="সব রুম" /></DarkFilterChip>
            {ROOM_ZONES.map((z) => (
              <DarkFilterChip key={z} href={`/rooms?zone=${z}`} active={filter === z}>
                <T en={ROOM_ZONE_LABEL[z].en} bn={ROOM_ZONE_LABEL[z].bn} />
              </DarkFilterChip>
            ))}
          </div>

          {rooms.length === 0 ? (
            <p className="border border-forest-900/60 bg-[#0a130b] p-8 text-center text-forest-400">
              <T en="No rooms in this zone right now." bn="এই জোনে এখন কোনো রুম নেই।" />{' '}
              <Link href="/rooms" className="font-semibold text-earth-400 underline">
                <T en="Clear filter" bn="ফিল্টার সরান" />
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
          eyebrow={<T en="Rooms" bn="রুম" />}
          title={<T en="Find your rhythm" bn="আপনার ছন্দ খুঁজে নিন" />}
          subtitle={<T en="Every room opens to greenery — pick a building or zone, then view details." bn="প্রতিটি রুম থেকেই সবুজের দেখা — বিল্ডিং বা জোন বেছে নিয়ে বিস্তারিত দেখুন।" />}
        />
        <div className="mb-10 flex flex-wrap gap-2">
          <FilterChip href="/rooms" active={!filter}><T en="All rooms" bn="সব রুম" /></FilterChip>
          {ROOM_ZONES.map((z) => (
            <FilterChip key={z} href={`/rooms?zone=${z}`} active={filter === z}>
              <T en={ROOM_ZONE_LABEL[z].en} bn={ROOM_ZONE_LABEL[z].bn} />
            </FilterChip>
          ))}
        </div>
        {rooms.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-stone-600 shadow-card">
            <T en="No rooms in this zone right now." bn="এই জোনে এখন কোনো রুম নেই।" />{' '}
            <Link href="/rooms" className="font-semibold text-forest-800 underline">
              <T en="Clear filter" bn="ফিল্টার সরান" />
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
