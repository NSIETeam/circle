'use client';

import React from 'react';

const C = { primary: '#00A6E0', primaryLight: '#E6F7FD', bg: '#F5F6FA', text: '#333', textSub: '#666', textMuted: '#999' };

const ICON_PATHS: Record<string, string> = {
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  building: '<path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/>',
  clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
  chart: '<path d="M3 3v18h18"/><rect x="7" y="13" width="3" height="5"/><rect x="12" y="9" width="3" height="9"/><rect x="17" y="5" width="3" height="13"/>',
  tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
};

export default function AgentCoopPage() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: `2px solid ${C.primary}`, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px' }}>
          <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/`} style={{ fontSize: 18, fontWeight: 800, color: C.primary, textDecoration: 'none' }}>园圈</a>
          <span style={{ fontSize: 14, color: C.textMuted }}>| 经纪人合作</span>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
        {/* Hero */}
        <div style={{ background: `linear-gradient(135deg, ${C.primary}, #0088B8)`, borderRadius: 16, padding: 32, color: '#fff', marginBottom: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>成为园区主理经纪人</h1>
          <p style={{ fontSize: 15, opacity: 0.9 }}>优先获得企业选址线索 · 深耕园区获客 · 平台认证背书</p>
        </div>

        {/* 权益 */}
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16 }}>主理经纪人权益</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 32 }}>
          {[
            { icon: 'target', title: '园区线索优先分配', desc: '平台企业客户线索优先分发给园区主理经纪人' },
            { icon: 'building', title: '房源维护权限', desc: '可更新园区房源状态、价格和图片' },
            { icon: 'clipboard', title: '园区问答维护', desc: '可回答客户关于园区的常见问题' },
            { icon: 'chart', title: '案例发布权限', desc: '可发布带看和成交案例，提升专业形象' },
            { icon: 'tag', title: '平台认证标识', desc: '获得园圈平台认证经纪人标识' },
            { icon: 'users', title: '优惠活动优先权', desc: '参与限时优惠活动，获取更多客户咨询' },
          ].map((b, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #f0f0f0' }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#E6F7FD', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00A6E0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICON_PATHS[b.icon] || '' }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>{b.title}</div>
              <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>{b.desc}</div>
            </div>
          ))}
        </div>

        {/* 考核机制 */}
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16 }}>准入与动态考核</div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 32, border: '1px solid #f0f0f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { label: '园区业务知识', score: '25分', desc: '园区位置/参数/政策/行业匹配' },
              { label: '外部获客能力', score: '25分', desc: '中工招商/58/房天下发布数量' },
              { label: '房源发布质量', score: '20分', desc: '标题/参数/图片/适合行业' },
              { label: '房源维护能力', score: '15分', desc: '更新及时性/下架已租房源' },
              { label: '客户响应跟进', score: '10分', desc: '响应速度/跟进反馈' },
              { label: '带看与成交', score: '5分', desc: '带看次数/成交转化' },
            ].map((s, i) => (
              <div key={i} style={{ background: '#F8F9FB', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{s.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.primary }}>{s.score}</span>
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{s.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: 10, background: C.primaryLight, borderRadius: 8, fontSize: 13, color: C.primary, fontWeight: 600 }}>
            考核原则：数量是基础，质量是核心，维护是关键，转化是结果
          </div>
        </div>

        {/* 申请入驻 */}
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16 }}>申请入驻</div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #f0f0f0', maxWidth: 500 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label style={{ fontSize: 13, fontWeight: 600, color: C.textSub, marginBottom: 4, display: 'block' }}>姓名</label><input style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none' }} placeholder="请输入姓名" /></div>
            <div><label style={{ fontSize: 13, fontWeight: 600, color: C.textSub, marginBottom: 4, display: 'block' }}>手机号</label><input style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none' }} placeholder="请输入手机号" /></div>
            <div><label style={{ fontSize: 13, fontWeight: 600, color: C.textSub, marginBottom: 4, display: 'block' }}>所属机构</label><input style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none' }} placeholder="如：XX地产" /></div>
            <div><label style={{ fontSize: 13, fontWeight: 600, color: C.textSub, marginBottom: 4, display: 'block' }}>擅长空间类型</label><input style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none' }} placeholder="如：厂房/办公/仓库" /></div>
            <div><label style={{ fontSize: 13, fontWeight: 600, color: C.textSub, marginBottom: 4, display: 'block' }}>意向服务园区</label><input style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none' }} placeholder="如：亦庄经济技术开发区" /></div>
            <button onClick={() => alert('申请已提交，我们会在3个工作日内联系您')} style={{ height: 44, borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>提交申请</button>
          </div>
        </div>
      </div>
    </div>
  );
}
