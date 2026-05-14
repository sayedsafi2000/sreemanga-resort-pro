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
import type { HomePageProps } from '@/templates';

export default function TemplateOneHome({
  settings,
  rooms,
  gallery,
  menu,
  testimonials,
  nearbyExplore,
  blogs,
  heroImages,
}: HomePageProps) {
  return (
    <>
      <HeroSection
        resortName={settings.resortName}
        tagline={settings.tagline}
        taglineBn={settings.taglineBn}
        heroImages={heroImages}
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
