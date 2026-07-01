/**
 * IKEA 宜家风格设计系统
 * 蓝黄主色 + Noto字体 + 大留白 + 圆角卡片 + 扁平 + 黄色价格标签
 */

// 宜家品牌色
export const IKEA = {
  blue: '#0058A3',        // 宜家蓝（主色）
  blueDark: '#004A86',
  blueLight: '#E5F0FA',
  yellow: '#FFDA1A',      // 宜家黄（强调/价格）
  yellowDark: '#FFC700',
  yellowLight: '#FFF9D6',
  text: '#111111',        // 近黑文字
  textSub: '#484848',
  textMuted: '#767676',
  bg: '#F5F5F5',
  bgWarm: '#FAF9F7',
  card: '#FFFFFF',
  border: '#E5E5E5',
  borderLight: '#F0F0F0',
  sale: '#E0001B',        // 促销红
  green: '#008A00',       // 政策绿
  orange: '#FF6B00',      // 佣金橙
  purple: '#5C4DA0',      // 管理紫
};

// 字体栈
export const FONT = "'Noto Sans SC', 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";

// 阴影
export const SHADOW = {
  card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  hover: '0 4px 16px rgba(0,88,163,0.12)',
  deep: '0 8px 24px rgba(0,0,0,0.10)',
};

// 圆角
export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
};

// 间距
export const SPACE = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
};

// 通用样式片段
export const ikeaCard = {
  background: IKEA.card,
  borderRadius: RADIUS.lg,
  boxShadow: SHADOW.card,
  border: `1px solid ${IKEA.borderLight}`,
  overflow: 'hidden' as const,
  transition: 'box-shadow 0.2s, transform 0.2s',
};

export const ikeaInput = {
  width: '100%',
  height: 48,
  padding: '0 16px',
  border: `1px solid ${IKEA.border}`,
  borderRadius: RADIUS.sm,
  fontSize: 15,
  fontFamily: FONT,
  color: IKEA.text,
  background: IKEA.card,
  outline: 'none',
};

// 黄色价格标签（宜家经典）
export const priceTag = {
  display: 'inline-block',
  background: IKEA.yellow,
  color: IKEA.text,
  padding: '4px 10px',
  borderRadius: RADIUS.sm,
  fontWeight: 700,
  fontSize: 14,
};
