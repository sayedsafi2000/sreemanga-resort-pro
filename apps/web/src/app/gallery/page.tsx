import type { Metadata } from 'next';
import GalleryGrid from '@/components/gallery/GalleryGrid';
import SectionHeading from '@/components/SectionHeading';
import Container from '@/components/ui/Container';
import { getGallery } from '@/lib/resort-api';

export const metadata: Metadata = {
  title: 'Gallery',
  description:
    'Photos from our eco-resort—tea hills, poolside evenings, garden paths, and dining at Nirjon Nature Escape.',
};

export default async function GalleryPage() {
  const gallery = await getGallery();
  return (
    <div className="bg-cream pb-20 pt-10 sm:pt-14">
      <Container>
        <SectionHeading
          title="Gallery"
          subtitle="Light through the leaves, still water, and tables set for slow evenings."
        />
        <GalleryGrid items={gallery} />
      </Container>
    </div>
  );
}
