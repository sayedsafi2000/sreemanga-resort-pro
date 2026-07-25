import { cache } from 'react';
import type {
  BlogDetail,
  BlogListItem,
  ContactFormInput,
  GalleryItem,
  MenuItem,
  NearbyExplorePayload,
  NearbySpotDetail,
  PublicBookingInput,
  RoomAvailabilityCalendar,
  ResortSettings,
  Room,
  RoomType,
  Testimonial,
} from '@/types/resort';

function apiBase(): string {
  const browser = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/public').replace(/\/$/, '');
  // Docker SSR: localhost inside the web container is not the API host.
  const server = (process.env.INTERNAL_API_URL || browser).replace(/\/$/, '');
  return typeof window === 'undefined' ? server : browser;
}

// Bounded so a dead API can't stall every SSR render. 4s is well under
// Next.js dev's pipe timeout but long enough for cold starts on prod.
const FETCH_TIMEOUT_MS = 4000;

/**
 * Resilient fetch — returns null on any failure (network, non-2xx, JSON parse,
 * timeout). Render code never crashes when the API is unreachable.
 *
 * Uses an explicit AbortController + timeout because relying on undici's
 * default behaviour lets ECONNREFUSED surface as an unhandled rejection in
 * Next.js 14 dev, killing the response pipe.
 */
async function safeFetch<T>(url: string, init?: RequestInit): Promise<T | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) return null;
    try {
      return (await res.json()) as T;
    } catch {
      return null;
    }
  } catch {
    // Network failure (ECONNREFUSED, timeout, DNS, TLS) — render with defaults.
    return null;
  } finally {
    clearTimeout(t);
  }
}

function mapSettingsFromDb(raw: Record<string, string>): ResortSettings {
  return {
    resortName: raw.resortName || "Nirjon Nature's Hideout",
    tagline: raw.tagline || 'Nature retreat in Sreemangal',
    aboutShort: raw.aboutShort || raw.resortDescription || 'Nature-focused resort stay with calm hospitality.',
    aboutLong:
      raw.aboutLong ||
      raw.resortDescription ||
      'Enjoy tea gardens, fresh air, and a peaceful stay at our Sreemangal resort.',
    heroImage: raw.heroImage || '/rooms/room1.avif',
    logoUrl: raw.logoUrl || undefined,
    address: raw.resortAddress || raw.address || 'Sreemangal, Moulvibazar',
    phone: raw.resortPhone || raw.phone || '+8801700000000',
    email: raw.resortEmail || raw.email || 'info@resortnirjon.com',
    mapEmbedUrl: raw.mapEmbedUrl || '',
    social: {
      facebook: raw.socialFacebook || undefined,
      instagram: raw.socialInstagram || undefined,
      youtube: raw.socialYoutube || undefined,
    },
    restaurantTeaser:
      raw.restaurantTeaser || 'Seasonal dishes with local ingredients served fresh every day.',
    bkashNumber: raw.bkashNumber || undefined,
    bankAccountName: raw.bankAccountName || undefined,
    bankAccountNumber: raw.bankAccountNumber || undefined,
    bankName: raw.bankName || undefined,
    bankBranch: raw.bankBranch || undefined,
    resortNameBn: raw.site_name_bn || '',
    taglineBn: raw.tagline_bn || '',
    aboutShortBn: raw.aboutShort_bn || '',
    aboutLongBn: raw.aboutLong_bn || '',
    activeTemplate: raw.activeTemplate || 'template-one',
  };
}

async function getSettingsUncached(): Promise<ResortSettings> {
  const data = await safeFetch<{ success: boolean; settings: Record<string, string> }>(
    `${apiBase()}/settings`,
    { cache: 'no-store' },
  );
  return mapSettingsFromDb(data?.settings || {});
}

export const getSettings = cache(getSettingsUncached);

