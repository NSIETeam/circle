// 静态资源路径工具 — 自动适配 GitHub Pages basePath
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** 拼接静态资源路径（图片、JSON等 public/ 下的文件） */
export function assetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  // 已经有basePath就不重复加
  if (BASE && path.startsWith(BASE)) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${p}`;
}
