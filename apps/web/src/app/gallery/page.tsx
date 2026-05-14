import type { Metadata } from 'next';
import GalleryGrid from '@/components/gallery/GalleryGrid';
import SectionHeading from '@/components/SectionHeading';
import Container from '@/components/ui/Container';
import DarkPageHeader from '@/templates/template-two/components/DarkPageHeader';
import { getGallery, getSettings } from '@/lib/resort-api';
import Image from 'next/image';
import type { GalleryItem } from '@/types/resort';

export const metadata: Metadata = {
  title: 'Gallery',
  description:
    'Photos from our eco-resort — tea hills, poolside evenings, garden paths, and dining at Nirjon Nature Escape.',
};

const aspectMap = [
  'aspect-[3/4]', 'aspect-square', 'aspect-[4/3]', 'aspect-[3/4]',
  'aspect-square', 'aspect-[4/3]', 'aspect-[3/4]', 'aspect-square',
  'aspect-[4/3]', 'aspect-[3/4]', 'aspect-square', 'aspect-[4/3]',
];

function DarkGalleryFull({ items }: { items: GalleryItem[] }) {
  return (
    <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
      {items.map((item, i) => (
        <div key={item.id} className="mb-3 break-inside-avoid overflow-hidden">
          <div className={`relative ${aspectMap[i % aspectMap.length]} w-full overflow-hidden group`}>
            <Image
              src={item.src}
              alt={item.alt}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              unoptimized={item.src.startsWith('http')}
            />
            <div className="absolute inset-0 bg-forest-950/0 transition-colors duration-300 group-hover:bg-forest-950/25" />
            <div className="absolute bottom-0 left-0 right-0 translate-y-full bg-gradient-to-t from-forest-950/80 to-transparent p-3 transition-transform duration-300 group-hover:translate-y-0">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-earth-400">
                {item.category}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function GalleryPage() {
  const [gallery, settings] = await Promise.all([getGallery(), getSettings()]);
  const isT2 = settings.activeTemplate === 'template-two' || settings.activeTemplate === 'template-three';

  if (isT2) {
    return (
      <div className="min-h-screen bg-[#060e07] pb-24">
        <DarkPageHeader
          eyebrow="Visual Journal"
          title="Through the Lens"
          subtitle="Light through the leaves, still water, and tables set for slow evenings."
        />
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <DarkGalleryFull items={gallery} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-24 pt-10 sm:pt-14">
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
