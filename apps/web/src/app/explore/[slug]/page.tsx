import Link from 'next/link';
import { notFound } from 'next/navigation';
import SpotCoverImage from '@/components/explore/SpotCoverImage';
import Container from '@/components/ui/Container';
import { getNearbySpotBySlug } from '@/lib/resort-api';
import { absoluteSpotImageUrlForMeta } from '@/lib/spot-image';
import type { Metadata } from 'next';
import L, { LParagraphs, LBullets } from '@/components/L';
import T from '@/components/T';

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const spot = await getNearbySpotBySlug(params.slug);
  if (!spot) return { title: 'Place not found' };
  const ogImage = absoluteSpotImageUrlForMeta(spot.imageUrl);
  const description = spot.bestFor || `${spot.title} — places near Sreemangal and Pina Vista.`;
  return {
    title: `${spot.title} · Explore`,
    description,
    openGraph: ogImage
      ? {
          title: `${spot.title} · Explore`,
          description,
          images: [{ url: ogImage, alt: spot.imageAlt || spot.title }],
        }
      : undefined,
    twitter: ogImage
      ? {
          card: 'summary_large_image',
          title: `${spot.title} · Explore`,
          description,
          images: [ogImage],
        }
      : undefined,
  };
}

export default async function ExploreSpotPage({ params }: Props) {
  const spot = await getNearbySpotBySlug(params.slug);
  if (!spot) notFound();

  return (
    <article className="min-h-screen bg-gradient-to-b from-cream via-stone-warm to-[#e8efe6] pb-20">
      <div className="relative h-[min(52vh,28rem)] w-full overflow-hidden bg-stone-900">
        <SpotCoverImage
          src={spot.imageUrl}
          alt={spot.imageAlt || spot.title}
          fill
          priority
          className="object-cover opacity-95"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/45 to-transparent" />
        <Container className="absolute inset-x-0 bottom-0 pb-8 pt-12 sm:pb-10">
          <nav className="text-xs text-white/75">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span className="mx-1.5">/</span>
            <Link href="/explore" className="hover:text-white">
              Explore
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-white/95"><L en={spot.title} bn={spot.titleBn} /></span>
          </nav>
          {spot.emoji ? (
            <span className="mt-4 inline-flex rounded-full bg-white/15 px-3 py-1 text-lg backdrop-blur-md" aria-hidden>
              {spot.emoji}
            </span>
          ) : null}
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold leading-tight text-white drop-shadow sm:text-4xl md:text-5xl">
            <L en={spot.title} bn={spot.titleBn} />
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            {spot.badge ? (
              <span className="rounded-full bg-white/20 px-3 py-1 font-semibold text-white backdrop-blur-sm">
                <L en={spot.badge} bn={spot.badgeBn} />
              </span>
            ) : null}
            {spot.distance ? (
              <span className="rounded-full border border-white/30 bg-black/25 px-3 py-1 text-forest-100 backdrop-blur-sm">
                <L en={spot.distance} bn={spot.distanceBn} />
              </span>
            ) : null}
          </div>
          {spot.bestFor ? (
            <p className="mt-3 max-w-2xl text-sm font-medium text-forest-100/95"><L en={spot.bestFor} bn={spot.bestForBn} /></p>
          ) : null}
        </Container>
      </div>

      <Container className="-mt-6 relative z-[1]">
        <div className="rounded-[1.35rem] border border-white/50 bg-white/85 p-6 shadow-card backdrop-blur-md sm:p-10">
          <LBullets en={spot.bullets} bn={spot.bulletsBn} />
          <div className="space-y-4 text-[0.95rem] leading-relaxed text-stone-700 sm:text-base">
            <LParagraphs en={spot.body} bn={spot.bodyBn} className="whitespace-pre-line" />
          </div>
          <div className="mt-10 border-t border-stone-200/80 pt-8">
            <Link
              href="/explore"
              className="inline-flex items-center gap-1 text-sm font-semibold text-forest-800 underline-offset-4 hover:text-forest-950 hover:underline"
            >
              ← <T en="All places" bn="সব জায়গা" />
            </Link>
          </div>
        </div>
      </Container>
    </article>
  );
}
