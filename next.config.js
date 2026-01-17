/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow serving static HTML files from public/books
  async headers() {
    return [
      {
        source: '/books/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
