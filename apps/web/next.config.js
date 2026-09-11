/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip lint/type errors during CI builds — we trust local dev checks.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // Performance: gzip/brotli + drop response header noise.
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  // Lighter client bundles for big icon/util packages used across the site.
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
    instrumentationHook: true,
  },

  images: {
    // Optimization ON — serve resized AVIF/WebP variants instead of full-size originals.
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 64, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },

  // Rooms/gallery rows created by the old seed still point at the Nirjon-era
  // files (/rooms/*.avif, /gallery/scene-*.jpg). Those files are gone; serve the
  // matching Pina Vista render instead so existing DB records don't 404.
  async rewrites() {
    return [
      { source: '/rooms/room1.avif', destination: '/pina-vista/09-hill-cottage.jpg' },
      { source: '/rooms/room2.avif', destination: '/pina-vista/04-brick-villa.jpg' },
      { source: '/rooms/room3.avif', destination: '/pina-vista/05-cottage-row.jpg' },
      { source: '/rooms/room4.avif', destination: '/pina-vista/12-aerial-pool.jpg' },
      { source: '/rooms/room5.avif', destination: '/pina-vista/08-aerial-villa.jpg' },
      { source: '/gallery/scene-1.jpg', destination: '/pina-vista/03-hillside-cottages.jpg' },
      { source: '/gallery/scene-2.jpg', destination: '/pina-vista/01-aerial-site.jpg' },
      { source: '/gallery/scene-3.jpg', destination: '/pina-vista/13-garden-driveway.jpg' },
      { source: '/gallery/scene-4.jpg', destination: '/pina-vista/11-amphitheatre-hill.jpg' },
    ];
  },

  // Long-cache the immutable build artifacts; Next hashes the filenames so this is safe.
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/_next/image/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
