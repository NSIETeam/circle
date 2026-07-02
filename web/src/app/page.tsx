'use client';

import React, { useState } from 'react';
import { SvgIcon } from '../lib/icons';
import { G, FONT, SHADOW, RADIUS, SPACE } from '../lib/graphite-style';
import { ServiceProviderSheet } from '../components/ServiceProviderSheet';

const FEATURES = [
  { icon: 'ai', label: 'AI选址', desc: '智能匹配厂房', path: '/find' },
  { icon: 'tag', label: '限时优惠', desc: '特价免租房源', path: '/promotions' },
  { icon: 'chart', label: '成功案例', desc: '入驻企业故事', path: '/cases' },
  { icon: 'users', label: '经纪人合作', desc: '优先获客线索', path: '/agent-coop' },
];

const SERVICES = [
  { icon: 'food', label: '订餐', desc: '园区食堂+外卖' },
  { icon: 'print', label: '文印', desc: '打印复印装订' },
  { icon: 'law', label: '法务', desc: '合同审查咨询' },
  { icon: 'hammer', label: '装修', desc: '厂房办公装修' },
  { icon: 'clip', label: '办公用品', desc: '采购配送' },
  { icon: 'truck', label: '物流', desc: '货运仓储' },
];

export default function HomePage() {
  const [showAIKey, setShowAIKey] = useState(false);
  const [selService, setSelService] = useState<string | null>(null);
  const bp = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const go = (path: string) => { window.location.href = `${bp}${path}`; };

  return (
    <div style={{ minHeight: '100vh', background: G.bg2, fontFamily: FONT }}>
      <header style={{ background: G.bg1, borderBottom: `1px solid ${G.border}`, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: SPACE.md, padding: `${SPACE.sm}px ${SPACE.lg}px` }}>
          <a href={`${bp}/`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <SvgIcon name="logo" size={36} />
            <span style={{ fontSize: 20, fontWeight: 800, color: G.fg1 }}>园圈</span>
          </a>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: SPACE.sm }}>
            <button onClick={() => go('/agent-coop')} style={{ background: 'transparent', border: 'none', color: G.fg2, fontSize: 14, fontWeight: 600, padding: '8px 12px', cursor: 'pointer' }}>我是经纪人</button>
            <button onClick={() => go('/sales')} style={{ background: 'transparent', border: 'none', color: G.fg2, fontSize: 14, fontWeight: 600, padding: '8px 12px', cursor: 'pointer' }}>我是产业园</button>
          </div>
          <button onClick={() => go('/find')} style={{ background: G.green, color: '#fff', border: 'none', borderRadius: RADIUS.md, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>开始选址</button>
        </div>
      </header>

      <main>
        <div className="hero-bg-wrap">
          <div className="hero-bg-scroll" aria-hidden>
            {[...FEATURES, ...FEATURES].map((f, i) => (
              <div key={i}>
                <SvgIcon name={f.icon} size={28} color={G.fg1} />
                <span style={{ fontSize: 14, fontWeight: 700, color: G.fg1 }}>{f.label}</span>
              </div>
            ))}
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.85) 100%)', pointerEvents: 'none' }} />
          <div className="hero-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '120px 24px 110px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
            <h1 style={{ fontSize: 52, fontWeight: 800, color: G.fg1, marginBottom: SPACE.lg, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              关于企业的一切，都在<span style={{ color: G.green }}>园圈</span>
            </h1>
            <p style={{ fontSize: 18, color: G.fg2, marginBottom: SPACE.xl, lineHeight: 1.7, maxWidth: 640, margin: `0 auto ${SPACE.xl}px` }}>
              AI 智能选址 · 产业园入驻 · 企业服务生态 · 一站式解决企业空间需求
            </p>
            <div style={{ display: 'flex', gap: SPACE.md, justifyContent: 'center' }}>
              <button onClick={() => go('/find')} style={{ padding: '14px 32px', borderRadius: RADIUS.md, border: 'none', background: G.green, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, boxShadow: SHADOW.md }}>AI帮我选址</button>
              <button onClick={() => go('/promotions')} style={{ padding: '14px 32px', borderRadius: RADIUS.md, border: `1px solid ${G.border}`, background: G.bg1, color: G.fg1, fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}>查看优惠</button>
            </div>
          </div>
        </div>

        <section style={{ maxWidth: 1200, margin: '0 auto', padding: `${SPACE.xxl}px ${SPACE.lg}px` }}>
          <div style={{ textAlign: 'center', marginBottom: SPACE.xl }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: G.fg1, marginBottom: SPACE.sm }}>企业服务生态</h2>
            <p style={{ fontSize: 16, color: G.fg2 }}>园区入驻后，一站搞定企业日常所需</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: SPACE.md }}>
            {SERVICES.map(s => (
              <button key={s.label} onClick={() => setSelService(s.icon)} style={{ background: G.bg1, borderRadius: RADIUS.lg, padding: SPACE.lg, border: `1px solid ${G.border}`, textAlign: 'center', boxShadow: SHADOW.sm, cursor: 'pointer', fontFamily: FONT, transition: 'box-shadow 0.2s' }}>
                <SvgIcon name={s.icon} size={28} color={G.green} />
                <div style={{ fontSize: 14, fontWeight: 700, color: G.fg1, marginTop: SPACE.sm }}>{s.label}</div>
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer style={{ background: G.bg1, color: G.fg2, padding: `${SPACE.xl}px ${SPACE.lg}px`, textAlign: 'center', marginTop: SPACE.xxl, borderTop: `1px solid ${G.border}` }}>
        <div style={{ fontSize: 13 }}>&copy; 2026 园圈 · 产业地产招商平台. All rights reserved.</div>
        <button onClick={() => setShowAIKey(true)} style={{ marginTop: SPACE.sm, background: 'transparent', border: 'none', color: G.fg3, fontSize: 12, cursor: 'pointer' }}>DeepSeek API</button>
      </footer>

      {showAIKey && <div/> /* ... AI Key 弹窗 ... */}
      {selService && <ServiceProviderSheet serviceKey={selService} onClose={() => setSelService(null)} />}
    </div>
  );
}
