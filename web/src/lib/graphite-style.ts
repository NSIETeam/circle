/**
 * Graphite Design System — for Circle
 * 哲学: 专业, 精准, 高效 (中性灰 + 品牌绿)
 */

// Graphite 色彩体系
export const G = {
  green:    '#10B981',  // 品牌绿 (主色)
  greenLt:  '#E7F8F2',
  greenDk:  '#0D9467',
  orange:   '#CA5010',  // 辅助橙 (佣金)
  orangeLt: '#FFF4CE',
  red:      '#D13438',  // 错误/警告

  // 中性色 (Neutral)
  fg1: '#1A1B25',  // 主文字
  fg2: '#4B5563',
  fg3: '#6B7280',
  bg1: '#FFFFFF',  // 卡片背景
  bg2: '#F9FAFB',  // 页面背景
  border: '#E5E7EB',  // 边框
  border2: '#F3F4F6',
};

// 字体栈: Inter (数字/英文) + Noto Sans SC (中文)
export const FONT = "'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// 阴影
export const SHADOW = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  hover: '0 6px 14px rgba(0,0,0,0.10), 0 0 3px rgba(0,0,0,0.05)',
};

// 圆角
export const RADIUS = { sm: 4, md: 6, lg: 8, xl: 12 };

// 间距 (8pt 网格)
export const SPACE = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
