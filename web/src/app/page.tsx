'use client';

import React, { useState } from 'react';
import { SvgIcon } from '../lib/icons';
import { IKEA, FONT, SHADOW, RADIUS } from '../lib/ikea-style';
import { ServiceProviderSheet } from '../components/ServiceProviderSheet';

const FEATURES = [
  { icon: 'ai', label: 'AI选址', desc: '智能匹配厂房', path: '/find' },
  { icon: 'tag', label: '限时优惠', desc: '特价免租房源', path: '/promotions' },
  { icon: 'chart', label: '成功案例', desc: '入驻企业故事', path: '/cases' },
  { icon: 'users', label: '经纪人合作', desc: '优先获客线索', path: '/agent-coop' },
  { icon: 'building', label: '发布房源', desc: '上架产业园', path: '/list-building' },
  { icon: 'wrench', label: '产业园端', desc: '管理房源线索', path: '/sales' },
  { icon: 'clipboard', label: 'AI诊断', desc: '企业成熟度评估', path: '/assessment' },
  { icon: 'map', label: '地图找房', desc: '地图选点定位', path: '/find' },
];

const SERVICES = [
  { icon: 'food', label: '订餐', desc: '园区食堂+外卖' },
  { icon: 'print', label: '文印', desc: '打印复印装订' },
  { icon: 'law', label: '法务', desc: '合同审查咨询' },
  { icon: 'hammer', label: '装修', desc: '厂房办公装修' },
  { icon: 'clip', label: '办公用品', desc: '采购配送' },
  { icon: 'truck', label: '物流', desc: '货运仓储' },
  { icon: 'briefcase', label: '工商注册', desc: '公司注册变更' },
  { icon: 'money', label: '财税', desc: '代理记账报税' },
  { icon: 'flask', label: '检测认证', desc: '环评消防认证' },
  { icon: 'wifi', label: '网络宽带', desc: '企业专线接入' },
  { icon: 'battery', label: '电力增容', desc: '配电改造' },
  { icon: 'car', label: '停车', desc: '月卡临停' },
];