async function getRoomsUncached(filters?: { type?: RoomType | string }): Promise<{
  rooms: Room[];
  ok: boolean;
}> {
  const q = new URLSearchParams();
  if (filters?.type) q.set('type', filters.type);
  const url = `${apiBase()}/rooms${q.toString() ? `?${q}` : ''}`;
  const data = await safeFetch<{ success: boolean; rooms: Room[] }>(url, {
    next: { revalidate: 15 },
  });
  if (!data) return { rooms: [], ok: false };
  return { rooms: data.rooms || [], ok: true };
}

export const getRooms = cache(getRoomsUncached);

async function getRoomByIdUncached(id: string): Promise<Room | null> {
  const data = await safeFetch<{ success: boolean; room: Room }>(
    `${apiBase()}/rooms/${id}`,
    { next: { revalidate: 15 } },
  );
  return data?.room ?? null;
}

export const getRoomById = cache(getRoomByIdUncached);

async function getGalleryUncached(): Promise<GalleryItem[]> {
  const data = await safeFetch<{
    success: boolean;
    items: Array<{ id: string; imageUrl: string; alt: string; category: string }>;
  }>(`${apiBase()}/gallery`, { cache: 'no-store' });
  const rows = data?.items || [];
  return rows.map((row) => ({
    id: row.id,
    src: row.imageUrl,
    alt: (row.alt && row.alt.trim()) || 'Gallery photo',
    category: (row.category && row.category.trim()) || 'General',
  }));
}

export const getGallery = cache(getGalleryUncached);

const defaultNearbySection = (): NearbyExplorePayload['section'] => ({
  eyebrow: 'Explore · Around',
  title: 'Best places to explore around Nirjon Nature Hideout',
  subtitle:
    'Just a step out from the resort—jungles, tea gardens, waterfalls & light tea scents. Click the cards to read more.',
  footnote:
    'Distance is approximate by car route—may vary with traffic & roads. Winter at Baikka bill brings more bird activity.',
});

async function getNearbyExploreUncached(): Promise<NearbyExplorePayload> {
  const data = await safeFetch<{
    success: boolean;
    section: NearbyExplorePayload['section'];
    spots: NearbyExplorePayload['spots'];
  }>(`${apiBase()}/nearby-explore`, { next: { revalidate: 60 } });

  if (!data) return { section: defaultNearbySection(), spots: [] };

  const sec = data.section || defaultNearbySection();
  return {
    section: {
      eyebrow: sec.eyebrow || defaultNearbySection().eyebrow,
      title: sec.title || defaultNearbySection().title,
      subtitle: sec.subtitle || defaultNearbySection().subtitle,
      footnote: sec.footnote || defaultNearbySection().footnote,
    },
    spots: Array.isArray(data.spots) ? data.spots : [],
  };
}

export const getNearbyExplore = cache(getNearbyExploreUncached);

export async function getNearbySpotBySlug(slug: string): Promise<NearbySpotDetail | null> {
  const clean = slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean)) return null;
  const data = await safeFetch<{ success: boolean; spot: NearbySpotDetail }>(
    `${apiBase()}/nearby-spots/${encodeURIComponent(clean)}`,
    { cache: 'no-store' },
  );
  return data?.spot ?? null;
}

async function getRestaurantMenuUncached(category?: string): Promise<MenuItem[]> {
  const url = `${apiBase()}/menu${category ? `?category=${encodeURIComponent(category)}` : ''}`;
  const data = await safeFetch<{ success: boolean; menuItems: MenuItem[] }>(url, {
    next: { revalidate: 30 },
  });
  return data?.menuItems || [];
}

export const getRestaurantMenu = cache(getRestaurantMenuUncached);

// ── Day Long ────────────────────────────────────────────────────────────────
export interface DayLongProduct {
  id: string;
  name: string;
  category: 'POOL' | 'COTTAGE' | 'CONFERENCE' | 'EVENT' | 'PICNIC';
  description?: string | null;
  images: string[];
  basePrice: number;
  pricePerPerson?: number | null;
  maxCapacity?: number | null;
  minCapacity?: number | null;
  facilities?: string[] | null;
  availableSlots?: { start: string; end: string; label?: string }[] | null;
}

