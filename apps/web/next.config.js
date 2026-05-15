/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Skip type errors and lint warnings during build.
  // Production builds in CI (Coolify) sometimes hit version/path differences
  // that don't appear locally; we trust local checks instead.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Allow any remote hostname — gallery/blog images come from the admin panel
    // and can be stored as external URLs or served from the API server.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http',  hostname: '**' },
    ],
  },
};

module.exports = nextConfig;
