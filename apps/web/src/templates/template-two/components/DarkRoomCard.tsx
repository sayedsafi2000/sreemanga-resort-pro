import Image from 'next/image';
import Link from 'next/link';
import { Users, ArrowRight } from 'lucide-react';
import type { Room } from '@/types/resort';
import { ROOM_TYPE_LABEL } from '@/lib/room-labels';
import fallbackRoomPhoto from '@/assets/room1.avif';

export default function DarkRoomCard({ room }: { room: Room }) {
  const img = room.mainImage || room.images[0] || fallbackRoomPhoto.src;

  return (
    <article className="group overflow-hidden border border-forest-900/60 bg-[#0a130b] transition-all duration-300 hover:border-earth-400/30">
      <Link href={`/rooms/${room.id}`} className="block">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={img}
            alt={room.name}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
            sizes="(max-width:768px) 100vw, (max-width:1280px) 50vw, 33vw"
            loading="lazy"
            unoptimized={img.startsWith('http')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a130b]/90 via-transparent to-transparent" />
          <span className="absolute left-3 top-3 border border-earth-400/40 bg-earth-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-earth-300 backdrop-blur-sm">
            {ROOM_TYPE_LABEL[room.type]}
          </span>
          <span className="absolute right-3 top-3 flex items-center gap-1 bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            <Users className="h-3 w-3" />
            {room.capacity}
          </span>
          <div className="absolute bottom-3 left-3">
            <span className="font-display text-xl font-semibold text-white drop-shadow-md">
              ৳{room.price.toLocaleString()}
            </span>
            <span className="ml-1 text-sm font-normal text-white/60">/night</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-display text-xl font-semibold leading-snug text-white transition-colors group-hover:text-earth-300">
            {room.name}
          </h3>
          {room.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-forest-400/70">
              {room.description}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-forest-900/60 pt-4">
            <span className="flex items-center gap-1.5 text-xs font-medium text-forest-500">
              <Users className="h-3.5 w-3.5 text-earth-600" />
              {room.capacity} {room.capacity === 1 ? 'Guest' : 'Guests'}
            </span>
            <span className="flex items-center gap-1 text-sm font-semibold uppercase tracking-wider text-earth-400 transition-all group-hover:gap-2">
              View details
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
