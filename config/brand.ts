/**
 * 品牌配置文件 — 所有品牌相关字符串必须走此文件
 * 禁止在代码中硬编码任何品牌名
 */
export const brand = {
  name: '园圈',
  nameEn: 'Circle',
  slogan: '产业地产招商撮合平台',
  description: '中国首个AI驱动的垂直产业地产招商撮合平台',
  copyright: `© ${new Date().getFullYear()} 园圈. All rights reserved.`,
  logo: '/logo.svg',
  favicon: '/favicon.ico',
  primaryColor: '#2563EB',
  secondaryColor: '#059669',

  // 运营方
  operator: {
    name: '宏创',
    description: '平台运营方'
  },

  // SEO
  seo: {
    title: '园圈 - 产业地产招商撮合平台',
    keywords: '产业园,厂房租赁,产业地产,招商,园区,工业用地',
    description: '园圈是AI驱动的产业地产招商撮合平台，连接产业园与经纪人'
  },

  // 联系信息
  contact: {
    email: 'contact@yuanquan.com',
    phone: '400-000-0000'
  }
} as const;

export type BrandConfig = typeof brand;
