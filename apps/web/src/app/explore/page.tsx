import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, ArrowRight, MapPin } from 'lucide-react';
import SpotCoverImage from '@/components/explore/SpotCoverImage';
import Container from '@/components/ui/Container';
import DarkPageHeader from '@/templates/template-two/components/DarkPageHeader';
import { getNearbyExplore, getSettings } from '@/lib/resort-api';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore around Sreemangal',
  description: 'Places to visit near Nirjon Nature Hideout — Lawachara, tea gardens, waterfalls and more.',
};

export default async function ExploreIndexPage() {
  const [{ section, spots }, settings] = await Promise.all([
    getNearbyExplore(),
    getSettings(),
  ]);
  const isT2 = settings.activeTemplate === 'template-two' || settings.activeTemplate === 'template-three';

  if (isT2) {
    return (
      <div className="min-h-screen bg-[#09100a] pb-24">
        <DarkPageHeader
          eyebrow={section.eyebrow || 'Explore · Around'}
          title={section.title || 'Around the resort'}
          subtitle={section.subtitle}
        />
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          {spots.length === 0 ? (
            <p className="border border-forest-900/60 bg-[#0a130b] p-6 text-sm text-forest-500">
              No explore spots are published yet. Check back soon.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {spots.map((spot) => (
                <Link
                  key={spot.id}
                  href={`/explore/${spot.slug}`}
                  className="group relative flex min-h-[220px] flex-col justify-end overflow-hidden border border-forest-900/60 transition-all duration-300 hover:border-earth-400/30"
                >
                  {spot.imageUrl ? (
                    <Image
                      src={spot.imageUrl}
                      alt={spot.imageAlt || spot.title}
                      fill
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                      sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                      unoptimized={spot.imageUrl.startsWith('http')}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-forest-900" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-forest-950/90 via-forest-950/40 to-transparent" />
                  <div className="relative z-10 p-5">
                    <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-earth-400">
                      <MapPin className="h-3 w-3" />
                      {spot.distance}
                    </div>
                    <h2 className="font-display text-xl font-semibold text-white">
                      {spot.emoji} {spot.title}
                    </h2>
                    <p className="mt-1 text-xs text-forest-300/60 line-clamp-2">
                      {spot.bullets?.[0]}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-earth-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      Explore <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream via-stone-warm to-[#e8efe6] pb-20 pt-8 sm:pt-12">
      <Container>
        <nav className="text-xs text-stone-500">
          <Link href="/" className="hover:text-forest-800">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-stone-700">Explore</span>
        </nav>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-forest-950 sm:text-4xl">
          {section.title || 'Around the resort'}
        </h1>
        {section.subtitle && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
            {section.subtitle}
          </p>
        )}
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {spots.map((spot) => (
            <li key={spot.id}>
              <Link
                href={`/explore/${spot.slug}`}
                className="group flex overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-card backdrop-blur-sm transition hover:border-forest-200/90 hover:shadow-lg"
              >
                <div className="relative h-28 w-28 shrink-0 bg-stone-200 sm:h-32 sm:w-32">
                  <SpotCoverImage
                    src={spot.imageUrl}
                    alt={spot.imageAlt || spot.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="128px"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-3 sm:p-4">
                  <h2 className="font-display text-base font-semibold leading-snug text-forest-950 line-clamp-2">
                    {spot.title}
                  </h2>
                  {spot.distance && (
                    <p className="text-xs font-medium text-forest-800/90">{spot.distance}</p>
                  )}
                  <span className="mt-1 inline-flex items-center gap-0.5 text-xs font-semibold text-forest-800">
                    Read more <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {spots.length === 0 && (
          <p className="mt-10 rounded-xl border border-stone-200 bg-white/60 p-6 text-sm text-stone-600">
            No explore spots are published yet. Check back soon.
          </p>
        )}
      </Container>
    </div>
  );
}
