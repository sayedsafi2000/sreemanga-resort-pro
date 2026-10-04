export type RoomType = 'STANDARD' | 'COUPLE' | 'DELUXE' | 'SUITE' | 'FAMILY' | 'PRESIDENTIAL';
/** Where the room sits on the property — the site groups rooms by this. */
export type RoomZone = 'TOWER' | 'ZONE_1' | 'ZONE_2' | 'ZONE_3';

export interface Room {
  id: string;
  name: string;
  roomCode?: string | null;
  type: RoomType;
  zone?: RoomZone | null;
  /** বাংলা copies entered in admin (optional) */
  nameBn?: string | null;
  descriptionBn?: string | null;
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
  /** বাংলা copies entered in admin (optional) */
  altBn?: string | null;
  categoryBn?: string | null;
  id: string;
  src: string;
  alt: string;
  category: string;
}

export interface MenuItem {
  /** বাংলা copies entered in admin (optional) */
  nameBn?: string | null;
  descriptionBn?: string | null;
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
  /** Payment accounts (admin Settings → Payment Accounts) */
  bkashNumber?: string;
  nagadNumber?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankBranch?: string;
  /** Bengali translations */
  resortNameBn?: string;
  taglineBn?: string;
  aboutShortBn?: string;
  aboutLongBn?: string;
  addressBn?: string;
  restaurantTeaserBn?: string;
  /** Active frontend template key */
  activeTemplate?: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role?: string;
  quoteBn?: string;
  authorBn?: string;
  roleBn?: string;
}

export interface PublicBookingInput {
  roomId: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  adults: number;
  /** Children aged 8+ — counted as extra persons (under-8s go in `children`, free). */
  childrenOver8?: number;
  children: number;
  preferredPaymentTiming: 'INSTANT' | 'LATER';
  preferredPaymentMethod?: 'BKASH' | 'NAGAD' | 'BANK_TRANSFER' | 'STRIPE';
  paymentTransactionId?: string;
  paymentProofImage?: string;
  checkInDate: string;
  checkOutDate: string;
  notes?: string;
  voucherCode?: string;
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
  /** বাংলা copies entered in admin (optional) */
  titleBn?: string | null;
  badgeBn?: string | null;
  distanceBn?: string | null;
  bulletsBn?: string[] | null;
  bestForBn?: string | null;
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
  bodyBn?: string | null;
  body: string;
}

export interface NearbyExplorePayload {
  section: {
    eyebrow: string;
    title: string;
    subtitle: string;
    footnote: string;
    eyebrowBn?: string;
    titleBn?: string;
    subtitleBn?: string;
    footnoteBn?: string;
  };
  spots: NearbySpotListItem[];
}

export interface BlogListItem {
  /** বাংলা copies entered in admin (optional) */
  titleBn?: string | null;
  summaryBn?: string | null;
  categoryBn?: string | null;
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
  contentBn?: string | null;
  content: string;
}
