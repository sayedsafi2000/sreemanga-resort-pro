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
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/public').replace(/\/$/, '');
}

// Resilient fetch — returns null on any failure (network, non-2xx, JSON parse error)
// so render never crashes when the API is unreachable.
async function safeFetch<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
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

async function getRoomsUncached(filters?: { type?: RoomType | string }): Promise<Room[]> {
  const q = new URLSearchParams();
  if (filters?.type) q.set('type', filters.type);
  const url = `${apiBase()}/rooms${q.toString() ? `?${q}` : ''}`;
  const data = await safeFetch<{ success: boolean; rooms: Room[] }>(url, {
    next: { revalidate: 15 },
  });
  return data?.rooms || [];
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
  }>(`${apiBase()}/gallery`, { next: { revalidate: 15 } });
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

export async function submitPublicBooking(payload: PublicBookingInput): Promise<{ ok: boolean; message: string }> {
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
    return { ok: true, message: 'Booking submitted successfully. We will contact you shortly.' };
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
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/public').replace(/\/$/, '');
}

export async function sendBookingOtp(email: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${publicApiBase()}/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: j.message || 'Failed to send OTP.' };
    return { ok: true, message: j.message || 'OTP sent.' };
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
