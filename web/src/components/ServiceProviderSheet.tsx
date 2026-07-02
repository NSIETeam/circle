'use client';

import React from 'react';
import { PROVIDERS, SERVICE_LABELS, type ServiceProvider } from '../lib/service-providers';
import { IKEA, FONT, SHADOW } from '../lib/ikea-style';

interface Props {
  serviceKey: string;
  onClose: () => void;
}

export function ServiceProviderSheet({ serviceKey, onClose }: Props) {
  const list: ServiceProvider[] = PROVIDERS[serviceKey] || [];
  const label = SERVICE_LABELS[serviceKey] || '服务';

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, background: '#fff', borderRadius: '16px 16px 0 0', maxHeight: '80vh', display: 'flex', flexDirection: 'column', fontFamily: FONT, animation: 'scaleIn 0.25s ease' }}>
        {/* 头部 */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${IKEA.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: IKEA.text }}>{label}服务</div>
            <div style={{ fontSize: 12, color: IKEA.textMuted, marginTop: 2 }}>园区认证服务商 · 平台担保交易</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 15, border: 'none', background: '#F0F0F0', cursor: 'pointer', fontSize: 15 }}>✕</button>
        </div>
        {/* 服务商列表 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {list.map(p => (
            <div key={p.id} style={{ display: 'flex', gap: 12, padding: 14, borderBottom: `1px solid ${IKEA.borderLight}`, alignItems: 'flex-start' }}>
              {/* 头像 */}
              <div style={{ width: 48, height: 48, borderRadius: 10, background: IKEA.blueLight, color: IKEA.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, flexShrink: 0 }}>{p.name[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: IKEA.text }}>{p.name}</span>
                  {p.certified && <span style={{ fontSize: 10, color: '#fff', background: IKEA.blue, padding: '1px 6px', borderRadius: 3, fontWeight: 700 }}>认证</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: '#FF9500', fontWeight: 700 }}>★ {p.rating}</span>
                  <span style={{ color: IKEA.textMuted }}>{p.orders}单</span>
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                  {p.tags.map(t => <span key={t} style={{ fontSize: 11, color: IKEA.textSub, background: '#F5F5F5', padding: '2px 8px', borderRadius: 4 }}>{t}</span>)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: IKEA.blue, fontWeight: 700 }}>{p.price}</span>
                  <button onClick={() => alert(`已为您预约「${p.name}」，服务商将在30分钟内联系您确认需求`)} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: IKEA.blue, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>立即预约</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* 底部保障 */}
        <div style={{ padding: '10px 20px', borderTop: `1px solid ${IKEA.border}`, display: 'flex', justifyContent: 'space-around', fontSize: 11, color: IKEA.textMuted, flexShrink: 0, background: IKEA.bg }}>
          <span>✓ 平台认证</span><span>✓ 担保交易</span><span>✓ 售后无忧</span>
        </div>
      </div>
    </div>
  );
}
