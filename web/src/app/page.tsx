'use client';

import React, { useState } from 'react';
import { SvgIcon } from '../lib/icons';

const C = { primary: '#00A6E0', primaryLight: '#E6F7FD', bg: '#F5F6FA', text: '#333', textSub: '#666', textMuted: '#999' };

const FEATURES = [
  { icon: 'ai', label: 'AI选址', desc: '智能匹配厂房', path: '/find' },
  { icon: 'tag', label: '限时优惠', desc: '特价免租房源', path: '/promotions' },
  { icon: 'chart', label: '成功案例', desc: '入驻企业故事', path: '/cases' },
  { icon: 'users', label: '经纪人合作', desc: '优先获客线索', path: '/agent-coop' },
  { icon: 'building', label: '发布房源', desc: '上架产业园', path: '/list-building' },
  { icon: 'wrench', label: '销售端', desc: '管理房源线索', path: '/sales' },
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
  const bp = process.env.NEXT_PUBLIC_BASE_PATH || '';

  const go = (path: string) => { window.location.href = `${bp}${path}`; };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif' }}>
      {/* 顶部导航 */}
      <div style={{ background: '#fff', borderBottom: `2px solid ${C.primary}`, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" /></svg>
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, color: C.primary }}>园圈</span>
          </div>
          <div style={{ flex: 1 }} />
          <a href={`${bp}/agent-coop`} style={{ fontSize: 14, color: C.textSub, textDecoration: 'none' }}>经纪人</a>
          <a href={`${bp}/list-building`} style={{ fontSize: 14, color: C.textSub, textDecoration: 'none' }}>产业园</a>
          <a href={`${bp}/find`} style={{ fontSize: 14, color: C.primary, fontWeight: 600, background: C.primaryLight, padding: '6px 14px', borderRadius: 6, textDecoration: 'none' }}>开始选址 →</a>
        </div>
      </div>

      {/* Hero — 品牌口号 */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 20px 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: C.text, marginBottom: 12, letterSpacing: '-0.02em' }}>
          关于企业的一切，都在<span style={{ color: C.primary }}>园圈</span>
        </h1>
        <p style={{ fontSize: 18, color: C.textSub, marginBottom: 32, lineHeight: 1.6 }}>
          AI智能选址 · 产业园入驻 · 企业服务生态 · 一站式解决企业空间需求
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => go('/find')} style={{ padding: '14px 32px', borderRadius: 10, border: 'none', background: C.primary, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>AI帮我选址</button>
          <button onClick={() => go('/promotions')} style={{ padding: '14px 32px', borderRadius: 10, border: `1px solid ${C.primary}`, background: '#fff', color: C.primary, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>查看优惠</button>
        </div>
      </div>

      {/* 核心功能矩阵 */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 40px' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 16 }}>核心功能</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {FEATURES.map(f => (
            <button key={f.label} onClick={() => go(f.path)} style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #f0f0f0', cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,166,224,0.1)'} onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
              <div style={{ marginBottom: 8 }}><SvgIcon name={f.icon} size={28} /></div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{f.label}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{f.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 企业服务生态 */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 60px' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 16 }}>企业服务生态</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {SERVICES.map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #f0f0f0', textAlign: 'center' }}>
              <div style={{ marginBottom: 6 }}><SvgIcon name={s.icon} size={24} /></div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{s.label}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部 */}
      <div style={{ background: '#1a1a2e', color: '#fff', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>园圈 · 产业地产招商平台</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>关于企业的一切，都在园圈</div>
        <div style={{ marginTop: 16, display: 'flex', gap: 16, justifyContent: 'center' }}>
          <a href={`${bp}/find`} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}>选址</a>
          <a href={`${bp}/promotions`} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}>优惠</a>
          <a href={`${bp}/cases`} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}>案例</a>
          <a href={`${bp}/agent-coop`} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}>经纪人</a>
          <a href={`${bp}/sales`} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}>销售端</a>
        </div>
        <button onClick={() => setShowAIKey(true)} style={{ marginTop: 16, padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>DeepSeek API 设置</button>
      </div>

      {/* DeepSeek API Key弹窗 */}
      {showAIKey && (
        <div onClick={() => setShowAIKey(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: 380, background: '#fff', borderRadius: 12, padding: 20, animation: 'scaleIn 0.25s ease' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>DeepSeek API 设置</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>配置API Key后，AI选址、内容审核、销售客服将使用DeepSeek模型，体验更智能。</div>
            <input value={aiKey} onChange={e => setAiKey(e.target.value)} placeholder="sk-xxxxxxxxxxxx" style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button onClick={() => setShowAIKey(false)} style={{ flex: 1, height: 40, borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#666', fontSize: 14, cursor: 'pointer' }}>取消</button>
              <button onClick={() => {
                localStorage.setItem('deepseek_api_key', aiKey);
                setShowAIKey(false);
                alert('API Key已保存');
              }} style={{ flex: 1, height: 40, borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
