'use client';

import React, { useState, useEffect } from 'react';
import { assetUrl } from '../../lib/asset';

const C = { primary: '#00A6E0', primaryLight: '#E6F7FD', bg: '#F5F6FA', text: '#333', textSub: '#666', textMuted: '#999', border: '#eee' };

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [selIndustry, setSelIndustry] = useState('');

  useEffect(() => {
    fetch(assetUrl('/data/cases.json')).then(r => r.json()).then(setCases);
  }, []);

  const industries = ['', 'AI', '生物医药', '智能制造', '集成电路', '新能源'];
  const filtered = selIndustry ? cases.filter(c => c.industry === selIndustry) : cases;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: `2px solid ${C.primary}`, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px' }}>
          <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/`} style={{ fontSize: 18, fontWeight: 800, color: C.primary, textDecoration: 'none' }}>园圈</a>
          <span style={{ fontSize: 14, color: C.textMuted }}>| 成功案例</span>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>入驻企业成功案例</div>
        <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 20 }}>看看在园区成长起来的企业故事</div>

        {/* 产业筛选 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {industries.map(ind => (
            <button key={ind} onClick={() => setSelIndustry(ind)} style={{ padding: '6px 16px', borderRadius: 999, border: 'none', background: selIndustry === ind ? C.primary : '#fff', color: selIndustry === ind ? '#fff' : C.textSub, fontSize: 14, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>{ind || '全部'}</button>
          ))}
        </div>

        {/* 案例卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
          {filtered.map(c => (
            <div key={c.id} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>
              <div style={{ position: 'relative', height: 140 }}>
                <img src={assetUrl(c.image)} alt={c.company} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.5) 100%)' }} />
                <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12, color: '#fff' }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{c.company}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{c.park} · {c.space_type} · {c.area}㎡</div>
                </div>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  {c.tags.map((t: string) => <span key={t} style={{ fontSize: 11, color: C.primary, background: C.primaryLight, padding: '2px 8px', borderRadius: 3 }}>{t}</span>)}
                </div>
                <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6, marginBottom: 10 }}>{c.story}</div>
                <div style={{ display: 'flex', gap: 12, borderTop: '1px solid #f5f5f5', paddingTop: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: C.textMuted }}>成长成果</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#34C759', marginTop: 2 }}>{c.growth}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: C.textMuted }}>融资情况</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.primary, marginTop: 2 }}>{c.fundraising}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
