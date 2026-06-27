'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { parseRequirement, summarizeRequirement, type ParsedRequirement } from '../lib/agent-parser';
import { initSearchEngine, searchBuildings, type BuildingData } from '../lib/client-search';
import { assetUrl } from '../lib/asset';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

interface Building extends BuildingData {
  match_score?: number;
  match_reason?: string;
}

type ViewMode = 'map' | 'list';

export default function HomePage() {
  const [all, setAll] = useState<Building[]>([]);
  const [filtered, setFiltered] = useState<Building[]>([]);
  const [selected, setSelected] = useState<Building | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeIndustry, setActiveIndustry] = useState('');
  const [showAI, setShowAI] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'agent'; text: string }[]>([
    { role: 'agent', text: '您好，我是园圈AI选址助手。描述您的需求，我来帮您找厂房。\n\n例如：生物医药厂房，3000平米，承重5吨，余杭区' },
  ]);
  const [lastReq, setLastReq] = useState<ParsedRequirement | null>(null);
  const [pendingQ, setPendingQ] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);
  const mapRef = useRef<any>(null);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
    fetch(assetUrl('/data/buildings.json'))
      .then(r => r.json())
      .then((data: BuildingData[]) => {
        initSearchEngine(data);
        const withCoords = data.filter(b => b.latitude && b.longitude) as Building[];
        setAll(withCoords);
        setFiltered(withCoords);
      });
  }, []);

  useEffect(() => {
    if (mapRef.current && mapCenter) {
      mapRef.current.flyTo(mapCenter, mapZoom || 12, { duration: 1.0 });
    }
  }, [mapCenter, mapZoom]);

  useEffect(() => {
    if (aiScrollRef.current) aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
  }, [aiMessages]);

  const focusMap = (results: Building[]) => {
    if (results.length > 0) {
      const lat = results.reduce((s, b) => s + b.latitude, 0) / results.length;
      const lng = results.reduce((s, b) => s + b.longitude, 0) / results.length;
      setMapCenter([lat, lng]);
      setMapZoom(results.length > 5 ? 11 : 12);
    }
  };

  const doSearch = (req: ParsedRequirement, query: string) => {
    const results = searchBuildings(query, {
      industry: req.industry, region: req.region, min_area: req.min_area,
      max_area: req.max_area, max_rent: req.max_rent, min_height: req.min_height,
      min_load: req.min_load, min_power: req.min_power,
    }, 50);
    const mapped = results.map(r => ({ ...r.building, match_score: r.score, match_reason: r.reasons[0] }));
    setFiltered(mapped);
    focusMap(mapped);
    return mapped;
  };

  const handleSearch = () => {
    if (!searchKeyword.trim()) { setFiltered(all); setMapCenter(null); setMapZoom(null); return; }
    setLoading(true);
    const req = parseRequirement(searchKeyword);
    const results = doSearch(req, searchKeyword);
    setLoading(false);
    if (results.length === 0) {
      // 降级关键词搜索
      const semResults = searchBuildings(searchKeyword, undefined, 50);
      const mapped = semResults.map(r => ({ ...r.building, match_score: r.score, match_reason: r.reasons[0] }));
      setFiltered(mapped);
      focusMap(mapped);
    }
  };

  const handleIndustry = (key: string) => {
    const next = key === activeIndustry ? '' : key;
    setActiveIndustry(next);
    if (!next) { setFiltered(all); setMapCenter(null); setMapZoom(null); return; }
    const results = searchBuildings('', { industry: next }, 50);
    const mapped = results.map(r => ({ ...r.building, match_score: r.score, match_reason: r.reasons[0] }));
    setFiltered(mapped);
    focusMap(mapped);
  };

  const handleAISend = (text?: string) => {
    const query = (text || aiInput).trim();
    if (!query) return;
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', text: query }]);

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
        setAiMessages(prev => [...prev, { role: 'agent', text: `${summarizeRequirement(merged)}\n找到 ${results.length} 套匹配房源。` }]);
        return;
      }
    }

    const req = parseRequirement(query);
    const merged = { ...baseReq, ...req } as ParsedRequirement;
    setLastReq(merged);
    const results = doSearch(merged, query);
    const summary = summarizeRequirement(merged);
    setAiMessages(prev => [...prev, { role: 'agent', text: summary ? `${summary}\n找到 ${results.length} 套匹配房源。` : `找到 ${results.length} 套房源。` }]);

    if (results.length > 0 && !merged.min_area) {
      setTimeout(() => {
        setAiMessages(prev => [...prev, { role: 'agent', text: '您需要多大面积？可以直接回复数字，比如"3000"' }]);
        setPendingQ('area');
      }, 500);
    }
  };

  // 立业云风格：蓝白主色 + 顶部搜索栏 + 地图/列表切换
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#F5F6FA', overflow: 'hidden' }}>
      {/* === 顶部搜索栏 — 立业云风格 === */}
      <div style={{
        flexShrink: 0, paddingTop: 'var(--safe-top)',
        background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#F0F2F5', borderRadius: 10, padding: '8px 12px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="搜索园区/厂房/地址" style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, outline: 'none', color: '#333' }} />
          </div>
          <button onClick={() => setShowAI(!showAI)} style={{ width: 38, height: 38, borderRadius: 10, border: 'none', background: showAI ? '#2563EB' : '#F0F2F5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={showAI ? '#fff' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
          </button>
        </div>

        {/* 产业筛选条 */}
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[{ k: '', l: '全部' }, { k: 'AI', l: 'AI' }, { k: '生物医药', l: '生物医药' }, { k: '智能制造', l: '智能制造' }, { k: '新能源', l: '新能源' }, { k: '集成电路', l: '集成电路' }].map(f => (
            <button key={f.k} onClick={() => handleIndustry(f.k)} style={{
              padding: '5px 14px', borderRadius: 999, border: 'none', whiteSpace: 'nowrap', flexShrink: 0,
              background: activeIndustry === f.k ? '#2563EB' : '#F0F2F5', color: activeIndustry === f.k ? '#fff' : '#666',
              fontSize: 13, fontWeight: activeIndustry === f.k ? 600 : 400, cursor: 'pointer',
            }}>{f.l}</button>
          ))}
        </div>
      </div>

      {/* === AI对话面板 — 顶部下拉 === */}
      {showAI && (
        <div style={{ flexShrink: 0, background: '#fff', borderBottom: '1px solid #eee', maxHeight: '30vh', display: 'flex', flexDirection: 'column', animation: 'expandIn 0.25s ease' }}>
          <div ref={aiScrollRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {aiMessages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                {m.role === 'agent' && <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', padding: '1px 6px', borderRadius: 4, marginBottom: 3, display: 'inline-block' }}>AI</span>}
                <div style={{ background: m.role === 'user' ? '#2563EB' : '#F0F2F5', color: m.role === 'user' ? '#fff' : '#333', padding: '8px 12px', borderRadius: 12, borderBottomRightRadius: m.role === 'user' ? 4 : 12, borderBottomLeftRadius: m.role === 'user' ? 12 : 4, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.text}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderTop: '1px solid #f5f5f5' }}>
            <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAISend()} placeholder="描述您的选址需求..." style={{ flex: 1, minHeight: 36, padding: '7px 14px', border: '1px solid #e0e0e0', borderRadius: 999, fontSize: 14, outline: 'none', color: '#333' }} />
            <button onClick={() => handleAISend()} disabled={!aiInput.trim()} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: aiInput.trim() ? '#2563EB' : '#ddd', cursor: aiInput.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* === 地图/列表区域 === */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {viewMode === 'map' && isClient ? (
          <MapContainer center={[32, 116]} zoom={4} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false} ref={(m: any) => { mapRef.current = m; }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            {filtered.map(b => (
              <CircleMarker key={b.id} center={[b.latitude, b.longitude]} radius={b.match_score ? 5 + (b.match_score / 100) * 6 : 5} pathOptions={{ color: b.match_score ? '#2563EB' : '#999', fillColor: b.match_score ? '#2563EB' : '#ccc', fillOpacity: 0.7 }} eventHandlers={{ click: () => setSelected(b) }}>
                <Popup><div style={{ minWidth: 120 }}><strong>{b.name}</strong><br />{b.region} · {b.total_area}㎡<br />{b.match_score && <span style={{ color: '#2563EB' }}>匹配: {b.match_score}分</span>}</div></Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        ) : (
          /* 列表视图 — 立业云风格白色卡片 */
          <div style={{ height: '100%', overflowY: 'auto', padding: 12, WebkitOverflowScrolling: 'touch' }}>
            <div style={{ fontSize: 13, color: '#999', marginBottom: 10 }}>共 {filtered.length} 套房源</div>
            {filtered.map(b => (
              <div key={b.id} onClick={() => setSelected(b)} style={{ background: '#fff', borderRadius: 12, marginBottom: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', height: 80 }}>
                  <img src={assetUrl(b.images?.[0] || '/images/buildings/industrial1.jpg')} alt={b.name} style={{ width: 80, height: 80, objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: '8px 12px', minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 3 }}>{b.region} · {b.total_area}㎡ · {b.floor_height}m · {b.floor_load}T</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                      <div style={{ display: 'flex', gap: 4 }}>{(b.industry_tags || []).slice(0, 2).map(t => <span key={t} style={{ fontSize: 10, color: '#2563EB', background: '#EFF6FF', padding: '2px 6px', borderRadius: 4 }}>{t}</span>)}</div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#FF6B00' }}>{Number(b.rent_min).toFixed(1)}<span style={{ fontSize: 11, color: '#999', fontWeight: 400 }}>元/㎡/天</span></span>
                    </div>
                  </div>
                </div>
                {b.match_score && <div style={{ padding: '4px 12px', fontSize: 11, color: '#2563EB', background: '#EFF6FF', borderTop: '1px solid #f0f0f0' }}>匹配度 {b.match_score}分 · {b.match_reason}</div>}
              </div>
            ))}
          </div>
        )}

        {/* 地图/列表切换 — 右下角浮动 */}
        <button onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')} style={{
          position: 'absolute', bottom: 12, right: 12, zIndex: 5,
          width: 44, height: 44, borderRadius: 12, border: 'none',
          background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {viewMode === 'map' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>
          )}
        </button>

        {/* 底部结果数量提示 — 地图模式 */}
        {viewMode === 'map' && filtered.length > 0 && (
          <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 5, background: '#fff', borderRadius: 999, padding: '6px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: 13, color: '#333' }}>
            {loading ? '搜索中...' : `找到 ${filtered.length} 套房源`}
          </div>
        )}
      </div>

      {/* === 详情面板 — 立业云风格分Tab === */}
      {selected && <DetailSheet building={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ===== 详情面板 — 底部弹出，分Tab展示 =====
function DetailSheet({ building, onClose }: { building: Building; onClose: () => void }) {
  const [tab, setTab] = useState<'info' | 'params' | 'facilities'>('info');
  const [showChat, setShowChat] = useState(false);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 50, animation: 'fadeIn 0.2s' }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51, maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '16px 16px 0 0', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)', animation: 'slideUpSheet 0.3s cubic-bezier(0.25,0.1,0.25,1)', paddingBottom: 'var(--safe-bottom)' }}>
        {/* 拖拽指示条 */}
        <div style={{ width: 36, height: 4, background: '#ddd', borderRadius: 2, margin: '8px auto 0' }} />

        {/* 图片轮播 */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 16px 4px', scrollbarWidth: 'none' }}>
          {(building.images || ['/images/buildings/industrial1.jpg']).map((img, i) => (
            <img key={i} src={assetUrl(img)} alt="" style={{ width: '100%', maxWidth: 320, height: 160, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
          ))}
        </div>

        {/* 标题行 */}
        <div style={{ padding: '8px 16px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>{building.name}</span>
            {building.match_score && <span style={{ fontSize: 14, fontWeight: 700, color: '#2563EB' }}>{building.match_score}分</span>}
          </div>
          <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>{building.region} · {building.park_name} · 已入驻{building.tenant_count}家企业</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            {(building.industry_tags || []).slice(0, 3).map(t => <span key={t} style={{ fontSize: 11, color: '#2563EB', background: '#EFF6FF', padding: '2px 8px', borderRadius: 4 }}>{t}</span>)}
          </div>
        </div>

        {/* Tab栏 */}
        <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginTop: 8 }}>
          {[{ k: 'info', l: '基本信息' }, { k: 'params', l: '空间参数' }, { k: 'facilities', l: '配套设施' }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k as any)} style={{ flex: 1, padding: '10px 0', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: tab === t.k ? 600 : 400, color: tab === t.k ? '#2563EB' : '#999', borderBottom: tab === t.k ? '2px solid #2563EB' : 'none' }}>{t.l}</button>
          ))}
        </div>

        {/* Tab内容 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {tab === 'info' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['所在区域', building.region], ['总面积', `${building.total_area?.toLocaleString()}㎡`], ['园区评分', `${building.park_rating || '-'}/5`], ['入驻企业', `${building.tenant_count}家`], ['租金范围', `${Number(building.rent_min).toFixed(1)}~${Number(building.rent_max).toFixed(1)}元`], ['产业定位', (building.industry_tags || []).join('、') || '-']].map(([l, v]) => (
                <div key={l}><div style={{ fontSize: 12, color: '#999' }}>{l}</div><div style={{ fontSize: 15, fontWeight: 600, color: '#333', marginTop: 2 }}>{v}</div></div>
              ))}
              {building.match_reason && <div style={{ gridColumn: '1/3', padding: 10, background: '#EFF6FF', borderRadius: 8, fontSize: 13, color: '#2563EB' }}>{building.match_reason}</div>}
            </div>
          )}
          {tab === 'params' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['层高', `${building.floor_height}m`], ['承重', `${building.floor_load}T/㎡`], ['电力', `${building.power_capacity || '-'}KVA`], ['面积', `${building.total_area?.toLocaleString()}㎡`], ['租金', `${Number(building.rent_min).toFixed(1)}~${Number(building.rent_max).toFixed(1)}元/㎡/天`], ['园区', building.park_name]].map(([l, v]) => (
                <div key={l} style={{ background: '#F8F9FB', borderRadius: 10, padding: 12 }}><div style={{ fontSize: 12, color: '#999' }}>{l}</div><div style={{ fontSize: 16, fontWeight: 700, color: '#333', marginTop: 4 }}>{v}</div></div>
              ))}
            </div>
          )}
          {tab === 'facilities' && (
            <div>
              {building.amenities && building.amenities.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {building.amenities.map((a, i) => <span key={i} style={{ fontSize: 13, color: '#333', background: '#F0F2F5', padding: '6px 14px', borderRadius: 999 }}>{a}</span>)}
                </div>
              ) : <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>暂无配套信息</div>}
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderTop: '1px solid #eee' }}>
          <button onClick={() => setShowChat(true)} style={{ flex: 1, minHeight: 44, borderRadius: 10, border: 'none', background: '#2563EB', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
            咨询招商
          </button>
        </div>
      </div>

      {showChat && <SalesChat building={building} onClose={() => setShowChat(false)} />}
    </>
  );
}

// ===== 销售聊天 =====
function SalesChat({ building, onClose }: { building: Building; onClose: () => void }) {
  const [msgs, setMsgs] = useState<{ role: 'user' | 'sales'; text: string }[]>([{ role: 'sales', text: `您好！我是${building.name}的招商顾问，请问有什么可以帮您？` }]);
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
      let r = `好的，关于${building.name}还有什么想了解的？`;
      if (l.includes('价格') || l.includes('租金')) r = `租金${Number(building.rent_min).toFixed(1)}~${Number(building.rent_max).toFixed(1)}元/㎡/天，面积和租期不同有议价空间。`;
      else if (l.includes('面积')) r = `可租面积500㎡到${building.total_area?.toLocaleString()}㎡，可灵活分割。`;
      else if (l.includes('看') || l.includes('参观')) r = `好的，帮您预约看房。您这周几方便？`;
      else if (l.includes('层高')) r = `层高${building.floor_height}米。`;
      else if (l.includes('承重')) r = `承重${building.floor_load}吨/㎡。`;
      setMsgs(prev => [...prev, { role: 'sales', text: r }]);
    }, 600);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'fadeIn 0.2s' }}>
      <div style={{ maxHeight: '60vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '16px 16px 0 0', paddingBottom: 'var(--safe-bottom)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid #eee' }}>
          <span style={{ flex: 1, color: '#333', fontWeight: 600, fontSize: 15 }}>{building.name} · 招商顾问</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#F0F2F5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div ref={ref} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              {m.role === 'sales' && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', padding: '1px 5px', borderRadius: 3, marginBottom: 2, display: 'inline-block' }}>AI</span>}
              <div style={{ background: m.role === 'user' ? '#2563EB' : '#F0F2F5', color: m.role === 'user' ? '#fff' : '#333', padding: '8px 12px', borderRadius: 12, fontSize: 14, lineHeight: 1.5 }}>{m.text}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderTop: '1px solid #f5f5f5' }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="输入消息..." style={{ flex: 1, minHeight: 36, padding: '7px 14px', border: '1px solid #e0e0e0', borderRadius: 999, fontSize: 14, outline: 'none', color: '#333' }} />
          <button onClick={send} disabled={!input.trim()} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: input.trim() ? '#2563EB' : '#ddd', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
