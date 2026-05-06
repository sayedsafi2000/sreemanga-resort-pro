import { siteUrl } from '@/lib/site';

/** Paths served by this Next app (`/rooms/...`, `/gallery/...`) — safe for `next/image`. */
export function isLocalPublicImagePath(src: string): boolean {
  const s = src.trim();
  return s.startsWith('/') && !s.startsWith('//');
}

/**
 * Absolute URL for OG / Twitter cards. Returns null for empty or `data:` URLs (not valid for OG).
 */
export function absoluteSpotImageUrlForMeta(src: string): string | null {
  const s = src.trim();
  if (!s || s.startsWith('data:')) return null;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('//')) return `https:${s}`;
  if (s.startsWith('/')) {
    const base = siteUrl.replace(/\/$/, '');
    return `${base}${s}`;
  }
  return s;
}
