/** @type {import('next').NextConfig} */
const isExport = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  output: isExport ? 'export' : undefined,
  images: { unoptimized: true },
  ...(isExport ? {} : {
    async rewrites() {
      return [
        { source: '/api/:path*', destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*` },
      ];
    },
  }),
};

module.exports = nextConfig;