async function getDayLongProductsUncached(category?: string): Promise<DayLongProduct[]> {
  const url = `${apiBase()}/day-long/products${category ? `?category=${encodeURIComponent(category)}` : ''}`;
  const data = await safeFetch<{ success: boolean; products: DayLongProduct[] }>(url, {
    next: { revalidate: 30 },
  });
  return data?.products || [];
}

export const getDayLongProducts = cache(getDayLongProductsUncached);

export async function validatePublicVoucher(payload: {
  code: string;
  channel: 'ROOM' | 'DAY_LONG' | 'RESTAURANT';
  grossAmount: number;
  lineItems?: { itemType: string; itemId: string; amount: number }[];
  guestEmail?: string;
}): Promise<{ ok: boolean; message: string; discountAmount?: number; netAmount?: number }> {
  try {
    const res = await fetch(`${apiBase()}/vouchers/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(() => ({} as Record<string, unknown>));
    if (!res.ok) {
      const msg =
        (typeof j.message === 'string' && j.message) ||
        (typeof (j as any).error === 'string' && (j as any).error) ||
        'Invalid voucher';
      return { ok: false, message: msg };
    }
    return {
      ok: true,
      message: 'Voucher applied',
      discountAmount: j.discountAmount as number | undefined,
      netAmount: j.netAmount as number | undefined,
    };
  } catch {
    return { ok: false, message: 'Could not validate voucher' };
  }
}

export type PublicMineVoucher = {
  id: string;
  name: string;
  description?: string | null;
  discountType: string;
  discountValue: number;
  appliesRoom: boolean;
  appliesDayLong: boolean;
  appliesRestaurant: boolean;
  expiresAt?: string | null;
  codeHint: string;
  expired?: boolean;
  remaining?: number | null;
};

export async function fetchVouchersForEmail(
  email: string
): Promise<{ ok: boolean; vouchers: PublicMineVoucher[]; message?: string }> {
  try {
    const res = await fetch(`${apiBase()}/vouchers/for-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        vouchers: [],
        message: (typeof j.message === 'string' && j.message) || 'Could not load vouchers',
      };
    }
    return { ok: true, vouchers: Array.isArray(j.vouchers) ? j.vouchers : [] };
  } catch {
    return { ok: false, vouchers: [], message: 'Could not load vouchers' };
  }
}

export async function getDayLongProductById(id: string): Promise<DayLongProduct | null> {
  const data = await safeFetch<{ success: boolean; product: DayLongProduct }>(
    `${apiBase()}/day-long/products/${encodeURIComponent(id)}`,
    { cache: 'no-store' },
  );
  return data?.product ?? null;
}

export interface DayLongBookingInput {
  productId: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  bookingDate: string;
  slotStart: string;
  slotEnd: string;
  adults: number;
  children: number;
  notes?: string;
  voucherCode?: string;
}

export async function submitDayLongBooking(
  payload: DayLongBookingInput
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${apiBase()}/day-long/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let msg = 'Could not complete booking.';
      try {
        const j = await res.json();
        msg = j.message || msg;
      } catch {
        /* ignore */
      }
      return { ok: false, message: msg };
    }
    return { ok: true, message: 'Day-long booking submitted. We will contact you shortly.' };
  } catch {
    return { ok: false, message: 'Network error. Please try again.' };
  }
}

// ── Shareholder portal ──────────────────────────────────────────────────────
// The web-facing shareholder portal was removed; the admin app's /portal is the
// single shareholder surface. See docs/plan/12-SHAREHOLDER-POLISH-AND-NEXT.md.

export async function getTestimonials(): Promise<Testimonial[]> {
  const data = await safeFetch<{ success: boolean; settings: Record<string, string> }>(
    `${apiBase()}/settings`,
    { next: { revalidate: 60 } },
  );
  const raw = data?.settings || {};
  return [1, 2, 3]
    .map((n) => ({
      id: `t${n}`,
      quote: raw[`testimonial${n}Quote`] || '',
      author: raw[`testimonial${n}Author`] || '',
      role: raw[`testimonial${n}Role`] || undefined,
    }))
    .filter((t) => t.quote && t.author);
}

