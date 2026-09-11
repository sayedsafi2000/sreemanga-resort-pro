import TemplateOneHome from '@/templates/template-one/HomePage';
import TemplateTwoHome from '@/templates/template-two/HomePage';
import TemplateThreeHome from '@/templates/template-three/HomePage';
import JsonLd from '@/components/seo/JsonLd';
import {
  getGallery,
  getNearbyExplore,
  getRestaurantMenu,
  getRooms,
  getSettings,
  getTestimonials,
  getBlogs,
} from '@/lib/resort-api';
import { siteUrl } from '@/lib/site';
import logoFull from '@/assets/logo-full.png';
import heroSlideOne from '@public/pina-vista/03-hillside-cottages.jpg';
import heroSlideTwo from '@public/pina-vista/06-aerial-cottages-pool.jpg';
import heroSlideThree from '@public/pina-vista/13-garden-driveway.jpg';

const templateMap = {
  'template-one': TemplateOneHome,
  'template-two': TemplateTwoHome,
  'template-three': TemplateThreeHome,
} as const;

export default async function HomePage() {
  const [settings, roomsResult, gallery, menu, testimonials, nearbyExplore, blogs] = await Promise.all([
    getSettings(),
    getRooms(),
    getGallery(),
    getRestaurantMenu(),
    getTestimonials(),
    getNearbyExplore(),
    getBlogs(),
  ]);
  const rooms = roomsResult.rooms;

  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.resortName,
    url: siteUrl,
    logo: `${siteUrl}${logoFull.src}`,
  };

  const heroImages = [heroSlideOne.src, heroSlideTwo.src, heroSlideThree.src];

  const activeKey = (settings.activeTemplate ?? 'template-one') as keyof typeof templateMap;
  const ActiveHome = templateMap[activeKey] ?? TemplateOneHome;

  return (
    <>
      <JsonLd data={orgLd} />
      <ActiveHome
        settings={settings}
        rooms={rooms}
        gallery={gallery}
        menu={menu}
        testimonials={testimonials}
        nearbyExplore={nearbyExplore}
        blogs={blogs}
        heroImages={heroImages}
      />
    </>
  );
}
