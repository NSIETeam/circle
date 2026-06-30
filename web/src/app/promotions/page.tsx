'use client';

import React, { useState, useEffect } from 'react';
import { assetUrl } from '../../lib/asset';

const C = { primary: '#00A6E0', primaryLight: '#E6F7FD', bg: '#F5F6FA', text: '#333', textSub: '#666', textMuted: '#999', border: '#eee' };
const TYPE_COLORS: Record<string, string> = { '特价': '#FF3B30', '免租': '#34C759', '赠送': '#FF9500', '减免': '#5856D6' };

export default function PromotionsPage() {
  const [promos, setPromos] = useState<any[]>([]);

  useEffect(() => {
    fetch(assetUrl('/data/promotions.json')).then(r => r.json()).then(setPromos);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif' }}>
      <div style={{ background: '#fff', borderBottom: `2px solid ${C.primary}`, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px' }}>
          <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/`} style={{ fontSize: 18, fontWeight: 800, color: C.primary, textDecoration: 'none' }}>园圈</a>
          <span style={{ fontSize: 14, color: C.textMuted }}>| 限时优惠</span>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>限时招商优惠</div>
        <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 20 }}>精选特价房源 · 免租期 · 装修赠送 · 物业费减免，名额有限，先到先得</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
          {promos.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>
              <div style={{ position: 'relative', height: 160 }}>
                <img src={assetUrl(p.image)} alt={p.building_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.5) 100%)' }} />
                <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 12, fontWeight: 700, color: '#fff', background: TYPE_COLORS[p.type] || C.primary, padding: '3px 10px', borderRadius: 4 }}>{p.type}</span>
                <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12, color: '#fff' }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{p.building_name}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{p.park_name} · {p.region}</div>
                </div>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>{p.title}</div>
                <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5, marginBottom: 10 }}>{p.description}</div>
                <div style={{ background: C.primaryLight, borderRadius: 8, padding: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>{p.discount}</div>
                  {p.original_price !== p.promo_price && (
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                      <span style={{ textDecoration: 'line-through' }}>{p.original_price}元</span>
                      <span style={{ color: '#FF3B30', fontWeight: 700, marginLeft: 6 }}>{p.promo_price}元/㎡/天</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: C.textMuted }}>
                  <span>截止 {p.end_date}</span>
                  <span style={{ color: '#FF3B30', fontWeight: 600 }}>剩余 {p.remaining} 个名额</span>
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6, background: '#F8F9FB', padding: 6, borderRadius: 4 }}>条件：{p.conditions}</div>
                <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/`} style={{ display: 'block', textAlign: 'center', marginTop: 10, padding: '10px 0', borderRadius: 8, background: C.primary, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>立即咨询 · 领取优惠</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
