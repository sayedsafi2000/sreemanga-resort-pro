import Image from 'next/image';
import Link from 'next/link';
import { Users, ArrowRight } from 'lucide-react';
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
        'group relative overflow-hidden rounded-2xl bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card-hover',
        className
      )}
    >
      <Link href={`/rooms/${room.id}`} className="block">
        {/* Image */}
        <div className="img-zoom relative aspect-[4/3] overflow-hidden bg-forest-100">
          <Image
            src={img}
            alt={room.name}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            sizes="(max-width:768px) 100vw, (max-width:1280px) 50vw, 33vw"
            loading="lazy"
            unoptimized={img.startsWith('http')}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/65 via-stone-900/15 to-transparent" />

          {/* Room type badge */}
          <span className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1 text-xs font-bold uppercase tracking-wider text-forest-800 shadow-sm backdrop-blur-sm">
            {ROOM_TYPE_LABEL[room.type]}
          </span>

          {/* Capacity badge */}
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            <Users className="h-3 w-3" aria-hidden />
            {room.capacity}
          </span>

          {/* Price overlaid on image bottom */}
          <div className="absolute bottom-3 left-3">
            <span className="font-display text-xl font-semibold text-white drop-shadow-md">
              ৳{room.price.toLocaleString()}
            </span>
            <span className="ml-1 text-sm font-normal text-white/75">/night</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-display text-xl font-semibold leading-snug text-stone-900 transition-colors group-hover:text-forest-800">
            {room.name}
          </h3>

          {room.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-500">
              {room.description}
            </p>
          )}

          {/* Footer row */}
          <div className="mt-4 flex items-center justify-between border-t border-forest-100/80 pt-4">
            <span className="flex items-center gap-1.5 text-xs font-medium text-stone-400">
              <Users className="h-3.5 w-3.5 text-forest-400" aria-hidden />
              {room.capacity} {room.capacity === 1 ? 'Guest' : 'Guests'}
            </span>
            <span className="flex items-center gap-1 text-sm font-semibold text-forest-700 transition-all group-hover:gap-2 group-hover:text-forest-800">
              View details
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
