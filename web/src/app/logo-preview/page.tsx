'use client';

const BLUE = '#0058A3';
const YELLOW = '#FFDA1A';

const logos = [
  {
    id: 'A',
    name: '蓝环黄建',
    desc: '蓝色圆环(圈)包裹黄色厂房剪影，直扣"园圈"',
    dark: false,
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="52" fill="none" stroke="${BLUE}" stroke-width="10"/>
      <circle cx="60" cy="60" r="52" fill="none" stroke="${YELLOW}" stroke-width="10" stroke-dasharray="40 280" stroke-dashoffset="-50"/>
      <path d="M44 72V52l16-10 16 10v20z" fill="${YELLOW}"/>
      <rect x="52" y="60" width="6" height="12" fill="${BLUE}"/>
      <rect x="62" y="60" width="6" height="12" fill="${BLUE}"/>
    </svg>`
  },
  {
    id: 'B',
    name: '方块连接',
    desc: '蓝色产业园方块+黄色圆点连线，体现平台连接生态',
    dark: false,
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="18" width="38" height="38" rx="8" fill="${BLUE}"/>
      <rect x="64" y="64" width="38" height="38" rx="8" fill="${YELLOW}"/>
      <line x1="56" y1="56" x2="64" y2="64" stroke="${BLUE}" stroke-width="8" stroke-linecap="round"/>
      <circle cx="37" cy="37" r="5" fill="#fff"/>
      <rect x="76" y="76" width="14" height="14" rx="2" fill="${BLUE}"/>
    </svg>`
  },
  {
    id: 'C',
    name: '品牌字标',
    desc: '蓝底黄字"园圈"，字母化处理，识别度高',
    dark: false,
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="108" height="108" rx="24" fill="${BLUE}"/>
      <circle cx="44" cy="60" r="22" fill="none" stroke="${YELLOW}" stroke-width="7"/>
      <circle cx="82" cy="60" r="22" fill="none" stroke="${YELLOW}" stroke-width="7"/>
      <circle cx="63" cy="60" r="4" fill="${YELLOW}"/>
    </svg>`
  },
  {
    id: 'D',
    name: '厂房屋顶',
    desc: '黄色锯齿屋顶(厂房经典符号)+蓝色底座，产业感强',
    dark: false,
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="58" width="92" height="48" rx="6" fill="${BLUE}"/>
      <path d="M14 58 L26 38 L38 58 L50 38 L62 58 L74 38 L86 58 L98 38 L106 58 Z" fill="${YELLOW}"/>
      <rect x="30" y="74" width="14" height="20" rx="2" fill="${YELLOW}"/>
      <rect x="54" y="74" width="14" height="20" rx="2" fill="${YELLOW}"/>
      <rect x="78" y="74" width="14" height="20" rx="2" fill="${YELLOW}"/>
    </svg>`
  },
  {
    id: 'E',
    name: '深底蓝黄',
    desc: '深蓝底+黄圆+蓝建筑，沉稳商务，适合app图标',
    dark: true,
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="108" height="108" rx="26" fill="#003D6B"/>
      <circle cx="60" cy="54" r="34" fill="${YELLOW}"/>
      <path d="M44 70V54l16-10 16 10v16z" fill="${BLUE}"/>
      <rect x="52" y="60" width="5" height="10" fill="${YELLOW}"/>
      <rect x="62" y="60" width="5" height="10" fill="${YELLOW}"/>
    </svg>`
  },
  {
    id: 'F',
    name: '抽象双圈',
    desc: '蓝黄双圆环交叠，极简现代，像无穷连接',
    dark: false,
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="46" cy="60" r="34" fill="none" stroke="${BLUE}" stroke-width="12"/>
      <circle cx="74" cy="60" r="34" fill="none" stroke="${YELLOW}" stroke-width="12"/>
    </svg>`
  },
];

export default function LogoPreview() {
  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F5', fontFamily: "'Noto Sans SC', sans-serif", padding: '40px 20px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#111', marginBottom: 8 }}>园圈 Logo 方案</h1>
        <p style={{ fontSize: 15, color: '#767676', marginBottom: 32 }}>主色：宜家蓝 #0058A3 + 宜家黄 #FFDA1A</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {logos.map(l => (
            <div key={l.id} style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>
              <div style={{ width: 120, height: 120, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                dangerouslySetInnerHTML={{ __html: l.svg }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>方案 {l.id} · {l.name}</div>
              <div style={{ fontSize: 13, color: '#767676', marginTop: 4, lineHeight: 1.5 }}>{l.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
