import HeroScrollSequence from './components/HeroScrollSequence';
import RoomsHorizontal from './components/RoomsHorizontal';
import AboutNature from './components/AboutNature';
import NearbyNature from './components/NearbyNature';
import BlogsNature from './components/BlogsNature';
import FacilitiesNature from './components/FacilitiesNature';
import RestaurantNature from './components/RestaurantNature';
import GalleryNature from './components/GalleryNature';
import ContactNature from './components/ContactNature';
import type { HomePageProps } from '@/templates';

export default function TemplateThreeHome({
  settings,
  rooms,
  gallery,
  menu,
  nearbyExplore,
  blogs,
}: HomePageProps) {
  return (
    <div className="bg-[#030d04]">
      <HeroScrollSequence resortName={settings.resortName} tagline={settings.tagline} />
      <RoomsHorizontal rooms={rooms} />
      <AboutNature
        aboutShort={settings.aboutShort}
        aboutShortBn={settings.aboutShortBn}
        aboutLong={settings.aboutLong}
        aboutLongBn={settings.aboutLongBn}
      />
      <NearbyNature section={nearbyExplore.section} spots={nearbyExplore.spots} />
      <BlogsNature blogs={blogs} />
      <FacilitiesNature />
      <RestaurantNature teaser={settings.restaurantTeaser} highlights={menu} />
      <GalleryNature items={gallery} />
      <ContactNature phone={settings.phone} email={settings.email} address={settings.address} />
    </div>
  );
}
