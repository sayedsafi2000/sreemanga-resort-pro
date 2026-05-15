/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
