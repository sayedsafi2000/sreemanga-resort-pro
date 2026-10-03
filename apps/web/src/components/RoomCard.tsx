'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Users, ArrowRight, MapPin } from 'lucide-react';
import type { Room } from '@/types/resort';
import { ROOM_TYPE_LABEL, ROOM_ZONE_LABEL } from '@/lib/room-labels';
import { fmtMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import fallbackRoomPhoto from '@public/pina-vista/09-hill-cottage.jpg';

type Props = {
  room: Room;
  className?: string;
  /** The home-page teaser hides prices; the rooms page and details show them. */
  showPrice?: boolean;
};

export default function RoomCard({ room, className, showPrice = true }: Props) {
  const { t, ta } = useLanguage();
  const img = room.mainImage || room.images[0] || fallbackRoomPhoto.src;
  const typeLabel = ROOM_TYPE_LABEL[room.type] ?? { en: room.type, bn: room.type };
  const zoneLabel = room.zone ? ROOM_ZONE_LABEL[room.zone] : null;

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
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/65 via-stone-900/15 to-transparent" />

          {/* Room kind badge */}
          <span className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1 text-xs font-bold uppercase tracking-wider text-forest-800 shadow-sm backdrop-blur-sm">
            {t(typeLabel.en, typeLabel.bn)}
          </span>

          {/* Capacity badge */}
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            <Users className="h-3 w-3" aria-hidden />
            {room.capacity}
          </span>

          {/* Bottom-left: price (rooms page) or zone (home teaser) */}
          <div className="absolute bottom-3 left-3 flex items-baseline gap-1">
            {showPrice ? (
              <>
                <span className="font-display text-xl font-semibold text-white drop-shadow-md">{fmtMoney(room.price)}</span>
                <span className="text-sm font-normal text-white/75">/{t('night', 'রাত')}</span>
              </>
            ) : zoneLabel ? (
              <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <MapPin className="h-3 w-3" aria-hidden />
                {t(zoneLabel.en, zoneLabel.bn)}
              </span>
            ) : null}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-display text-xl font-semibold leading-snug text-stone-900 transition-colors group-hover:text-forest-800">
            {room.name}
          </h3>
          {zoneLabel && showPrice && (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-forest-700">
              <MapPin className="h-3 w-3" aria-hidden />
              {t(zoneLabel.en, zoneLabel.bn)}
            </p>
          )}

          {room.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-500">
              {ta(room.description)}
            </p>
          )}

          {/* Footer row */}
          <div className="mt-4 flex items-center justify-between border-t border-forest-100/80 pt-4">
            <span className="flex items-center gap-1.5 text-xs font-medium text-stone-400">
              <Users className="h-3.5 w-3.5 text-forest-400" aria-hidden />
              {room.capacity} {room.capacity === 1 ? t('Guest', 'অতিথি') : t('Guests', 'জন অতিথি')}
            </span>
            <span className="flex items-center gap-1 text-sm font-semibold text-forest-700 transition-all group-hover:gap-2 group-hover:text-forest-800">
              {t('View details', 'বিস্তারিত দেখুন')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
