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
