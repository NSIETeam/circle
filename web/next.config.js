/** @type {import('next').NextConfig} */
const isExport = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  output: isExport ? 'export' : undefined,
  images: { unoptimized: true },
  // GitHub Pages 部署在 /circle/ 子路径下
  basePath: isExport ? '/circle' : '',
  assetPrefix: isExport ? '/circle/' : '',
  ...(isExport ? {} : {
    async rewrites() {
      return [
        { source: '/api/:path*', destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*` },
      ];
    },
  }),
};

module.exports = nextConfig;
