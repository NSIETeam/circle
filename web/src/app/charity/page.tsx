'use client';

import React, { useState } from 'react';
import { IKEA, FONT, SHADOW, RADIUS } from '../../lib/ikea-style';

const C = { primary: '#0058A3', primaryLight: '#E5F0FA', bg: '#F5F5F5', text: '#111', textSub: '#484848', textMuted: '#767676', border: '#E5E5E5', green: '#008A00', orange: '#FF6B00' };

const PROJECTS = [
  { id: 1, title: '青年创业免费工位计划', desc: '为毕业3年内创业者提供6个月免费工位+创业辅导', tag: '创业扶持', icon: 'rocket', raised: 86, target: 100, unit: '个工位', color: C.orange },
  { id: 2, title: '园区困难企业减租帮扶', desc: '经营困难企业可申请租金减免，平台联合园区共同兜底', tag: '纾困解难', icon: 'heart', raised: 43, target: 50, unit: '家企业', color: C.green },
  { id: 3, title: '残疾人就业安置', desc: '合作园区企业按比例安置残疾人就业，平台补贴社保', tag: '助残就业', icon: 'users', raised: 128, target: 200, unit: '个岗位', color: C.primary },
  { id: 4, title: '乡村产业振兴对接', desc: '把北京园区的产能外溢订单对接到乡村合作社', tag: '乡村振兴', icon: 'leaf', raised: 27, target: 60, unit: '个村镇', color: '#5C4DA0' },
  { id: 5, title: '老兵再就业绿色通道', desc: '退伍军人优先推荐园区安保/物业/物流岗位', tag: '拥军优属', icon: 'shield', raised: 65, target: 80, unit: '人', color: '#8B4513' },
  { id: 6, title: '公益课程进园区', desc: '免费为园区员工提供技能培训、法律讲座、健康义诊', tag: '知识普惠', icon: 'book', raised: 340, target: 500, unit: '人次', color: '#0066CC' },
];

const ICONS: Record<string, string> = {
  rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
  heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  handshake: '<path d="M11 17a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H6l-2 2v4a2 2 0 0 0 2 2h1"/><path d="M16 8l-2-2H9L5 10v4"/><path d="M19 11l2 2v4a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-2"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  chart: '<path d="M3 3v18h18"/><rect x="7" y="13" width="3" height="5"/><rect x="12" y="9" width="3" height="9"/><rect x="17" y="5" width="3" height="13"/>',
};

export default function CharityPage() {
  const [selTag, setSelTag] = useState('');
  const bp = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const tags = ['', '创业扶持', '纾困解难', '助残就业', '乡村振兴', '拥军优属', '知识普惠'];
  const list = selTag ? PROJECTS.filter(p => p.tag === selTag) : PROJECTS;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT }}>
      {/* 顶部 */}
      <div style={{ background: C.primary, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px' }}>
          <a href={`${bp}/`} style={{ fontSize: 22, fontWeight: 900, color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: '#FFDA1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.5"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" /></svg>
            </div>
            园圈
          </a>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>| 园圈公益</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${C.primary}, #003D6B)`, color: '#fff', padding: '56px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 12 }}>园圈公益</h1>
          <p style={{ fontSize: 16, opacity: 0.9, lineHeight: 1.7 }}>让产业园的发展惠及更多人 · 用商业的力量做温暖的事</p>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* 筛选 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {tags.map(t => (
            <button key={t} onClick={() => setSelTag(t)} style={{ padding: '6px 18px', borderRadius: 999, border: 'none', background: selTag === t ? C.primary : '#fff', color: selTag === t ? '#fff' : C.textSub, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}>{t || '全部'}</button>
          ))}
        </div>

        {/* 公益项目卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {list.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: RADIUS.lg, overflow: 'hidden', boxShadow: SHADOW.card, border: `1px solid ${C.border}` }}>
              <div style={{ padding: 20, background: `${p.color}0D`, borderTop: `4px solid ${p.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICONS[p.icon] }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{p.title}</div>
                    <span style={{ fontSize: 11, color: p.color, background: '#fff', padding: '1px 8px', borderRadius: 3, fontWeight: 600 }}>{p.tag}</span>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.6, minHeight: 42 }}>{p.desc}</div>
              </div>
              <div style={{ padding: 16 }}>
                {/* 进度 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
                  <span>已帮助 <b style={{ color: p.color, fontSize: 16 }}>{p.raised}</b> {p.unit}</span>
                  <span>目标 {p.target}</span>
                </div>
                <div style={{ height: 8, background: '#F0F0F0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(p.raised / p.target * 100, 100)}%`, background: p.color, borderRadius: 4, transition: 'width 0.6s' }} />
                </div>
                <button onClick={() => alert(`感谢您关注「${p.title}」！\n\n参与方式：\n1. 园区企业可提供资源/岗位\n2. 个人可捐赠或志愿服务\n3. 平台将匹配需求方与供给方\n\n点击确定提交参与意向`)} style={{ width: '100%', height: 40, borderRadius: 8, border: 'none', background: p.color, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 12, fontFamily: FONT }}>我要参与</button>
              </div>
            </div>
          ))}
        </div>

        {/* 公益理念 */}
        <div style={{ marginTop: 40, background: '#fff', borderRadius: RADIUS.lg, padding: 32, boxShadow: SHADOW.card, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 16 }}>我们的公益理念</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, maxWidth: 800, margin: '0 auto' }}>
            {[
              { icon: 'handshake', t: '商业向善', d: '用产业园的规模效应，降低公益成本' },
              { icon: 'target', t: '精准帮扶', d: '需求与资源精准匹配，不浪费一分善款' },
              { icon: 'chart', t: '阳光透明', d: '所有公益流向公开可查，接受监督' },
            ].map((v, i) => (
              <div key={i}>
                <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICONS[v.icon] || '' }} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.primary }}>{v.t}</div>
                <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4, lineHeight: 1.5 }}>{v.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