export default function HomePage() {
  const [showAIKey, setShowAIKey] = useState(false);
  const [aiKey, setAiKey] = useState('');
  const [selService, setSelService] = useState<string | null>(null);
  const bp = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const go = (path: string) => { window.location.href = `${bp}${path}`; };

  return (
    <div style={{ minHeight: '100vh', background: IKEA.bg, fontFamily: FONT }}>
      {/* 顶部导航 — 宜家蓝底 */}
      <div style={{ background: IKEA.blue, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: RADIUS.sm, background: IKEA.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={IKEA.blue} strokeWidth="2.5"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" /></svg>
            </div>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>园圈</span>
          </div>
          <div style={{ flex: 1 }} />
          {/* 三角色方块 */}
          <div style={{ display: 'flex', gap: 8 }} className="nav-role-blocks">
            {[
              { label: '我是经纪人', path: '/agent-coop' },
              { label: '我是产业园', path: '/sales' },
              { label: '我是管理员', path: '/sales' },
            ].map(item => (
              <a key={item.label} href={`${bp}${item.path}`} style={{ textDecoration: 'none' }}>
                <div style={{ padding: '8px 16px', borderRadius: RADIUS.sm, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 13, fontWeight: 700, transition: 'background 0.2s', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
                  {item.label}
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Hero — 虚化滚动背景(核心功能) + 居中内容 */}
      <div className="hero-bg-wrap">
        {/* 虚化滚动背景：核心功能卡片双行错向滚动 */}
        <div className="hero-bg-scroll" aria-hidden>
          <div className="hero-bg-row r1">
            {[...FEATURES, ...FEATURES].map((f, i) => (
              <div key={i}>
                <SvgIcon name={f.icon} size={28} color="#333" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>{f.label}</span>
              </div>
            ))}
          </div>
          <div className="hero-bg-row r2">
            {[...FEATURES.slice().reverse(), ...FEATURES.slice().reverse()].map((f, i) => (
              <div key={i}>
                <SvgIcon name={f.icon} size={28} color="#333" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
        {/* 渐变遮罩，让中心内容更清晰 */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.85) 100%)', pointerEvents: 'none' }} />
        <div className="hero-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '120px 24px 110px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <h1 className="hero-title" style={{ fontSize: 56, fontWeight: 900, color: IKEA.text, marginBottom: 28, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            关于企业的一切<br />都在<span style={{ color: IKEA.blue }}>园圈</span>
          </h1>
          <p className="hero-sub" style={{ fontSize: 20, color: IKEA.textSub, marginBottom: 20, lineHeight: 1.6, fontWeight: 500 }}>
            AI智能选址 · 产业园入驻 · 企业服务生态 · 一站式解决企业空间需求
          </p>
          {/* 园圈公益入口栏 */}
          <a href={`${bp}/charity`} onClick={e => { e.preventDefault(); go('/charity'); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 999, background: IKEA.blueLight, color: IKEA.blue, fontSize: 14, fontWeight: 700, textDecoration: 'none', marginBottom: 36, cursor: 'pointer', transition: 'transform 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={IKEA.blue} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
            园圈公益 · 让产业园的发展惠及更多人
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={IKEA.blue} strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </a>
          <div className="hero-buttons" style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <button onClick={() => go('/find')} style={{ padding: '18px 44px', borderRadius: RADIUS.sm, border: 'none', background: IKEA.blue, color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, boxShadow: SHADOW.card, transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              AI帮我选址
            </button>
            <button onClick={() => go('/promotions')} style={{ padding: '18px 44px', borderRadius: RADIUS.sm, border: `2px solid ${IKEA.blue}`, background: '#fff', color: IKEA.blue, fontSize: 17, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
              查看优惠
            </button>
            <button onClick={() => go('/office')} style={{ padding: '18px 44px', borderRadius: RADIUS.sm, border: 'none', background: IKEA.yellow, color: IKEA.blue, fontSize: 17, fontWeight: 900, cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={IKEA.blue} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
              AI办公
            </button>
          </div>
        </div>
      </div>

      {/* 企业服务生态 — 真实可点击服务按钮 */}
      <div style={{ background: IKEA.blueLight, borderTop: `1px solid ${IKEA.borderLight}`, borderBottom: `1px solid ${IKEA.borderLight}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 24px' }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: IKEA.text, marginBottom: 8 }}>企业服务生态</h2>
          <p style={{ fontSize: 14, color: IKEA.textMuted, marginBottom: 28 }}>园区入驻后，一站搞定企业日常所需，点击直接获取服务</p>
          <div className="service-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {SERVICES.map(s => (
              <button key={s.label} onClick={() => setSelService(s.icon)} style={{ background: '#fff', borderRadius: RADIUS.md, padding: 20, border: `1px solid ${IKEA.borderLight}`, textAlign: 'center', boxShadow: SHADOW.card, cursor: 'pointer', fontFamily: FONT, transition: 'box-shadow 0.2s, transform 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = SHADOW.hover; e.currentTarget.style.transform = 'translateY(-3px)'; }} onMouseLeave={e => { e.currentTarget.style.boxShadow = SHADOW.card; e.currentTarget.style.transform = 'none'; }}>
                <div style={{ width: 44, height: 44, borderRadius: RADIUS.sm, background: IKEA.blueLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <SvgIcon name={s.icon} size={24} color={IKEA.blue} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: IKEA.text }}>{s.label}</div>
                <div style={{ fontSize: 11, color: IKEA.textMuted, marginTop: 2 }}>{s.desc}</div>
                <div style={{ fontSize: 11, color: IKEA.blue, marginTop: 6, fontWeight: 600 }}>点击获取 ›</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 底部 — 宜家蓝底 */}
      <div style={{ background: IKEA.blue, color: '#fff', padding: '48px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>园圈 · 产业地产招商平台</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 24 }}>关于企业的一切，都在园圈</div>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 24 }}>
            {['/find', '/promotions', '/cases', '/agent-coop', '/sales'].map((p, i) => (
              <a key={i} href={`${bp}${p}`} style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>{['选址', '优惠', '案例', '经纪人', '产业园'][i]}</a>
            ))}
          </div>
          <button onClick={() => setShowAIKey(true)} style={{ padding: '8px 16px', borderRadius: RADIUS.sm, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', fontFamily: FONT }}>DeepSeek API 设置</button>
        </div>
      </div>

      {/* DeepSeek API Key弹窗 */}
      {showAIKey && (
        <div onClick={() => setShowAIKey(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: 400, background: '#fff', borderRadius: RADIUS.lg, padding: 24, boxShadow: SHADOW.deep, animation: 'scaleIn 0.25s ease', fontFamily: FONT }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: IKEA.text, marginBottom: 12 }}>DeepSeek API 设置</div>
            <div style={{ fontSize: 13, color: IKEA.textMuted, marginBottom: 16, lineHeight: 1.6 }}>配置API Key后，AI选址、内容审核、销售客服将使用DeepSeek模型。</div>
            <input value={aiKey} onChange={e => setAiKey(e.target.value)} placeholder="sk-xxxxxxxxxxxx" style={{ width: '100%', height: 48, padding: '0 16px', border: `1px solid ${IKEA.border}`, borderRadius: RADIUS.sm, fontSize: 15, outline: 'none', fontFamily: FONT }} />
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button onClick={() => setShowAIKey(false)} style={{ flex: 1, height: 48, borderRadius: RADIUS.sm, border: `1px solid ${IKEA.border}`, background: '#fff', color: IKEA.textSub, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}>取消</button>
              <button onClick={() => { localStorage.setItem('deepseek_api_key', aiKey); setShowAIKey(false); alert('API Key已保存'); }} style={{ flex: 1, height: 48, borderRadius: RADIUS.sm, border: 'none', background: IKEA.blue, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 服务商选择弹层（美团式） */}
      {selService && <ServiceProviderSheet serviceKey={selService} onClose={() => setSelService(null)} />}
    </div>
  );
}
