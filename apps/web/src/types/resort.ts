export type RoomType = 'STANDARD' | 'DELUXE' | 'SUITE' | 'FAMILY' | 'PRESIDENTIAL';

export interface Room {
  id: string;
  name: string;
  roomCode?: string | null;
  type: RoomType;
  price: number;
  weekendPrice?: number | null;
  seasonalPrice?: number | null;
  extraGuestCharge?: number | null;
  status?: string;
  capacity: number;
  floorBuilding?: string | null;
  roomSizeSqft?: number | null;
  maxAdults?: number | null;
  maxChildren?: number | null;
  bedType?: string | null;
  description: string | null;
  mainImage?: string | null;
  images: string[];
  facilities?: Record<string, boolean> | null;
  foodOptions?: Record<string, string | boolean> | null;
  services?: Record<string, boolean> | null;
  experienceFeatures?: Record<string, boolean> | null;
  addOns?: Array<{ name: string; price: number; description?: string }> | null;
  bookingRules?: Record<string, string> | null;
}

export interface GalleryItem {
  id: string;
  src: string;
  alt: string;
  category: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string | null;
  image: string | null;
  isAvailable?: boolean;
  sortOrder?: number | null;
}

export interface ResortSettings {
  resortName: string;
  tagline: string;
  aboutShort: string;
  aboutLong: string;
  heroImage: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  mapEmbedUrl: string;
  social: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
  restaurantTeaser: string;
  /** Bengali translations */
  resortNameBn?: string;
  taglineBn?: string;
  aboutShortBn?: string;
  aboutLongBn?: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role?: string;
}

export interface PublicBookingInput {
  roomId: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  adults: number;
  children: number;
  preferredPaymentTiming: 'INSTANT' | 'LATER';
  preferredPaymentMethod?: 'BKASH' | 'BANK_TRANSFER';
  paymentTransactionId?: string;
  paymentProofImage?: string;
  checkInDate: string;
  checkOutDate: string;
  notes?: string;
}

export interface ContactFormInput {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export interface RoomAvailabilityDay {
  date: string;
  status: 'FREE' | 'BOOKED';
  bookingStatus: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | null;
}

export interface RoomAvailabilityCalendar {
  roomId: string;
  roomName: string;
  roomStatus: string;
  availability: RoomAvailabilityDay[];
}

/** Public home carousel — no `body` (loaded on detail page). */
export interface NearbySpotListItem {
  id: string;
  slug: string;
  title: string;
  emoji: string;
  badge: string;
  distance: string;
  bullets: string[];
  bestFor: string;
  imageUrl: string;
  imageAlt: string;
  sortOrder: number;
}

export interface NearbySpotDetail extends NearbySpotListItem {
  body: string;
}

export interface NearbyExplorePayload {
  section: {
    eyebrow: string;
    title: string;
    subtitle: string;
    footnote: string;
  };
  spots: NearbySpotListItem[];
}

export interface BlogListItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  imageUrl: string;
  category: string;
  authorName: string;
  tags: string[];
  sortOrder: number;
  isFeatured: boolean;
  createdAt: string;
}

export interface BlogDetail extends BlogListItem {
  content: string;
}
