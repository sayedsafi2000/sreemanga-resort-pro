import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';
import { getNearbyExplore } from '@/lib/resort-api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl;
  const paths = ['', '/rooms', '/booking', '/restaurant', '/gallery', '/contact', '/explore'];
  const staticEntries: MetadataRoute.Sitemap = paths.map((path) => ({
    url: `${base}${path || '/'}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : path === '/explore' ? 0.75 : 0.7,
  }));

  let exploreEntries: MetadataRoute.Sitemap = [];
  try {
    const { spots } = await getNearbyExplore();
    exploreEntries = spots.map((s) => ({
      url: `${base}/explore/${s.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.65,
    }));
  } catch {
    /* ignore */
  }

  return [...staticEntries, ...exploreEntries];
}
