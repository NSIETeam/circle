import { NextRequest } from 'next/server';

// 预生成所有可能的 building ID 路径用于静态导出
export function generateStaticParams() {
  // 生成 1-72 的 ID
  return Array.from({ length: 72 }, (_, i) => ({ id: String(i + 1) }));
}

export const dynamicParams = true;

export default async function BuildingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
