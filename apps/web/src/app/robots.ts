import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

// Rendered per request so the runtime SITE_URL (Docker) is used, not the build-time value.
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
