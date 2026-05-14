import type { Metadata } from 'next';
import GalleryGrid from '@/components/gallery/GalleryGrid';
import SectionHeading from '@/components/SectionHeading';
import Container from '@/components/ui/Container';
import { getGallery } from '@/lib/resort-api';

export const metadata: Metadata = {
  title: 'Gallery',
  description:
    'Photos from our eco-resort — tea hills, poolside evenings, garden paths, and dining at Nirjon Nature Escape.',
};

export default async function GalleryPage() {
  const gallery = await getGallery();

  return (
    <div className="min-h-screen bg-cream pb-24 pt-10 sm:pt-14">
      {/* Grain texture */}
      <div className="pointer-events-none fixed inset-0 grain opacity-20" aria-hidden />

      <Container className="relative z-10">
        <SectionHeading
          eyebrow="Gallery · Moments in Green"
          title="Through the Lens"
          subtitle="Light through the leaves, still water, and tables set for slow evenings."
          decorate
        />
        <GalleryGrid items={gallery} />
      </Container>
    </div>
  );
}
