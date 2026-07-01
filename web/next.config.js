/** @type {import('next').NextConfig} */
const isExport = process.env.GITHUB_PAGES === 'true';
// 自定义域名用根路径，GitHub Pages子路径用/circle
const envBase = process.env.NEXT_PUBLIC_BASE_PATH;
const basePath = isExport ? (envBase === undefined ? '/circle' : envBase) : '';

const nextConfig = {
  output: isExport ? 'export' : undefined,
  images: { unoptimized: true },
  basePath: basePath,
  assetPrefix: basePath ? `${basePath}/` : '',
  ...(isExport ? {} : {
    async rewrites() {
      return [
        { source: '/api/:path*', destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*` },
      ];
    },
  }),
};

module.exports = nextConfig;
