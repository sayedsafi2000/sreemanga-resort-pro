import Image from 'next/image';
import Link from 'next/link';
import { Users } from 'lucide-react';
import type { Room } from '@/types/resort';
import { ROOM_TYPE_LABEL } from '@/lib/room-labels';
import { cn } from '@/lib/utils';
import fallbackRoomPhoto from '@/assets/room1.avif';

type Props = {
  room: Room;
  className?: string;
};

export default function RoomCard({ room, className }: Props) {
  const img = room.mainImage || room.images[0] || fallbackRoomPhoto.src;

  return (
    <article
      className={cn(
        'group overflow-hidden rounded-2xl bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-soft',
        className
      )}
    >
      <Link href={`/rooms/${room.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={img}
            alt={room.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width:768px) 100vw, 33vw"
            loading="lazy"
            unoptimized={img.startsWith('http')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent opacity-80" />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-forest-800 shadow">
            {ROOM_TYPE_LABEL[room.type]}
          </span>
        </div>
        <div className="p-5">
          <h3 className="font-display text-xl font-semibold text-stone-900 group-hover:text-forest-800">
            {room.name}
          </h3>
          {room.description && (
            <p className="mt-2 line-clamp-2 text-sm text-stone-600">{room.description}</p>
          )}
          <div className="mt-4 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm text-stone-500">
              <Users className="h-4 w-4" aria-hidden />
              {room.capacity} guests
            </span>
            <span className="text-lg font-semibold text-forest-800">
              ${room.price.toLocaleString()}
              <span className="text-sm font-normal text-stone-500"> / night</span>
            </span>
          </div>
          <span className="mt-4 inline-flex text-sm font-semibold text-forest-700">
            View details →
          </span>
        </div>
      </Link>
    </article>
  );
}
