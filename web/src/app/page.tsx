'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { parseRequirement, summarizeRequirement, type ParsedRequirement } from '../lib/agent-parser';
import { initSearchEngine, searchBuildings, type BuildingData } from '../lib/client-search';
import { assetUrl } from '../lib/asset';

// 动态导入地图（SSR安全）
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

interface Building extends BuildingData {
  match_score?: number;
  match_reason?: string;
}

const FILTERS = [
  { key: '', label: '全部' },
  { key: 'AI', label: 'AI' },
  { key: '生物医药', label: '生物医药' },
  { key: '智能制造', label: '智能制造' },
];



export default function HomePage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [filtered, setFiltered] = useState<Building[]>([]);
  const [selected, setSelected] = useState<Building | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'agent'; text: string }[]>([
    { role: 'agent', text: '说出你的需求，我来帮你找厂房。比如：生物医药厂房，3000平米以上，承重5吨' },
  ]);
  const [lastReq, setLastReq] = useState<ParsedRequirement | null>(null);
  const [pendingQ, setPendingQ] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [activeFilter, setActiveFilter] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  // 地图聚焦
  useEffect(() => {
    if (mapRef.current && mapCenter) {
      mapRef.current.flyTo(mapCenter, mapZoom || 12, { duration: 1.2 });
    }
  }, [mapCenter, mapZoom]);

  // 初始化引擎
  useEffect(() => {
    setIsClient(true);
    fetch(assetUrl('/data/buildings.json'))
      .then(r => r.json())
      .then((data: BuildingData[]) => {
        initSearchEngine(data);
        const withCoords = data.filter(b => b.latitude && b.longitude);
        setBuildings(withCoords);
        setFiltered(withCoords);
      });
  }, []);

  // 修复Leaflet图标 + 注册地图实例
  useEffect(() => {
    if (!isClient) return;
    import('leaflet').then((L) => {
      (L as any).Map.addInitHook(function(this: any) {
        (window as any).__circleMap = this;
      });
    });
  }, [isClient]);

  // 执行搜索 + 地图聚焦
  const doSearch = useCallback((req: ParsedRequirement, query: string) => {
    setLoading(true);
    const results = searchBuildings(query, {
      industry: req.industry, region: req.region, min_area: req.min_area,
      max_area: req.max_area, max_rent: req.max_rent, min_height: req.min_height,
      min_load: req.min_load, min_power: req.min_power,
    }, 20);
    const mapped = results.map(r => ({ ...r.building, match_score: r.score, match_reason: r.reasons[0] }));
    setFiltered(mapped);

    // 聚焦到结果中心
    if (mapped.length > 0) {
      const avgLat = mapped.reduce((s, b) => s + b.latitude, 0) / mapped.length;
      const avgLng = mapped.reduce((s, b) => s + b.longitude, 0) / mapped.length;
      setMapCenter([avgLat, avgLng]);
      setMapZoom(mapped.length > 5 ? 11 : 12);
    }
    setLoading(false);
    return mapped;
  }, []);

  // AI对话发送
  const handleAISend = (text?: string) => {
    const query = (text || aiInput).trim();
    if (!query) return;
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', text: query }]);

    // 上下文记忆
    const baseReq: Partial<ParsedRequirement> = lastReq || {};
    if (pendingQ && lastReq) {
      const num = query.match(/^(\d+\.?\d*)$/);
      if (num) {
        const n = parseFloat(num[1]);
        if (pendingQ === 'area') baseReq.min_area = n <= 50 ? n * 10000 : n;
        else if (pendingQ === 'load') baseReq.min_load = n;
        else if (pendingQ === 'height') baseReq.min_height = n;
        else if (pendingQ === 'rent') baseReq.max_rent = n;
        setPendingQ(null);
        const merged = { ...baseReq } as ParsedRequirement;
        setLastReq(merged);
        const results = doSearch(merged, query);
        setAiMessages(prev => [...prev, {
          role: 'agent',
          text: `已更新需求：${summarizeRequirement(merged)}\n找到 ${results.length} 套匹配房源，地图已聚焦。`,
        }]);
        return;
      }
    }

    const req = parseRequirement(query);
    const merged = { ...baseReq, ...req } as ParsedRequirement;
    setLastReq(merged);
    const summary = summarizeRequirement(merged);
    const results = doSearch(merged, query);
    setAiMessages(prev => [...prev, {
      role: 'agent',
      text: summary ? `${summary}\n找到 ${results.length} 套匹配房源，地图已聚焦。` : `找到 ${results.length} 套房源。`,
    }]);

    // 智能追问
    if (results.length > 0 && !merged.min_area) {
      setTimeout(() => {
        setAiMessages(prev => [...prev, { role: 'agent', text: '您需要多大面积？可以直接回复数字，比如"3000"' }]);
        setPendingQ('area');
      }, 600);
    }
  };

  // 筛选器
  const handleFilter = (key: string) => {
    const next = key === activeFilter ? '' : key;
    setActiveFilter(next);
    if (!next) {
      setFiltered(buildings);
      setMapCenter(null);
      setMapZoom(null);
      return;
    }
    const results = searchBuildings('', { industry: next }, 20);
    const mapped = results.map(r => ({ ...r.building, match_score: r.score, match_reason: r.reasons[0] }));
    setFiltered(mapped);
    if (mapped.length > 0) {
      const avgLat = mapped.reduce((s, b) => s + b.latitude, 0) / mapped.length;
      const avgLng = mapped.reduce((s, b) => s + b.longitude, 0) / mapped.length;
      setMapCenter([avgLat, avgLng]);
      setMapZoom(11);
    }
  };

  // 默认中心点（中国中心）
  const defaultCenter: [number, number] = [32, 116];
  const defaultZoom = 4;

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/* === 全屏地图 === */}
      {isClient && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <MapContainer
            center={defaultCenter}
            zoom={defaultZoom}
            style={{ height: '100%', width: '100%', background: '#1a1a2e' }}
            zoomControl={false}
            attributionControl={false}
            ref={(m: any) => { mapRef.current = m; }}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            {filtered.map(b => (
              <CircleMarker
                key={b.id}
                center={[b.latitude, b.longitude]}
                radius={b.match_score ? 6 + (b.match_score / 100) * 8 : 5}
                pathOptions={{
                  color: b.match_score ? '#007AFF' : 'rgba(120,120,128,0.6)',
                  fillColor: b.match_score ? '#007AFF' : 'rgba(120,120,128,0.4)',
                  fillOpacity: 0.8,
                }}
                eventHandlers={{ click: () => setSelected(b) }}
              >
                <Popup>
                  <div style={{ minWidth: 120 }}>
                    <strong>{b.name}</strong><br />
                    {b.region} · {b.total_area}㎡<br />
                    {b.match_score && <span style={{ color: '#007AFF' }}>匹配度: {b.match_score}分</span>}
                  </div>
                </Popup>
              </CircleMarker>
            ))}

          </MapContainer>
        </div>
      )}

      {/* === 左上角筛选栏 === */}
      <div style={{
        position: 'absolute', top: 'calc(12px + var(--safe-top))', left: 12, right: 12,
        zIndex: 10, display: 'flex', gap: 8, alignItems: 'center',
      }}>
        {/* 水滴筛选 */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 1 }}>
          {FILTERS.map(f => {
            const isActive = activeFilter === f.key;
            return (
              <button key={f.key} onClick={() => handleFilter(f.key)} style={{
                padding: '7px 14px', borderRadius: '999px', border: 'none',
                background: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                color: '#fff', fontSize: 'var(--text-sm)', fontWeight: isActive ? 600 : 500,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                boxShadow: isActive ? '0 2px 8px rgba(0,122,255,0.4)' : 'none',
              }}>{f.label}</button>
            );
          })}
        </div>

        {/* AI按钮 */}
        <button onClick={() => setShowAI(!showAI)} style={{
          width: 40, height: 40, borderRadius: '50%', border: 'none', flexShrink: 0,
          background: showAI ? 'var(--primary)' : 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
      </div>

      {/* === AI对话面板 === */}
      {showAI && (
        <div style={{
          position: 'absolute', top: 'calc(60px + var(--safe-top))', left: 12, right: 12,
          zIndex: 11, maxHeight: '40vh',
          background: 'rgba(20,20,30,0.85)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
          borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', animation: 'scaleIn 0.25s ease',
        }}>
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {aiMessages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                {m.role === 'agent' && <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#007AFF,#5856D6)', padding: '1px 6px', borderRadius: 4, marginBottom: 3, display: 'inline-block' }}>AI</span>}
                <div style={{
                  background: m.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                  color: '#fff', padding: '8px 12px', borderRadius: 12,
                  borderBottomRightRadius: m.role === 'user' ? 4 : 12,
                  borderBottomLeftRadius: m.role === 'user' ? 12 : 4,
                  fontSize: 'var(--text-sm)', lineHeight: 1.5, whiteSpace: 'pre-wrap',
                }}>{m.text}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, padding: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAISend()} placeholder="输入需求..." style={{
              flex: 1, minHeight: 32, padding: '6px 12px', border: 'none', borderRadius: '999px',
              background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 'var(--text-sm)', outline: 'none',
            }} />
            <button onClick={() => handleAISend()} disabled={!aiInput.trim()} style={{
              width: 32, height: 32, borderRadius: '50%', border: 'none',
              background: aiInput.trim() ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
              cursor: aiInput.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* === 底部结果卡片栏 === */}
      {filtered.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 'calc(12px + var(--safe-bottom))', left: 0, right: 0, zIndex: 10,
        }}>
          <div style={{
            display: 'flex', gap: 10, padding: '0 12px', overflowX: 'auto', scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
          }}>
            {filtered.map(b => (
              <div key={b.id} onClick={() => setSelected(b)} style={{
                width: 240, flexShrink: 0, scrollSnapAlign: 'start', cursor: 'pointer',
                background: 'rgba(20,20,30,0.85)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
                borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                border: selected?.id === b.id ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ display: 'flex', height: 72 }}>
                  <img src={assetUrl(b.images?.[0] || '/images/buildings/industrial1.jpg')} alt={b.name} style={{ width: 72, height: 72, objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: '8px 10px', minWidth: 0, color: '#fff' }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{b.region} · {b.total_area}㎡ · {b.floor_load}T</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>{Number(b.rent_min).toFixed(1)}元起</span>
                      {b.match_score && <span style={{ fontSize: 10, fontWeight: 700, color: '#4CA6FF' }}>{b.match_score}分</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === 房源详情面板 === */}
      {selected && (
        <DetailPanel building={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

// ===== 详情面板 =====
function DetailPanel({ building, onClose }: { building: Building; onClose: () => void }) {
  const [showChat, setShowChat] = useState(false);
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 20, animation: 'fadeIn 0.2s' }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 21, maxHeight: '75vh',
        background: 'rgba(20,20,30,0.95)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
        borderRadius: '20px 20px 0 0', boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column', animation: 'slideUpSheet 0.35s cubic-bezier(0.25,0.1,0.25,1)',
        paddingBottom: 'var(--safe-bottom)',
      }}>
        {/* 头部 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <img src={assetUrl(building.images?.[0] || '/images/buildings/industrial1.jpg')} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{building.name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.5)' }}>{building.region} · {building.park_name}</div>
          </div>
          {building.match_score && <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#4CA6FF' }}>{building.match_score}分</span>}
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* 图片 */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: 12, scrollbarWidth: 'none' }}>
          {(building.images || ['/images/buildings/industrial1.jpg']).map((img, i) => (
            <img key={i} src={assetUrl(img)} alt="" style={{ width: 200, height: 120, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
          ))}
        </div>

        {/* 参数 */}
        <div style={{ padding: '0 16px 12px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[
            ['面积', `${building.total_area?.toLocaleString()}㎡`],
            ['层高', `${building.floor_height}m`],
            ['承重', `${building.floor_load}T/㎡`],
            ['电力', `${building.power_capacity || '-'}KVA`],
            ['租金', `${Number(building.rent_min).toFixed(1)}~${Number(building.rent_max).toFixed(1)}`],
            ['评分', `${building.park_rating || '-'}/5`],
          ].map(([label, val]) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{label}</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: '#fff', marginTop: 2 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* 配套 */}
        {building.amenities && building.amenities.length > 0 && (
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>配套设施</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {building.amenities.map((a, i) => <span key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: 999 }}>{a}</span>)}
            </div>
          </div>
        )}

        {/* 匹配理由 */}
        {building.match_reason && (
          <div style={{ margin: '0 16px 12px', padding: '8px 12px', background: 'rgba(0,122,255,0.1)', borderRadius: 10, fontSize: 'var(--text-xs)', color: '#4CA6FF' }}>
            {building.match_reason}
          </div>
        )}

        {/* 底部按钮 */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => setShowChat(true)} style={{
            flex: 1, minHeight: 44, borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #007AFF, #4CA6FF)', color: '#fff',
            fontSize: 'var(--text-md)', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            咨询销售
          </button>
        </div>
      </div>

      {/* 销售聊天（复用） */}
      {showChat && <SalesQuickChat building={building} onClose={() => setShowChat(false)} />}
    </>
  );
}

// ===== 快速销售聊天 =====
function SalesQuickChat({ building, onClose }: { building: Building; onClose: () => void }) {
  const [msgs, setMsgs] = useState<{ role: 'user' | 'sales'; text: string }[]>([
    { role: 'sales', text: `您好！我是${building.name}的招商顾问，请问有什么可以帮您？` },
  ]);
  const [input, setInput] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [msgs]);

  const send = () => {
    if (!input.trim()) return;
    const u = input.trim();
    setMsgs(prev => [...prev, { role: 'user', text: u }]);
    setInput('');
    setTimeout(() => {
      const l = u.toLowerCase();
      let reply = `好的，关于${building.name}还有什么想了解的？`;
      if (l.includes('价格') || l.includes('租金')) reply = `租金${Number(building.rent_min).toFixed(1)}~${Number(building.rent_max).toFixed(1)}元/㎡/天，面积和租期不同有议价空间。`;
      else if (l.includes('面积')) reply = `可租面积500㎡到${building.total_area?.toLocaleString()}㎡，可灵活分割。`;
      else if (l.includes('看') || l.includes('参观')) reply = `好的，帮您预约看房。您这周几方便？`;
      else if (l.includes('层高')) reply = `层高${building.floor_height}米。`;
      else if (l.includes('承重')) reply = `承重${building.floor_load}吨/㎡。`;
      setMsgs(prev => [...prev, { role: 'sales', text: reply }]);
    }, 600);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'fadeIn 0.2s' }}>
      <div style={{ maxHeight: '60vh', display: 'flex', flexDirection: 'column', background: 'rgba(20,20,30,0.95)', backdropFilter: 'blur(40px)', borderRadius: '20px 20px 0 0', paddingBottom: 'var(--safe-bottom)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ flex: 1, color: '#fff', fontWeight: 600 }}>{building.name} · 招商顾问</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div ref={ref} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              {m.role === 'sales' && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#007AFF,#5856D6)', padding: '1px 5px', borderRadius: 3, marginBottom: 2, display: 'inline-block' }}>AI</span>}
              <div style={{ background: m.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: '#fff', padding: '7px 11px', borderRadius: 12, fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>{m.text}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="输入消息..." style={{ flex: 1, minHeight: 34, padding: '7px 14px', border: 'none', borderRadius: 999, background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 'var(--text-sm)', outline: 'none' }} />
          <button onClick={send} disabled={!input.trim()} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: input.trim() ? 'var(--primary)' : 'rgba(255,255,255,0.1)', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