export async function submitPublicBooking(
  payload: PublicBookingInput
): Promise<{ ok: boolean; message: string; checkoutUrl?: string }> {
  try {
    const res = await fetch(`${apiBase()}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let msg = 'Could not complete booking.';
      try {
        const j = await res.json();
        msg = j.message || msg;
      } catch {
        /* ignore */
      }
      return { ok: false, message: msg };
    }
    const j = await res.json().catch(() => ({}));
    return {
      ok: true,
      message: 'Booking submitted successfully. We will contact you shortly.',
      checkoutUrl: j?.checkoutUrl,
    };
  } catch {
    return { ok: false, message: 'Network error. Please try again.' };
  }
}

export async function getRoomAvailabilityCalendar(params?: {
  roomId?: string;
  from?: string;
  days?: number;
}): Promise<RoomAvailabilityCalendar[]> {
  const q = new URLSearchParams();
  if (params?.roomId) q.set('roomId', params.roomId);
  if (params?.from) q.set('from', params.from);
  q.set('days', String(Math.min(Math.max(params?.days ?? 60, 1), 90)));

  const data = await safeFetch<{ success: boolean; rooms: RoomAvailabilityCalendar[] }>(
    `${apiBase()}/rooms/availability-calendar?${q.toString()}`,
    { next: { revalidate: 0 }, cache: 'no-store' },
  );
  return data?.rooms || [];
}

export async function submitContactForm(_payload: ContactFormInput): Promise<{ ok: boolean; message: string }> {
  return { ok: false, message: 'Contact endpoint not configured yet.' };
}

async function getBlogsUncached(): Promise<BlogListItem[]> {
  const data = await safeFetch<{ success: boolean; blogs: BlogListItem[] }>(
    `${apiBase()}/blogs`,
    { next: { revalidate: 60 } },
  );
  return data?.blogs || [];
}

export const getBlogs = cache(getBlogsUncached);

export async function getBlogBySlug(slug: string): Promise<BlogDetail | null> {
  const clean = slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean)) return null;
  const data = await safeFetch<{ success: boolean; blog: BlogDetail }>(
    `${apiBase()}/blogs/${encodeURIComponent(clean)}`,
    { cache: 'no-store' },
  );
  return data?.blog ?? null;
}

// ── OTP helpers ───────────────────────────────────────────────────────────

function publicApiBase(): string {
  return apiBase();
}

export async function sendBookingOtp(
  email: string
): Promise<{ ok: boolean; message: string; devOtp?: string }> {
  try {
    const res = await fetch(`${publicApiBase()}/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: j.message || 'Failed to send OTP.' };
    return { ok: true, message: j.message || 'OTP sent.', devOtp: j.devOtp };
  } catch {
    return { ok: false, message: 'Network error. Please try again.' };
  }
}

export async function verifyBookingOtp(email: string, otp: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${publicApiBase()}/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: j.message || 'Invalid OTP.' };
    return { ok: true, message: j.message || 'Verified.' };
  } catch {
    return { ok: false, message: 'Network error. Please try again.' };
  }
}

export interface StripeSessionStatus {
  paid: boolean;
  paymentStatus: string;
  bookingId: string | null;
  bookingStatus: string | null;
}

// Confirms a Stripe Checkout Session and fulfills the booking if paid.
// Used by /booking/success so payment confirmation works without the webhook.
export async function confirmStripeSession(sessionId: string): Promise<StripeSessionStatus | null> {
  const clean = sessionId.trim();
  if (!clean) return null;
  return safeFetch<StripeSessionStatus>(
    `${publicApiBase()}/stripe/session/${encodeURIComponent(clean)}`,
    { cache: 'no-store' },
  );
}
