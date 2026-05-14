import HeroFullscreen from './components/HeroFullscreen';
import RoomsSplit from './components/RoomsSplit';
import AboutCinematic from './components/AboutCinematic';
import NearbyDark from './components/NearbyDark';
import BlogsCinematic from './components/BlogsCinematic';
import FacilitiesDark from './components/FacilitiesDark';
import RestaurantDark from './components/RestaurantDark';
import GalleryMasonry from './components/GalleryMasonry';
import ContactDark from './components/ContactDark';
import type { HomePageProps } from '@/templates';

export default function TemplateTwoHome({
  settings,
  rooms,
  gallery,
  menu,
  nearbyExplore,
  blogs,
  heroImages,
}: HomePageProps) {
  return (
    <div className="bg-[#09100a]">
      <HeroFullscreen
        resortName={settings.resortName}
        tagline={settings.tagline}
        taglineBn={settings.taglineBn}
        heroImages={heroImages}
      />
      <RoomsSplit rooms={rooms} />
      <AboutCinematic
        aboutShort={settings.aboutShort}
        aboutShortBn={settings.aboutShortBn}
        aboutLong={settings.aboutLong}
        aboutLongBn={settings.aboutLongBn}
      />
      <NearbyDark section={nearbyExplore.section} spots={nearbyExplore.spots} />
      <BlogsCinematic blogs={blogs} />
      <FacilitiesDark />
      <RestaurantDark teaser={settings.restaurantTeaser} highlights={menu} />
      <GalleryMasonry items={gallery} />
      <ContactDark phone={settings.phone} email={settings.email} />
    </div>
  );
}
