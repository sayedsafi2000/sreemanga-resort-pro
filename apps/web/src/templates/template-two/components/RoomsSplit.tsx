'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BedDouble, Users } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';
import type { Room } from '@/types/resort';

type Props = { rooms: Room[] };

function RoomSplitCard({ room, index }: { room: Room; index: number }) {
  const even = index % 2 === 0;
  const { ref, visible } = useReveal<HTMLDivElement>();

  const priceLabel = new Intl.NumberFormat('en-BD').format(room.price);
  const typeLabel = room.type.charAt(0) + room.type.slice(1).toLowerCase();

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'visible' : ''} grid min-h-[420px] sm:grid-cols-2`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      {/* Image side */}
      <div
        className={`relative overflow-hidden ${even ? 'sm:order-1' : 'sm:order-2'}`}
      >
        {room.mainImage || room.images[0] ? (
          <Image
            src={room.mainImage || room.images[0]}
            alt={room.name}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        ) : (
          <div className="absolute inset-0 bg-forest-900" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950/70 to-transparent" />
        {/* Type badge */}
        <span className="absolute left-5 top-5 border border-earth-400/40 bg-earth-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-earth-300 backdrop-blur-sm">
          {typeLabel}
        </span>
      </div>

      {/* Content side */}
      <div
        className={`flex flex-col justify-center bg-[#0a130b] px-8 py-10 sm:px-10 lg:px-14 ${even ? 'sm:order-2' : 'sm:order-1'}`}
      >
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.35em] text-earth-400">
          {typeLabel} Room
        </p>
        <h3 className="font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
          {room.name}
        </h3>

        {room.description && (
          <p className="mt-4 text-sm leading-relaxed text-forest-200/60 line-clamp-3">
            {room.description}
          </p>
        )}

        <div className="mt-6 flex items-center gap-5 text-xs text-forest-300/70">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-earth-500" />
            Up to {room.capacity} guests
          </span>
          {room.bedType && (
            <span className="flex items-center gap-1.5">
              <BedDouble className="h-3.5 w-3.5 text-earth-500" />
              {room.bedType}
            </span>
          )}
        </div>

        <div className="mt-8 flex items-end justify-between border-t border-forest-800/40 pt-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-forest-500">From</p>
            <p className="font-display text-3xl font-semibold text-white">
              ৳{priceLabel}
              <span className="ml-1 text-sm font-normal text-forest-400">/night</span>
            </p>
          </div>
          <Link
            href={`/rooms/${room.id}`}
            className="group inline-flex items-center gap-2 border border-earth-400/50 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-earth-400 transition-all duration-200 hover:border-earth-400 hover:bg-earth-400/10"
          >
            View Room
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RoomsSplit({ rooms }: Props) {
  const { ref: headRef, visible: headVisible } = useReveal<HTMLDivElement>();
  const top = rooms.slice(0, 3);

  return (
    <section className="bg-[#09100a] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div
          ref={headRef}
          className={`reveal ${headVisible ? 'visible' : ''} mb-16 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between`}
        >
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-8 bg-earth-400" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-earth-400">
                Accommodation
              </span>
            </div>
            <h2 className="font-display text-4xl font-semibold text-white sm:text-5xl">
              Rooms & Suites
            </h2>
          </div>
          <Link
            href="/rooms"
            className="group inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-forest-400 transition hover:text-earth-400"
          >
            All rooms
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Split cards */}
        <div className="divide-y divide-forest-900/60 border border-forest-900/60">
          {top.map((room, i) => (
            <RoomSplitCard key={room.id} room={room} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
