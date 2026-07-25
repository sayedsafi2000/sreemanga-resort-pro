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
import logo from '@/assets/logo.jpg';
import heroSlideOne from '@/assets/481975880_623662033778151_8552626618543070325_n.jpg';
import heroSlideTwo from '@/assets/488846677_644425541701800_5934371764185234027_n.jpg';
import heroSlideThree from '@/assets/505802308_693720310105656_2079549114860582276_n.jpg';

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
    logo: `${siteUrl}${logo.src}`,
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
