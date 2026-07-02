'use client';

import React, { useState, useEffect } from 'react';
import { assetUrl } from '../lib/asset';
import { commuteEstimate, navLink } from '../lib/subway';
import { IKEA, FONT, SHADOW } from '../lib/ikea-style';

const C = { primary: '#0058A3', primaryLight: '#E5F0FA', text: '#111', textSub: '#484848', textMuted: '#767676', border: '#E5E5E5', yellow: '#FFDA1A', sale: '#E0001B', green: '#008A00', orange: '#FF6B00' };

interface ParkDetailProps {
  parkName: string;
  region?: string;
  onClose: () => void;
  onChatPark?: (parkId: string, parkName: string) => void;
}

export function ParkDetail({ parkName, region, onClose, onChatPark }: ParkDetailProps) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [park, setPark] = useState<any>(null);
  const [selRoom, setSelRoom] = useState<any>(null);

  useEffect(() => {
    fetch(assetUrl('/data/buildings.json')).then(r => r.json()).then(data => {
      // 聚合同园区的所有房型
      const parkRooms = data.filter((b: any) => b.park_name === parkName || b.name === parkName);
      setRooms(parkRooms);
      setPark(parkRooms[0] || null);
    });
  }, [parkName]);

  if (!park) return (
    <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
      <div style={{ color: C.textMuted }}>加载中...</div>
    </div>
  );

  const commute = commuteEstimate(park.latitude, park.longitude);

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.primaryLight, zIndex: 500, overflowY: 'auto', fontFamily: FONT }}>
      {/* 头图 */}
      <div style={{ position: 'relative', height: 220 }}>
        <img src={assetUrl(park.images?.[0] || '/images/buildings/industrial1.jpg')} alt={parkName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.5) 100%)' }} />
        <button onClick={onClose} style={{ position: 'absolute', top: 16, left: 16, width: 36, height: 36, borderRadius: 18, border: 'none', background: 'rgba(0,0,0,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div style={{ position: 'absolute', bottom: 16, left: 20, right: 20, color: '#fff' }}>
          <div style={{ fontSize: 22, fontWeight: 900, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>{parkName}</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>{park.region} · {park.main_type || '产业园'}</div>
        </div>
      </div>

      {/* 地理导航 */}
      <div style={{ margin: 16, background: '#fff', borderRadius: 12, padding: 16, boxShadow: SHADOW.card }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
          地理位置与通勤
        </div>
        {commute.nearest && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ background: C.primary, color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>地铁</span>
            <span style={{ fontSize: 14, color: C.text }}>最近：{commute.nearest.name} <span style={{ color: C.textMuted }}>· {commute.nearest.dist}</span></span>
            <span style={{ fontSize: 12, color: C.green }}>步行{commute.walking}</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <a href={navLink(park.latitude, park.longitude, parkName)} target="_blank" rel="noopener noreferrer" style={{ flex: 1, height: 42, borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" /><circle cx="6.5" cy="16.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" /></svg>
            导航前往
          </a>
          <div style={{ flex: 1, height: 42, borderRadius: 8, background: C.primaryLight, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 11, color: C.textMuted }}>驾车到市中心</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>{commute.toCityCenter}</span>
          </div>
        </div>
      </div>

      {/* 上架房型 */}
      <div style={{ margin: '0 16px 16px' }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 12 }}>在售房型（{rooms.length}）</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rooms.map((r: any) => (
            <div key={r.id} onClick={() => setSelRoom(r)} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: SHADOW.card, cursor: 'pointer', display: 'flex' }}>
              <img src={assetUrl(r.images?.[0] || '/images/buildings/industrial1.jpg')} alt="" style={{ width: 110, height: 90, objectFit: 'cover', flexShrink: 0 }} />
              <div style={{ flex: 1, padding: 10, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>{r.total_area?.toLocaleString()}㎡ · {r.floor_height}m · {r.floor_load}T</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ background: C.yellow, color: C.primary, padding: '2px 8px', borderRadius: 4, fontSize: 13, fontWeight: 900 }}>{Number(r.rent_min).toFixed(1)}元/㎡/天</span>
                  <span style={{ fontSize: 11, color: C.orange, fontWeight: 700 }}>佣金{r.commission || Math.round(parseFloat(r.rent_min)*parseFloat(r.total_area)*30*2/10000*10)/10}万</span>
                </div>
              </div>
            </div>
          ))}
          {rooms.length === 0 && <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: C.textMuted, fontSize: 14 }}>暂无在售房型</div>}
        </div>
      </div>

      {/* 入驻政策 */}
      {park.policy?.length > 0 && (
        <div style={{ margin: '0 16px 16px', background: '#fff', borderRadius: 12, padding: 16, boxShadow: SHADOW.card }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 12 }}>入驻政策</div>
          {park.policy.map((p: string, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: i < park.policy.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" style={{ marginTop: 2, flexShrink: 0 }}><polyline points="20 6 9 17 4 12" /></svg>
              <span style={{ fontSize: 14, color: C.text, lineHeight: 1.5 }}>{p}</span>
            </div>
          ))}
        </div>
      )}

      {/* 已入驻企业 */}
      <div style={{ margin: '0 16px 16px', background: '#fff', borderRadius: 12, padding: 16, boxShadow: SHADOW.card }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 12 }}>已入驻企业</div>
        {[
          { name: '智芯科技', tag: 'AI · 已入驻2年' },
          { name: '康诺生物', tag: '生物医药 · 已入驻1年' },
          { name: '精工智造', tag: '智能制造 · 已入驻3年' },
        ].map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 2 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: C.primaryLight, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>{c.name[0]}</div>
            <div><div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{c.name}</div><div style={{ fontSize: 11, color: C.textMuted }}>{c.tag}</div></div>
          </div>
        ))}
      </div>

      {/* 底部操作 */}
      <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: `1px solid ${C.border}`, padding: 12, display: 'flex', gap: 10 }}>
        <button onClick={() => onChatPark?.(park.id || 'park_001', parkName)} style={{ flex: 1, height: 46, borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          私聊园区
        </button>
      </div>

      {/* 房型详情弹窗 */}
      {selRoom && (
        <div onClick={() => setSelRoom(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, background: '#fff', borderRadius: '16px 16px 0 0', maxHeight: '80vh', overflowY: 'auto', fontFamily: FONT }}>
            <div style={{ position: 'relative', height: 180 }}>
              <img src={assetUrl(selRoom.images?.[0] || '/images/buildings/industrial1.jpg')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => setSelRoom(null)} style={{ position: 'absolute', top: 12, right: 12, width: 30, height: 30, borderRadius: 15, border: 'none', background: 'rgba(0,0,0,0.4)', color: '#fff', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 8 }}>{selRoom.name}</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ background: C.yellow, color: C.primary, padding: '4px 10px', borderRadius: 6, fontSize: 14, fontWeight: 900 }}>{Number(selRoom.rent_min).toFixed(1)}元/㎡/天</span>
                {selRoom.commission && <span style={{ background: '#FFF8E5', color: C.orange, padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 700 }}>佣金{selRoom.commission}万</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[['面积', `${selRoom.total_area?.toLocaleString()}㎡`], ['层高', `${selRoom.floor_height}m`], ['承重', `${selRoom.floor_load}T/㎡`], ['电力', `${selRoom.power_capacity}KVA`]].map(([k, v]) => (
                  <div key={k} style={{ background: C.primaryLight, borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{k}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.primary }}>{v}</div>
                  </div>
                ))}
              </div>
              {selRoom.amenities?.length > 0 && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>配套设施</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{selRoom.amenities.map((a: string, i: number) => <span key={i} style={{ fontSize: 12, color: C.textSub, background: '#F0F0F0', padding: '4px 10px', borderRadius: 999 }}>{a}</span>)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
