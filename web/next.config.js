/** @type {import('next').NextConfig} */
const isExport = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  // GitHub Pages 静态导出
  output: isExport ? 'export' : undefined,
  images: { unoptimized: true },
  // 静态导出时不需要 rewrites
  ...(isExport ? {} : {
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
        },
      ];
    },
  }),
};

module.exports = nextConfig;
