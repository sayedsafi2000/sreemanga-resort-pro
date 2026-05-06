import HeroSection from '@/components/home/HeroSection';
import AboutSection from '@/components/home/AboutSection';
import NearbySpotsSection from '@/components/home/NearbySpotsSection';
import RoomsPreview from '@/components/home/RoomsPreview';
import FacilitiesSection from '@/components/home/FacilitiesSection';
import RestaurantPreview from '@/components/home/RestaurantPreview';
import GalleryPreview from '@/components/home/GalleryPreview';
import TestimonialsSection from '@/components/home/TestimonialsSection';
import ContactCta from '@/components/home/ContactCta';
import BlogsSection from '@/components/home/BlogsSection';
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

export default async function HomePage() {
  const [settings, rooms, gallery, menu, testimonials, nearbyExplore, blogs] = await Promise.all([
    getSettings(),
    getRooms(),
    getGallery(),
    getRestaurantMenu(),
    getTestimonials(),
    getNearbyExplore(),
    getBlogs(),
  ]);

  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.resortName,
    url: siteUrl,
    logo: `${siteUrl}${logo.src}`,
  };

  return (
    <>
      <JsonLd data={orgLd} />
      <HeroSection
        resortName={settings.resortName}
        tagline={settings.tagline}
        taglineBn={settings.taglineBn}
        heroImages={[heroSlideOne.src, heroSlideTwo.src, heroSlideThree.src]}
      />
      <RoomsPreview rooms={rooms} />
      <AboutSection 
          aboutShort={settings.aboutShort} 
          aboutShortBn={settings.aboutShortBn}
          aboutLong={settings.aboutLong}
          aboutLongBn={settings.aboutLongBn}
        />
      <NearbySpotsSection section={nearbyExplore.section} spots={nearbyExplore.spots} />
      <BlogsSection blogs={blogs} />
      <FacilitiesSection />
      <RestaurantPreview teaser={settings.restaurantTeaser} highlights={menu} />
      <GalleryPreview items={gallery} reserveBottomForCta />
      <ContactCta
        phone={settings.phone}
        email={settings.email}
        compactBottom={testimonials.length > 0}
      />
      {testimonials.length > 0 && <TestimonialsSection items={testimonials} />}
    </>
  );
}
