import fs from 'fs';
import path from 'path';

// 预生成所有房源ID的静态路径
export function generateStaticParams() {
  try {
    const idsPath = path.join(process.cwd(), 'public', 'data', 'building-ids.json');
    const ids = JSON.parse(fs.readFileSync(idsPath, 'utf-8'));
    return ids.map((id: string) => ({ id }));
  } catch {
    // 构建时文件不存在则返回空，允许 fallback
    return [];
  }
}

export const dynamicParams = true;

export default async function BuildingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
