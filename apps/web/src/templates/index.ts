import type {
  ResortSettings,
  Room,
  GalleryItem,
  MenuItem,
  Testimonial,
  NearbyExplorePayload,
  BlogListItem,
} from '@/types/resort';

export type HomePageProps = {
  settings: ResortSettings;
  rooms: Room[];
  gallery: GalleryItem[];
  menu: MenuItem[];
  testimonials: Testimonial[];
  nearbyExplore: NearbyExplorePayload;
  blogs: BlogListItem[];
  heroImages: string[];
};

export type TemplateKey = 'template-one' | 'template-two' | 'template-three';

export const TEMPLATES: ReadonlyArray<{
  key: TemplateKey;
  name: string;
  description: string;
}> = [
  {
    key: 'template-one',
    name: 'Classic Elegance',
    description:
      'A refined nature-first design with soft cream tones, card grids, and gentle scroll reveals. Warm, welcoming, and timeless.',
  },
  {
    key: 'template-two',
    name: 'Immersive Premium',
    description:
      'A cinematic dark-mode experience with a fullscreen hero, dramatic editorial typography, bold split-section layouts, and gold accents.',
  },
  {
    key: 'template-three',
    name: 'Forest Awakening',
    description:
      'A super-animated nature journey with GSAP scroll sequences, horizontal room exploration, clip-path reveals, and deep forest aesthetics.',
  },
];
