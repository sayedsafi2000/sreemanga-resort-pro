// SITE_URL is the runtime (server-only) override used by the Docker image; NEXT_PUBLIC_SITE_URL is
// the build-time value that also reaches client components.
export const siteUrl =
  (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002').replace(/\/$/, '');
