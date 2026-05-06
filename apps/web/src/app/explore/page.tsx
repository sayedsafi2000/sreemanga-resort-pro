import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import SpotCoverImage from '@/components/explore/SpotCoverImage';
import Container from '@/components/ui/Container';
import { getNearbyExplore } from '@/lib/resort-api';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore around Sreemangal',
  description: 'Places to visit near Nirjon Nature Hideout — Lawachara, tea gardens, waterfalls and more.',
};

export default async function ExploreIndexPage() {
  const { section, spots } = await getNearbyExplore();

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream via-stone-warm to-[#e8efe6] pb-20 pt-8 sm:pt-12">
      <Container>
        <nav className="text-xs text-stone-500">
          <Link href="/" className="hover:text-forest-800">
            Home
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-stone-700">Explore</span>
        </nav>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-forest-950 sm:text-4xl">
          {section.title || 'Around the resort'}
        </h1>
        {section.subtitle ? (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">{section.subtitle}</p>
        ) : null}

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
                  {spot.distance ? (
                    <p className="text-xs font-medium text-forest-800/90">{spot.distance}</p>
                  ) : null}
                  <span className="mt-1 inline-flex items-center gap-0.5 text-xs font-semibold text-forest-800">
                    Read more
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {spots.length === 0 ? (
          <p className="mt-10 rounded-xl border border-stone-200 bg-white/60 p-6 text-sm text-stone-600">
            No explore spots are published yet. Check back soon.
          </p>
        ) : null}
      </Container>
    </div>
  );
}
