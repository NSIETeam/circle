'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { parseRequirement, summarizeRequirement, type ParsedRequirement } from '../../lib/agent-parser';
import { initSearchEngine, searchBuildings, type BuildingData } from '../../lib/client-search';
import { assetUrl } from '../../lib/asset';
import { useRole } from '../../lib/role-context';

// 动态导入地图
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

interface Building extends BuildingData {
  match_score?: number;
  match_reason?: string;
}

// IKEA 宜家风格配色
const C = {
  primary: '#0058A3',      // 宜家蓝
  primaryLight: '#E5F0FA', // 浅蓝背景
  primaryDark: '#004A86',
  bg: '#F5F5F5',
  card: '#FFFFFF',
  text: '#111111',
  textSub: '#484848',
  textMuted: '#767676',
  border: '#E5E5E5',
  price: '#0058A3',
  tagBg: '#E5F0FA',
  tagFg: '#0058A3',
};

// 宜家黄（价格标签）
const IKEA_YELLOW = '#FFDA1A';
const IKEA_BLUE = '#0058A3';
const IKEA_SALE = '#E0001B';

const AREA_OPTIONS = ['不限', '500㎡以下', '500-1000㎡', '1000-3000㎡', '3000-5000㎡', '5000㎡以上'];
const RENT_OPTIONS = ['不限', '1元以下', '1-2元', '2-3元', '3元以上'];
const SORT_OPTIONS = [
  { key: 'default', label: '默认' },
  { key: 'price_asc', label: '租金低→高' },
  { key: 'price_desc', label: '租金高→低' },
  { key: 'area_desc', label: '面积大→小' },
];
const INDUSTRIES = ['全部', 'AI', '生物医药', '智能制造', '新能源', '集成电路', '新材料', '电子信息'];

export default function HomePage() {
  const { isAgent, canSeeCommission, agentInfo, referralLock } = useRole();
  const [all, setAll] = useState<Building[]>([]);
  const [list, setList] = useState<Building[]>([]);
  const [keyword, setKeyword] = useState('');
  const [selIndustry, setSelIndustry] = useState('全部');
  const [selArea, setSelArea] = useState('不限');
  const [selRent, setSelRent] = useState('不限');
  const [selSort, setSelSort] = useState('default');
  const [selRegion, setSelRegion] = useState('不限');
  const [selRoad, setSelRoad] = useState('不限');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selected, setSelected] = useState<Building | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiMsgs, setAiMsgs] = useState<{ role: 'user' | 'agent'; text: string }[]>([
    { role: 'agent', text: '您好，我是园圈AI选址助手。描述您的需求，我来帮您筛选厂房。\n\n例如：生物医药厂房，3000平米以上，承重5吨，余杭区' },
  ]);
  const [lastReq, setLastReq] = useState<ParsedRequirement | null>(null);
  const [pendingQ, setPendingQ] = useState<string | null>(null);
  const [city, setCity] = useState('北京');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [pickLocation, setPickLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [showMapPanel, setShowMapPanel] = useState(false);
  const [mapPanelMode, setMapPanelMode] = useState<'nearby' | 'pick' | 'view'>('view');
  const [isClient, setIsClient] = useState(false);
  const mapPanelRef = useRef<any>(null);
  const [mapPanelCenter, setMapPanelCenter] = useState<[number, number]>([39.9, 116.4]);
  const [mapPanelZoom, setMapPanelZoom] = useState(11);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const aiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
    fetch(assetUrl('/data/buildings.json'))
      .then(r => r.json())
      .then((data: BuildingData[]) => {
        initSearchEngine(data);
        // 聚焦北京：只展示北京区域房源
        const beijing = data.filter(b => b.city === '北京' || b.region === '大兴区' || b.region === '昌平区' || b.region === '顺义区' || b.region === '经开区') as Building[];
        setAll(beijing);
        setList(beijing);
      });
    fetch(assetUrl('/data/promotions.json')).then(r => r.json()).then(setPromotions);
  }, []);

  useEffect(() => {
    if (aiRef.current) aiRef.current.scrollTop = aiRef.current.scrollHeight;
  }, [aiMsgs]);

  // 解析面积选项
  const parseAreaFilter = (s: string): { min?: number; max?: number } => {
    if (s === '不限') return {};
    if (s === '500㎡以下') return { max: 500 };
    if (s === '500-1000㎡') return { min: 500, max: 1000 };
    if (s === '1000-3000㎡') return { min: 1000, max: 3000 };
    if (s === '3000-5000㎡') return { min: 3000, max: 5000 };
    if (s === '5000㎡以上') return { min: 5000 };
    return {};
  };

  const parseRentFilter = (s: string): { max?: number } => {
    if (s === '不限') return {};
    if (s === '1元以下') return { max: 1 };
    if (s === '1-2元') return { max: 2 };
    if (s === '2-3元') return { max: 3 };
    if (s === '3元以上') return {};
    return {};
  };

  // 执行筛选 — 所有条件叠加约束
  const doFilter = useCallback(() => {
    let results = [...all];

    // 1. 区域筛选（区 → 路 二级）
    if (selRegion !== '不限' && selRegion !== '附近' && selRegion !== '自选定位') {
      results = results.filter(b => b.region?.includes(selRegion));
    }
    if (selRoad !== '不限') {
      results = results.filter(b => b.road === selRoad);
    }
    // 附近/自选定位 — 按用户位置距离筛选
    if ((selRegion === '附近' || selRegion === '自选定位') && userLocation) {
      results = results.map(b => {
        const dist = haversine(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
        return { ...b, match_score: Math.max(1, Math.round(100 - dist / 10)), match_reason: `距您约${Math.round(dist)}km` };
      }).sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
    }

    // 2. 关键词搜索（叠加产业筛选）
    if (keyword.trim()) {
      const req = parseRequirement(keyword);
      const searchResults = searchBuildings(keyword, {
        industry: req.industry || (selIndustry !== '全部' ? selIndustry : undefined),
        region: req.region,
        min_area: req.min_area,
        max_rent: req.max_rent,
        min_load: req.min_load,
        min_height: req.min_height,
      }, 100);
      const searchIds = new Set(searchResults.map(r => r.building.id));
      // 取交集 — 关键词搜索结果和区域筛选结果取交集
      results = results.filter(b => searchIds.has(b.id));
      // 合并匹配分
      const scoreMap = new Map(searchResults.map(r => [r.building.id, { score: r.score, reason: r.reasons[0] }]));
      results = results.map(b => {
        const s = scoreMap.get(b.id);
        return s ? { ...b, match_score: s.score, match_reason: s.reason } : b;
      });
    } else if (selIndustry !== '全部') {
      // 无关键词但有产业筛选
      const searchResults = searchBuildings('', { industry: selIndustry }, 100);
      const searchIds = new Set(searchResults.map(r => r.building.id));
      results = results.filter(b => searchIds.has(b.id));
      const scoreMap = new Map(searchResults.map(r => [r.building.id, { score: r.score, reason: r.reasons[0] }]));
      results = results.map(b => {
        const s = scoreMap.get(b.id);
        return s ? { ...b, match_score: s.score, match_reason: s.reason } : b;
      });
    } else if (selRegion === '不限') {
      // 无搜索无筛选 — 清除匹配分
      results = results.map(b => ({ ...b, match_score: undefined, match_reason: undefined }));
    }

    // 3. 面积筛选
    const areaFilter = parseAreaFilter(selArea);
    if (areaFilter.min) results = results.filter(b => b.total_area >= areaFilter.min!);
    if (areaFilter.max) results = results.filter(b => b.total_area <= areaFilter.max!);

    // 4. 租金筛选
    const rentFilter = parseRentFilter(selRent);
    if (rentFilter.max) results = results.filter(b => b.rent_min <= rentFilter.max!);

    // 5. 排序
    if (selSort === 'price_asc') results.sort((a, b) => a.rent_min - b.rent_min);
    else if (selSort === 'price_desc') results.sort((a, b) => b.rent_min - a.rent_min);
    else if (selSort === 'area_desc') results.sort((a, b) => b.total_area - a.total_area);
    else if (keyword.trim() || selIndustry !== '全部' || selRegion === '附近' || selRegion === '自选定位') {
      results.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
    }

    setList(results);
  }, [all, keyword, selIndustry, selArea, selRent, selSort, selRegion, selRoad, userLocation]);

  useEffect(() => { doFilter(); }, [selIndustry, selArea, selRent, selSort, keyword, selRegion, selRoad, userLocation, doFilter]);

  // 附近 — 获取GPS定位，按距离排序，显示地图
  const handleNearby = () => {
    setShowMapPanel(true);
    setMapPanelMode('nearby');
    if (!navigator.geolocation) {
      alert('您的浏览器不支持定位功能');
      setSelRegion('不限');
    setSelRoad('不限');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserLocation({ lat, lng });
        setMapPanelCenter([lat, lng]);
        setMapPanelZoom(14);
        const sorted = [...all].map(b => {
          const dist = haversine(lat, lng, b.latitude, b.longitude);
          return { ...b, match_score: Math.max(1, Math.round(100 - dist / 10)), match_reason: `距您约${Math.round(dist)}km` };
        }).sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
        setList(sorted);
      },
      (err) => {
        // 定位失败 — 提示用户
        if (err.code === 1) alert('定位权限被拒绝，请在浏览器设置中允许定位');
        else alert('定位失败，请检查网络后重试');
        setMapPanelCenter([39.9, 116.4]);
        setMapPanelZoom(11);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // 回到我的位置
  const handleBackToMyLocation = () => {
    if (userLocation) {
      setMapPanelCenter([userLocation.lat, userLocation.lng]);
      setMapPanelZoom(14);
      if (mapPanelRef.current) mapPanelRef.current.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 0.8 });
    } else {
      handleNearby();
    }
  };

  // 自选定位 — 打开地图选点
  const handleCustomLocation = () => {
    setPickLocation(null);
    setUserLocation(null);
    setShowMapPanel(true);
    setMapPanelMode('pick');
    setMapPanelCenter([39.9, 116.4]);
    setMapPanelZoom(11);
  };

  // 地图选点确认后 — 计算距离+出行信息
  const handlePickConfirm = (lat: number, lng: number, address: string) => {
    setUserLocation({ lat, lng });
    setMapPanelMode('view');
    const sorted = [...all].map(b => {
      const dist = haversine(lat, lng, b.latitude, b.longitude);
      const driving = Math.round(dist / 40 * 60); // 40km/h
      const walking = Math.round(dist / 5 * 60);  // 5km/h
      return { ...b, match_score: Math.max(1, Math.round(100 - dist / 10)), match_reason: `距选定位置约${Math.round(dist)}km`, commute: { distance: Math.round(dist), driving: `${driving}分钟`, walking: walking > 120 ? '较远' : `${walking}分钟` } };
    }).sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
    setList(sorted);
    setMapPanelCenter([lat, lng]);
    setMapPanelZoom(12);
  };

  // 地图点击选点
  const handleMapPick = (lat: number, lng: number) => {
    setPickLocation({ lat, lng, address: `(${lat.toFixed(4)}, ${lng.toFixed(4)})` });
    setMapPanelCenter([lat, lng]);
  };

  // selRegion 变化时触发 doFilter（已合并到 doFilter 的 useEffect 中）
  // 附近/自选的 GPS 触发在各自 onClick 中处理

  // AI对话
  const handleAISend = (text?: string) => {
    const q = (text || aiInput).trim();
    if (!q) return;
    setAiInput('');
    setAiMsgs(prev => [...prev, { role: 'user', text: q }]);

    const base: Partial<ParsedRequirement> = lastReq || {};
    if (pendingQ && lastReq) {
      const num = q.match(/^(\d+\.?\d*)$/);
      if (num) {
        const n = parseFloat(num[1]);
        if (pendingQ === 'area') base.min_area = n <= 50 ? n * 10000 : n;
        else if (pendingQ === 'load') base.min_load = n;
        else if (pendingQ === 'height') base.min_height = n;
        else if (pendingQ === 'rent') base.max_rent = n;
        setPendingQ(null);
        const merged = { ...base } as ParsedRequirement;
        setLastReq(merged);
        applyAIResult(merged, q);
        return;
      }
    }

    const req = parseRequirement(q);
    const merged = { ...base, ...req } as ParsedRequirement;
    setLastReq(merged);
    applyAIResult(merged, q);

    if (!merged.min_area) {
      setTimeout(() => {
        setAiMsgs(prev => [...prev, { role: 'agent', text: '您需要多大面积？可以直接回复数字，比如"3000"' }]);
        setPendingQ('area');
      }, 500);
    } else {
      setTimeout(() => {
        setAiMsgs(prev => [...prev, { role: 'agent', text: `已找到匹配房源！留下联系方式，顾问30分钟内联系您提供1对1服务。` }]);
      }, 500);
    }
  };

  const applyAIResult = (req: ParsedRequirement, query: string) => {
    const results = searchBuildings(query, {
      industry: req.industry, region: req.region, min_area: req.min_area,
      max_area: req.max_area, max_rent: req.max_rent, min_height: req.min_height,
      min_load: req.min_load, min_power: req.min_power,
    }, 100);
    const mapped = results.map(r => ({ ...r.building, match_score: r.score, match_reason: r.reasons[0] }));
    setList(mapped);
    // 同步筛选器状态
    if (req.industry && INDUSTRIES.includes(req.industry)) setSelIndustry(req.industry);
    const summary = summarizeRequirement(req);
    setAiMsgs(prev => [...prev, { role: 'agent', text: summary ? `${summary}\n找到 ${mapped.length} 套匹配房源。` : `找到 ${mapped.length} 套房源。` }]);
  };

  const cities = ['北京'];

// 计算两点间距离（km）
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'inherit' }}>
      {/* ===== 顶部导航栏 ===== */}
      <div style={{ background: IKEA_BLUE, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: IKEA_YELLOW, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={IKEA_BLUE} strokeWidth="2.5" strokeLinecap="round"><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /></svg>
            </div>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>园圈</span>
          </div>
          {/* 城市选择 */}
          <button onClick={() => setShowCityPicker(!showCityPicker)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 14, color: '#fff', fontWeight: 600, flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            {city}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {/* 搜索框 */}
          <div style={{ flex: 1, display: 'flex', maxWidth: 560 }}>
            <input value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && doFilter()} placeholder="搜索园区/厂房/地址/产业类型" style={{ flex: 1, height: 44, padding: '0 16px', border: 'none', borderRadius: '6px 0 0 6px', fontSize: 14, outline: 'none' }} />
            <button onClick={doFilter} style={{ background: IKEA_YELLOW, color: IKEA_BLUE, border: 'none', borderRadius: '0 6px 6px 0', padding: '0 24px', fontSize: 15, fontWeight: 900, cursor: 'pointer', flexShrink: 0 }}>搜索</button>
          </div>
          {/* AI选址 */}
          <button onClick={() => setShowAI(!showAI)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: showAI ? IKEA_YELLOW : 'rgba(255,255,255,0.15)', color: showAI ? IKEA_BLUE : '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
            AI选址
          </button>
          {/* 登录 */}
          {/* 导航链接 — 白字 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/promotions`} style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', textDecoration: 'none', padding: '6px 10px' }}>限时优惠</a>
            <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/cases`} style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', textDecoration: 'none', padding: '6px 10px' }}>成功案例</a>
            <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/agent-coop`} style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', textDecoration: 'none', padding: '6px 10px' }}>经纪人合作</a>
          </div>
          <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/login`} style={{ textDecoration: 'none', fontSize: 14, color: 'rgba(255,255,255,0.85)', flexShrink: 0 }}>登录</a>
          <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/sales`} style={{ textDecoration: 'none', fontSize: 14, color: 'rgba(255,255,255,0.85)', flexShrink: 0 }}>产业园端</a>
          <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/list-building`} style={{ textDecoration: 'none', fontSize: 14, color: IKEA_BLUE, fontWeight: 900, flexShrink: 0, background: IKEA_YELLOW, padding: '8px 16px', borderRadius: 6 }}>发布房源</a>
        </div>

        {/* 城市下拉 */}
        {showCityPicker && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderBottom: '1px solid #eee', boxShadow: '0 4px 8px rgba(0,0,0,0.06)', zIndex: 99, maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: 8, padding: '12px 20px', flexWrap: 'wrap' }}>
              {cities.map(c => <button key={c} onClick={() => { setCity(c); setShowCityPicker(false); }} style={{ padding: '4px 12px', borderRadius: 4, border: 'none', background: c === city ? C.primaryLight : '#f5f5f5', color: c === city ? C.primary : C.textSub, fontSize: 13, cursor: 'pointer' }}>{c}</button>)}
            </div>
          </div>
        )}
      </div>

      {/* === AI对话独立弹窗 === */}
      {showAI && (
        <div onClick={() => setShowAI(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, animation: 'fadeIn 0.2s' }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '90%', maxWidth: 480, maxHeight: '70vh', background: '#fff', borderRadius: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'scaleIn 0.25s ease' }}>
            {/* 头部 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid #eee', background: '#fff' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #00A6E0, #0088B8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
              </div>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#333' }}>AI选址助手</span>
              <button onClick={() => setShowAI(false)} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: '#F5F5F5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#666' }}>X</button>
            </div>
            {/* 消息区 */}
            <div ref={aiRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {aiMsgs.map((m, i) => (
                <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                  {m.role === 'agent' && <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #00A6E0, #0088B8)', padding: '1px 6px', borderRadius: 3, marginBottom: 3, display: 'inline-block' }}>AI</span>}
                  <div style={{ background: m.role === 'user' ? '#00A6E0' : '#F5F6FA', color: m.role === 'user' ? '#fff' : '#333', padding: '10px 14px', borderRadius: 12, borderBottomRightRadius: m.role === 'user' ? 4 : 12, borderBottomLeftRadius: m.role === 'user' ? 12 : 4, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.text}</div>
                </div>
              ))}
            </div>
            {/* 快捷词 */}
            <div style={{ display: 'flex', gap: 6, padding: '8px 16px 0', flexWrap: 'wrap' }}>
              {['AI产业园 2000平', '生物医药 承重5吨', '智能制造 余杭', '便宜点的大厂房'].map(hint => (
                <button key={hint} onClick={() => { setAiInput(hint); }} style={{ padding: '4px 10px', borderRadius: 999, border: '1px solid #e0e0e0', background: '#fff', color: '#666', fontSize: 12, cursor: 'pointer' }}>{hint}</button>
              ))}
            </div>
            {/* 留资按钮 */}
            <div style={{ padding: '0 16px 8px' }}>
              <button onClick={() => { setShowAI(false); setShowLeadForm(true); }} style={{ width: '100%', height: 36, borderRadius: 8, border: 'none', background: '#34C759', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                提交联系方式 · 获取1对1选址服务
              </button>
            </div>
            {/* 输入栏 */}
            <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid #f5f5f5', marginTop: 4 }}>
              <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAISend()} placeholder="描述您的选址需求..." style={{ flex: 1, height: 38, padding: '0 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none' }} />
              <button onClick={() => handleAISend()} disabled={!aiInput.trim()} style={{ width: 38, height: 38, borderRadius: 8, border: 'none', background: aiInput.trim() ? '#00A6E0' : '#ccc', color: '#fff', cursor: aiInput.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 主内容区 ===== */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px', display: 'flex', gap: 16 }}>
        {/* 左侧筛选栏 — 移动端隐藏，改为顶部横滑 */}
        <div style={{ width: 200, flexShrink: 0, display: 'none' }} className="desktop-filter">
          {/* 区域筛选 — 含附近+自选定位 */}
          <div style={{ background: '#fff', borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>区域</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={() => { setSelRegion('附近'); handleNearby(); setShowMapPanel(true); setMapPanelMode('nearby'); }} style={{ textAlign: 'left', padding: '5px 10px', borderRadius: 4, border: 'none', background: selRegion === '附近' ? C.primary : '#F5F5F5', color: selRegion === '附近' ? '#fff' : C.textSub, fontSize: 13, cursor: 'pointer', fontWeight: selRegion === '附近' ? 600 : 400, display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2" /></svg>
                附近
              </button>
              <button onClick={() => { setSelRegion('自选定位'); handleCustomLocation(); }} style={{ textAlign: 'left', padding: '5px 10px', borderRadius: 4, border: 'none', background: selRegion === '自选定位' ? C.primary : '#F5F5F5', color: selRegion === '自选定位' ? '#fff' : C.textSub, fontSize: 13, cursor: 'pointer', fontWeight: selRegion === '自选定位' ? 600 : 400, display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                自选定位
              </button>
              <div style={{ height: 1, background: '#eee', margin: '4px 0' }} />
              {['不限', '大兴区', '昌平区', '顺义区', '经开区', '朝阳区', '海淀区', '丰台区', '通州区'].map(r => (
                <button key={r} onClick={() => { setSelRegion(r); setSelRoad('不限'); }} style={{ textAlign: 'left', padding: '5px 10px', borderRadius: 4, border: 'none', background: selRegion === r ? C.primary : '#F5F5F5', color: selRegion === r ? '#fff' : C.textSub, fontSize: 13, cursor: 'pointer', fontWeight: selRegion === r ? 600 : 400 }}>{r}</button>
              ))}
              {/* 路段二级筛选 — 选中具体区后显示该区的产业聚集路 */}
              {selRegion !== '不限' && selRegion !== '附近' && selRegion !== '自选定位' && (() => {
                const roads = [...new Set(all.filter(b => b.region?.includes(selRegion)).map(b => (b as any).road).filter(Boolean))];
                if (roads.length === 0) return null;
                return (
                  <>
                    <div style={{ height: 1, background: '#eee', margin: '4px 0' }} />
                    <div style={{ fontSize: 11, color: C.textMuted, padding: '2px 10px' }}>{selRegion} · 产业聚集路</div>
                    {['不限', ...roads].map(road => (
                      <button key={road} onClick={() => setSelRoad(road)} style={{ textAlign: 'left', padding: '5px 10px 5px 16px', borderRadius: 4, border: 'none', background: selRoad === road ? C.primary : '#F5F5F5', color: selRoad === road ? '#fff' : C.textSub, fontSize: 12, cursor: 'pointer', fontWeight: selRoad === road ? 600 : 400, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
                        {road}
                      </button>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>产业类型</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {INDUSTRIES.map(ind => <button key={ind} onClick={() => setSelIndustry(ind)} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: selIndustry === ind ? C.primary : '#F5F5F5', color: selIndustry === ind ? '#fff' : C.textSub, fontSize: 12, cursor: 'pointer' }}>{ind}</button>)}
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>面积</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {AREA_OPTIONS.map(a => <button key={a} onClick={() => setSelArea(a)} style={{ textAlign: 'left', padding: '5px 10px', borderRadius: 4, border: 'none', background: selArea === a ? C.primary : '#F5F5F5', color: selArea === a ? '#fff' : C.textSub, fontSize: 13, cursor: 'pointer', fontWeight: selArea === a ? 600 : 400 }}>{a}</button>)}
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>租金（元/㎡/天）</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {RENT_OPTIONS.map(r => <button key={r} onClick={() => setSelRent(r)} style={{ textAlign: 'left', padding: '5px 10px', borderRadius: 4, border: 'none', background: selRent === r ? C.primary : '#F5F5F5', color: selRent === r ? '#fff' : C.textSub, fontSize: 13, cursor: 'pointer', fontWeight: selRent === r ? 600 : 400 }}>{r}</button>)}
            </div>
          </div>
        </div>

        {/* 右侧列表区 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 地图面板 — 附近/自选定位时显示 */}
          {showMapPanel && isClient && (
            <div style={{ background: '#fff', borderRadius: 8, marginBottom: 12, overflow: 'hidden', border: '1px solid #eee' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #f5f5f5', position: 'relative', zIndex: 1000, background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                    {mapPanelMode === 'pick' ? '点击地图选择位置' : mapPanelMode === 'nearby' ? '附近房源' : '房源地图'}
                  </span>
                  {mapPanelMode !== 'pick' && (
                    <button onClick={handleBackToMyLocation} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 6, border: '1px solid #00A6E0', background: '#E6F7FD', color: '#00A6E0', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2" /></svg>
                      回到我的位置
                    </button>
                  )}
                </div>
                <button onClick={() => { setShowMapPanel(false); setSelRegion('不限'); }} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#F5F5F5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#666', flexShrink: 0 }}>X</button>
              </div>
              <div style={{ height: 300, position: 'relative' }}>
                <MapContainer center={mapPanelCenter} zoom={mapPanelZoom} style={{ height: '100%', width: '100%' }} zoomControl={true} attributionControl={false} ref={(m: any) => { mapPanelRef.current = m; }}>
                  <TileLayer url="https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}" subdomains={['1','2','3','4']} />
                  {/* 用户位置（附近模式） */}
                  {mapPanelMode === 'nearby' && userLocation && (
                    <CircleMarker center={[userLocation.lat, userLocation.lng]} radius={10} pathOptions={{ color: '#00A6E0', fillColor: '#00A6E0', fillOpacity: 0.5 }} />
                  )}
                  {/* 选点位置（自选模式） */}
                  {mapPanelMode === 'pick' && pickLocation && (
                    <CircleMarker center={[pickLocation.lat, pickLocation.lng]} radius={8} pathOptions={{ color: '#00A6E0', fillColor: '#00A6E0', fillOpacity: 0.8 }} />
                  )}
                  {/* 房源光点 */}
                  {list.filter(b => b.latitude && b.longitude).map(b => (
                    <CircleMarker key={b.id} center={[b.latitude, b.longitude]} radius={b.match_score ? 5 + (b.match_score / 100) * 6 : 5} pathOptions={{ color: b.match_score ? '#00A6E0' : '#999', fillColor: b.match_score ? '#00A6E0' : '#ccc', fillOpacity: 0.7 }} eventHandlers={{ click: () => setSelected(b) }}>
                      <Popup><div style={{ minWidth: 100 }}><strong>{b.name}</strong><br />{b.region} · {b.total_area}㎡<br />{b.match_reason}</div></Popup>
                    </CircleMarker>
                  ))}
                  {/* 选点点击处理 */}
                  {mapPanelMode === 'pick' && <MapClickHandler onPick={handleMapPick} />}
                </MapContainer>
                {/* 选点模式提示 */}
                {mapPanelMode === 'pick' && !pickLocation && (
                  <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '6px 16px', borderRadius: 999, fontSize: 13, pointerEvents: 'none' }}>点击地图选择位置</div>
                )}
                {/* 确认按钮 */}
                {mapPanelMode === 'pick' && pickLocation && (
                  <button onClick={() => handlePickConfirm(pickLocation.lat, pickLocation.lng, pickLocation.address)} style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', padding: '8px 24px', borderRadius: 8, border: 'none', background: '#00A6E0', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,166,224,0.4)' }}>
                    确认位置 · 搜索附近{all.length}处房源
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 排序栏 */}
          <div style={{ background: '#fff', borderRadius: 8, padding: 0, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #eee' }}>
            <div style={{ display: 'flex' }}>
              {SORT_OPTIONS.map((s, i) => <button key={s.key} onClick={() => setSelSort(s.key)} style={{ padding: '10px 16px', border: 'none', borderRight: i < SORT_OPTIONS.length - 1 ? '1px solid #eee' : 'none', background: selSort === s.key ? C.primaryLight : '#fff', color: selSort === s.key ? C.primary : C.textSub, fontSize: 14, cursor: 'pointer', fontWeight: selSort === s.key ? 600 : 400 }}>{s.label}</button>)}
            </div>
            <span style={{ fontSize: 13, color: C.textMuted, padding: '0 16px' }}>共 <strong style={{ color: C.primary, fontSize: 15 }}>{list.length}</strong> 处</span>
          </div>

          {/* 限时优惠模块 — 无筛选时显示 */}
          {!keyword && selIndustry === '全部' && selArea === '不限' && selRent === '不限' && (
            <div style={{ background: '#fff', borderRadius: 8, marginBottom: 12, padding: 16, border: '1px solid #eee' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 3, height: 16, background: '#FF3B30', borderRadius: 2, display: 'inline-block' }} /> 限时招商优惠
                </div>
                <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/promotions`} style={{ fontSize: 13, color: C.primary, textDecoration: 'none' }}>查看全部 →</a>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {promotions.slice(0, 3).map(p => (
                  <a key={p.id} href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/promotions`} style={{ textDecoration: 'none', display: 'flex', gap: 10, background: '#F8F9FB', borderRadius: 8, padding: 10, border: '1px solid #f0f0f0' }}>
                    <img src={assetUrl(p.image)} alt="" style={{ width: 60, height: 60, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                      <div style={{ fontSize: 12, color: '#FF3B30', fontWeight: 600, marginTop: 4 }}>{p.discount}</div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>剩余 {p.remaining} 个名额</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 空间类型入口 — 无筛选时显示 */}
          {!keyword && selIndustry === '全部' && selArea === '不限' && selRent === '不限' && (
            <div style={{ background: '#fff', borderRadius: 8, marginBottom: 12, padding: 16, border: '1px solid #eee' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 3, height: 16, background: C.primary, borderRadius: 2, display: 'inline-block' }} /> 空间类型
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['办公', '厂房', '仓库', '实验室', '机房', '研发空间', '生产车间', '总部基地'].map(t => (
                  <button key={t} onClick={() => setKeyword(t)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fff', color: C.textSub, fontSize: 13, cursor: 'pointer' }}>{t}</button>
                ))}
              </div>
            </div>
          )}

          {/* 热门推荐 — 无筛选时显示 */}
          {!keyword && selIndustry === '全部' && selArea === '不限' && selRent === '不限' && all.filter(b => b.is_featured).length > 0 && (
            <div style={{ background: '#fff', borderRadius: 8, marginBottom: 12, padding: 16, border: '1px solid #eee' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 3, height: 16, background: C.primary, borderRadius: 2, display: 'inline-block' }} /> 热门园区推荐
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {all.filter(b => b.is_featured).slice(0, 3).map(b => (
                  <div key={b.id} onClick={() => setSelected(b)} style={{ cursor: 'pointer', border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
                    <img src={assetUrl(b.images?.[0] || '/images/buildings/industrial1.jpg')} alt="" style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                    <div style={{ padding: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{b.region} · {(b as any).road || b.park_name} · {b.total_area?.toLocaleString()}㎡</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: IKEA_BLUE, marginTop: 4, display: 'inline-block', background: IKEA_YELLOW, padding: '2px 8px', borderRadius: 4 }}>{Number(b.rent_min).toFixed(1)}<span style={{ fontSize: 11, color: IKEA_BLUE, fontWeight: 400 }}>元/㎡/天</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 列表 */}
          {list.map(b => (
            <div key={b.id} onClick={() => setSelected(b)} style={{ background: '#fff', borderRadius: 8, marginBottom: 10, display: 'flex', gap: 12, padding: 12, cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = C.primary)} onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
              {/* 图片 */}
              <img src={assetUrl(b.images?.[0] || '/images/buildings/industrial1.jpg')} alt={b.name} style={{ width: 160, height: 120, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
              {/* 信息 */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                  <div style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>{b.region} · {(b as any).road || b.park_name}{(b as any).road_desc ? ` · ${(b as any).road_desc}` : ''}</div>
                  <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}><strong style={{ color: C.text }}>{b.total_area?.toLocaleString()}</strong>㎡ | <strong style={{ color: C.text }}>{b.floor_height}</strong>m层高 | <strong style={{ color: C.text }}>{b.floor_load}</strong>T承重 | <strong style={{ color: C.text }}>{b.power_capacity || '-'}</strong>KVA</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    {(b.industry_tags || []).slice(0, 4).map(t => <span key={t} style={{ fontSize: 11, color: C.tagFg, background: C.tagBg, padding: '2px 8px', borderRadius: 3, border: 'none' }}>{t}</span>)}
                    {b.amenities?.slice(0, 2).map(a => <span key={a} style={{ fontSize: 11, color: C.textMuted, background: '#F5F5F5', padding: '2px 8px', borderRadius: 3, border: '1px solid #eee' }}>{a}</span>)}
                  </div>
                </div>
                {b.match_reason && <div style={{ fontSize: 12, color: C.primary, marginTop: 4 }}>{b.match_reason}</div>}
                {/* 政策标签 — C端可见 */}
                {(b as any).policy && (b as any).policy.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    {(b as any).policy.slice(0, 2).map((p: string, i: number) => (
                      <span key={i} style={{ fontSize: 10, color: '#34C759', background: '#EAFBEF', padding: '2px 6px', borderRadius: 3 }}>{p}</span>
                    ))}
                  </div>
                )}
                {/* 主推楼型 + 佣金（经纪人可见） */}
                <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                  {(b as any).main_type && <span style={{ fontSize: 11, color: C.textSub, background: '#F0F2F5', padding: '2px 6px', borderRadius: 3 }}>{(b as any).main_type}</span>}
                </div>
                {(b as any).commute && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 11, color: C.textMuted }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#00A6E0" strokeWidth="2"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" /><circle cx="6.5" cy="16.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" /></svg>
                      驾车{(b as any).commute.driving}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2"><circle cx="12" cy="4" r="2" /><path d="M15 22v-4l-3-3-3 3v4" /><path d="M9 8l3 3 3-3" /></svg>
                      步行{(b as any).commute.walking}
                    </span>
                  </div>
                )}
              </div>
              {/* 价格 */}
              <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 100 }}>
                <div><span style={{ fontSize: 20, fontWeight: 800, color: IKEA_BLUE, background: IKEA_YELLOW, padding: '2px 10px', borderRadius: 4, display: 'inline-block' }}>{Number(b.rent_min).toFixed(1)}</span><span style={{ fontSize: 12, color: C.textMuted, marginLeft: 4 }}>元/㎡/天</span></div>
                {b.match_score && <div style={{ fontSize: 12, color: C.primary, marginTop: 4 }}>匹配 {b.match_score}分</div>}
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{b.tenant_count}家入驻</div>
              </div>
            </div>
          ))}

          {list.length === 0 && <div style={{ textAlign: 'center', padding: 60, color: C.textMuted, fontSize: 14 }}>暂无匹配房源，试试调整筛选条件</div>}

          {/* 热门推荐 — 填充右侧空间 */}
        </div>
      </div>

      {/* ===== 详情弹窗 ===== */}
      {/* 详情弹窗 */}
      {selected && <DetailModal building={selected} onClose={() => setSelected(null)} />}

      {/* 留资弹窗 */}
      {showLeadForm && <LeadFormModal onClose={() => setShowLeadForm(false)} />}

      {/* 地图选点弹窗 */}
      {showMapPicker && <MapPicker onConfirm={handlePickConfirm} onClose={() => setShowMapPicker(false)} />}
    </div>
  );
}

// 地图点击处理器 — 自选定位
function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  const [mapMods, setMapMods] = useState<any>(null);
  useEffect(() => {
    import('react-leaflet').then(mod => setMapMods(mod));
  }, []);
  // 始终调用 useMapEvents（如果模块未加载则空操作）
  // 使用自定义 Hook 包装避免条件调用
  if (mapMods) {
    return <MapClickHandlerInner onPick={onPick} useMapEvents={mapMods.useMapEvents} />;
  }
  return null;
}

function MapClickHandlerInner({ onPick, useMapEvents }: { onPick: (lat: number, lng: number) => void; useMapEvents: any }) {
  useMapEvents({
    click(e: any) { onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

// MapPicker内部点击处理器 — 避免条件性Hooks
function MapPickerClickInner({ useMapEvents, onPick }: { useMapEvents: any; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: any) { onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

// ===== 举报弹窗 =====
function ReportModal({ building, onClose }: { building: Building; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const reasons = ['虚假信息', '不健康内容', '广告骚扰', '侵权', '其他'];

  const handleSubmit = () => {
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    reports.push({ buildingId: building.id, buildingName: building.name, reason, detail, created_at: new Date().toISOString() });
    localStorage.setItem('reports', JSON.stringify(reports));
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 32, textAlign: 'center', animation: 'scaleIn 0.25s ease' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(52,199,89,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>举报已提交</div>
          <div style={{ fontSize: 13, color: '#999' }}>我们会尽快处理，感谢您的反馈</div>
          <button onClick={onClose} style={{ marginTop: 16, padding: '8px 24px', borderRadius: 8, border: 'none', background: '#00A6E0', color: '#fff', fontSize: 14, cursor: 'pointer' }}>知道了</button>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: 380, background: '#fff', borderRadius: 12, overflow: 'hidden', animation: 'scaleIn 0.25s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #eee' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>举报房源</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#F5F5F5', cursor: 'pointer', fontSize: 14, color: '#666' }}>X</button>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 13, color: '#999', marginBottom: 8 }}>举报对象：{building.name}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 8 }}>选择举报原因</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {reasons.map(r => (
              <button key={r} onClick={() => setReason(r)} style={{ padding: '6px 14px', borderRadius: 999, border: reason === r ? '1px solid #00A6E0' : '1px solid #ddd', background: reason === r ? '#E6F7FD' : '#fff', color: reason === r ? '#00A6E0' : '#666', fontSize: 13, cursor: 'pointer' }}>{r}</button>
            ))}
          </div>
          <textarea value={detail} onChange={e => setDetail(e.target.value)} placeholder="补充说明（选填）" style={{ width: '100%', minHeight: 70, padding: 10, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
          <button onClick={handleSubmit} disabled={!reason} style={{ width: '100%', height: 44, borderRadius: 8, border: 'none', background: reason ? '#FF3B30' : '#ccc', color: '#fff', fontSize: 15, fontWeight: 600, cursor: reason ? 'pointer' : 'default', marginTop: 12 }}>提交举报</button>
        </div>
      </div>
    </div>
  );
}

// ===== 详情弹窗 =====
function DetailModal({ building, onClose }: { building: Building; onClose: () => void }) {
  const { canSeeCommission, referralLock, agentInfo } = useRole();
  const [tab, setTab] = useState<'info' | 'params' | 'facilities' | 'policy' | 'compare'>('info');
  const [showChat, setShowChat] = useState(false);
  const [showReport, setShowReport] = useState(false);
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, animation: 'fadeIn 0.2s' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 201, width: '90%', maxWidth: 600, maxHeight: '85vh', background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'scaleIn 0.25s ease' }}>
        {/* 图片 */}
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: 0, scrollbarWidth: 'none' }}>
          {(building.images || ['/images/buildings/industrial1.jpg']).map((img, i) => <img key={i} src={assetUrl(img)} alt="" style={{ width: '100%', minWidth: '100%', height: 220, objectFit: 'cover' }} />)}
        </div>
        {/* 标题 */}
        <div style={{ padding: '16px 20px 8px', borderBottom: '1px solid #eee' }}>
          {/* 经纪人推荐标签 */}
          {referralLock && (
            <div style={{ marginBottom: 8, padding: '8px 12px', background: '#EAFBEF', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, border: '1px solid #D4EDDA' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>
              <span style={{ color: '#34C759', fontWeight: 600 }}>已锁定归属</span>
              <span style={{ color: '#999' }}>| 保护期{Math.ceil((new Date(referralLock.expiresAt).getTime()-Date.now())/86400000)}天</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>{building.name}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: IKEA_BLUE, background: IKEA_YELLOW, padding: '4px 12px', borderRadius: 6, display: 'inline-block' }}>{Number(building.rent_min).toFixed(1)}<span style={{ fontSize: 12, fontWeight: 400, color: IKEA_BLUE }}>元/㎡/天</span></span>
          </div>
          <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>{building.region} · {building.park_name} · 已入驻{building.tenant_count}家企业</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {(building.industry_tags || []).slice(0, 4).map(t => <span key={t} style={{ fontSize: 11, color: C.tagFg, background: C.tagBg, padding: '2px 8px', borderRadius: 3 }}>{t}</span>)}
          </div>
        </div>
        {/* Tab */}
        <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
          {[{ k: 'info', l: '基本信息' }, { k: 'params', l: '空间参数' }, { k: 'facilities', l: '配套设施' }, { k: 'policy', l: '政策&周边' }, { k: 'compare', l: '附近对比' }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k as any)} style={{ flex: 1, padding: '10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: tab === t.k ? 600 : 400, color: tab === t.k ? C.primary : '#999', borderBottom: tab === t.k ? `2px solid ${C.primary}` : '2px solid transparent' }}>{t.l}</button>
          ))}
        </div>
        {/* 内容 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {tab === 'info' && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{[['区域', building.region], ['面积', `${building.total_area?.toLocaleString()}㎡`], ['评分', `${building.park_rating || '-'}/5`], ['入驻', `${building.tenant_count}家`], ['租金', `${Number(building.rent_min).toFixed(1)}~${Number(building.rent_max).toFixed(1)}元`], ['产业', (building.industry_tags || []).join('、') || '-']].map(([l, v]) => <div key={l}><div style={{ fontSize: 12, color: '#999' }}>{l}</div><div style={{ fontSize: 15, fontWeight: 600, color: '#333', marginTop: 2 }}>{v}</div></div>)}{building.match_reason && <div style={{ gridColumn: '1/3', padding: 10, background: C.primaryLight, borderRadius: 6, fontSize: 13, color: C.primary }}>{building.match_reason}</div>}</div>}
          {tab === 'params' && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{[['层高', `${building.floor_height}m`], ['承重', `${building.floor_load}T/㎡`], ['电力', `${building.power_capacity || '-'}KVA`], ['面积', `${building.total_area?.toLocaleString()}㎡`], ['租金', `${Number(building.rent_min).toFixed(1)}~${Number(building.rent_max).toFixed(1)}元`], ['园区', building.park_name]].map(([l, v]) => <div key={l} style={{ background: '#F8F9FB', borderRadius: 8, padding: 12 }}><div style={{ fontSize: 12, color: '#999' }}>{l}</div><div style={{ fontSize: 16, fontWeight: 700, color: '#333', marginTop: 4 }}>{v}</div></div>)}</div>}
          {tab === 'facilities' && <div>{building.amenities?.length ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{building.amenities.map((a, i) => <span key={i} style={{ fontSize: 13, color: '#333', background: '#F5F5F5', padding: '6px 14px', borderRadius: 999 }}>{a}</span>)}</div> : <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>暂无配套信息</div>}</div>}
        {/* 政策&周边 */}
        {tab === 'policy' && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 10 }}>入驻政策</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {((building as any).policy || []).map((p: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, background: '#F8F9FB', borderRadius: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00A6E0" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                  <span style={{ fontSize: 14, color: '#333' }}>{p}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 10 }}>周边配套</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {((building as any).surrounding || []).map((s: string, i: number) => (
                <span key={i} style={{ fontSize: 13, color: '#666', background: '#F5F5F5', padding: '6px 14px', borderRadius: 999 }}>{s}</span>
              ))}
            </div>
            {/* 佣金信息 — 不在C端展示，仅经纪端可见 */}
          </div>
        )}
        {/* 附近对比 */}
        {tab === 'compare' && <NearbyCompare building={building} />}
        </div>
        {/* 底部按钮 */}
        <div style={{ display: 'flex', gap: 10, padding: '12px 20px', borderTop: '1px solid #eee' }}>
          <button onClick={() => setShowChat(true)} style={{ flex: 2, height: 44, borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>咨询招商</button>
          <button onClick={() => setShowReport(true)} style={{ flex: 1, height: 44, borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#999', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
            举报
          </button>
        </div>
      </div>
      {showChat && <SalesChat building={building} onClose={() => setShowChat(false)} />}
      {showReport && <ReportModal building={building} onClose={() => setShowReport(false)} />}
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'fadeIn 0.2s' }} onClick={onClose}>
      <div style={{ maxHeight: '60vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '12px 12px 0 0' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid #eee' }}>
          <span style={{ flex: 1, color: '#333', fontWeight: 600, fontSize: 15 }}>{building.name} · 招商顾问</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#F5F5F5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
        </div>
        <div ref={ref} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              {m.role === 'sales' && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: `linear-gradient(135deg, ${C.primary}, #0088B8)`, padding: '1px 5px', borderRadius: 3, marginBottom: 2, display: 'inline-block' }}>AI</span>}
              <div style={{ background: m.role === 'user' ? C.primary : '#F5F5F5', color: m.role === 'user' ? '#fff' : '#333', padding: '8px 12px', borderRadius: 8, fontSize: 14, lineHeight: 1.5 }}>{m.text}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderTop: '1px solid #f5f5f5' }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="输入消息..." style={{ flex: 1, height: 36, padding: '0 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, outline: 'none' }} />
          <button onClick={send} disabled={!input.trim()} style={{ background: input.trim() ? C.primary : '#ccc', color: '#fff', border: 'none', borderRadius: 4, padding: '0 16px', fontSize: 14, cursor: input.trim() ? 'pointer' : 'default' }}>发送</button>
        </div>
      </div>
    </div>
  );
}

// ===== 地图选点弹窗 =====
function MapPicker({ onConfirm, onClose }: { onConfirm: (lat: number, lng: number, address: string) => void; onClose: () => void }) {
  const [isClient, setIsClient] = useState(false);
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [searchAddr, setSearchAddr] = useState('');
  const mapRef = useRef<any>(null);
  const [mapComponents, setMapComponents] = useState<any>({});

  useEffect(() => {
    setIsClient(true);
    // 动态导入leaflet组件
    import('react-leaflet').then(mod => {
      setMapComponents({
        MapContainer: mod.MapContainer,
        TileLayer: mod.TileLayer,
        CircleMarker: mod.CircleMarker,
        useMapEvents: mod.useMapEvents,
      });
    });
  }, []);

  // 搜索地址 → 用Nominatim免费API
  const handleSearchAddr = async () => {
    if (!searchAddr.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddr)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const la = parseFloat(lat), ln = parseFloat(lon);
        setMarker({ lat: la, lng: ln });
        setAddress(display_name.split(',').slice(0, 3).join(','));
        if (mapRef.current) mapRef.current.flyTo([la, ln], 14, { duration: 1 });
      } else {
        alert('未找到该地址，请尝试更具体的地址');
      }
    } catch {
      alert('地址搜索失败，请直接在地图上点击选点');
    }
  };

  // 点击地图选点
  const ClickHandler = mapComponents.useMapEvents
    ? () => <MapPickerClickInner useMapEvents={mapComponents.useMapEvents} onPick={(lat: number, lng: number) => { setMarker({ lat, lng }); setAddress(`(${lat.toFixed(4)}, ${lng.toFixed(4)})`); }} />
    : () => null;

  const { MapContainer: MC, TileLayer: TL, CircleMarker: CM } = mapComponents;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 401, width: '90%', maxWidth: 560, height: '80vh', background: '#fff', borderRadius: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'scaleIn 0.3s ease' }}>
        {/* 头部 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid #eee' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
          <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: '#333' }}>在地图上选择位置</span>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: '#F5F5F5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* 地址搜索框 */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '1px solid #f5f5f5' }}>
          <input value={searchAddr} onChange={e => setSearchAddr(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchAddr()} placeholder="搜索地址，如：余杭区文一西路" style={{ flex: 1, height: 36, padding: '0 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none' }} />
          <button onClick={handleSearchAddr} style={{ padding: '0 16px', borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 14, cursor: 'pointer' }}>搜索</button>
        </div>

        {/* 地图 */}
        <div style={{ flex: 1, position: 'relative' }}>
          {isClient && MC && (
            <MC center={[39.9, 116.4]} zoom={11} style={{ height: '100%', width: '100%' }} zoomControl={true} attributionControl={false} ref={(m: any) => { mapRef.current = m; }}>
              <TL url="https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}" subdomains={['1','2','3','4']} />
              {marker && <CM center={[marker.lat, marker.lng]} radius={8} pathOptions={{ color: C.primary, fillColor: C.primary, fillOpacity: 0.8 }} />}
              <ClickHandler />
            </MC>
          )}
          {!marker && <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '6px 16px', borderRadius: 999, fontSize: 13, pointerEvents: 'none' }}>点击地图选择位置</div>}
        </div>

        {/* 底部 */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #eee' }}>
          {address && <div style={{ fontSize: 13, color: '#666', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            {address}
          </div>}
          <button onClick={() => { if (marker && address) onConfirm(marker.lat, marker.lng, address); }} disabled={!marker} style={{ width: '100%', height: 44, borderRadius: 10, border: 'none', background: marker ? C.primary : '#ccc', color: '#fff', fontSize: 16, fontWeight: 600, cursor: marker ? 'pointer' : 'default' }}>
            {marker ? '确认位置并搜索附近房源' : '请先在地图上选点'}
          </button>
        </div>
      </div>
    </>
  );
}

// ===== 留资表单弹窗 =====
function LeadFormModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [req, setReq] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const handleSubmit = () => {
    if (!name.trim() || !phone.trim()) return;
    const leads = JSON.parse(localStorage.getItem('leads') || '[]');
    leads.push({ name, phone, company, requirement: req, created_at: new Date().toISOString() });
    localStorage.setItem('leads', JSON.stringify(leads));
    setSubmitted(true);
  };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: 400, background: '#fff', borderRadius: 16, overflow: 'hidden', animation: 'scaleIn 0.25s ease' }}>
        {submitted ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(52,199,89,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg></div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>提交成功</div>
            <div style={{ fontSize: 14, color: '#999', marginTop: 4 }}>专业顾问将在30分钟内联系您</div>
            <button onClick={onClose} style={{ marginTop: 16, padding: '8px 24px', borderRadius: 8, border: 'none', background: '#00A6E0', color: '#fff', fontSize: 14, cursor: 'pointer' }}>完成</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #eee' }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>提交选址需求</span>
              <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#F5F5F5', cursor: 'pointer', fontSize: 14 }}>X</button>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={name} onChange={e => setName(e.target.value)} style={{ height: 40, padding: '0 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none' }} placeholder="姓名 *" />
              <input value={phone} onChange={e => setPhone(e.target.value)} style={{ height: 40, padding: '0 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none' }} placeholder="手机号 *" />
              <input value={company} onChange={e => setCompany(e.target.value)} style={{ height: 40, padding: '0 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none' }} placeholder="公司名称（选填）" />
              <textarea value={req} onChange={e => setReq(e.target.value)} style={{ minHeight: 70, padding: 10, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} placeholder="选址需求，如：生物医药厂房，3000平米，承重5吨" />
              <button onClick={handleSubmit} disabled={!name.trim() || !phone.trim()} style={{ height: 44, borderRadius: 8, border: 'none', background: (name.trim() && phone.trim()) ? '#00A6E0' : '#ccc', color: '#fff', fontSize: 15, fontWeight: 700, cursor: (name.trim() && phone.trim()) ? 'pointer' : 'default' }}>提交需求</button>
              <div style={{ fontSize: 11, color: '#999', textAlign: 'center' }}>提交后顾问30分钟内联系您，信息保密</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ===== 附近产业园对比 =====
function NearbyCompare({ building }: { building: any }) {
  const [nearby, setNearby] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(assetUrl('/data/buildings.json'))
      .then(r => r.json())
      .then(data => {
        const others = data.filter((b: any) => b.id !== building.id);
        // 找距离最近的5个
        const withDist = others.map((b: any) => {
          const dist = Math.sqrt(Math.pow((b.latitude - building.latitude) * 111, 2) + Math.pow((b.longitude - building.longitude) * 111, 2));
          return { ...b, distance: Math.round(dist) };
        }).sort((a: any, b: any) => a.distance - b.distance).slice(0, 5);
        setNearby(withDist);
        setLoading(false);
      });
  }, [building.id]);

  if (loading) return <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 14 }}>加载中...</div>;
  if (nearby.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 14 }}>暂无附近园区数据</div>;

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 12 }}>附近产业园性价比对比</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F8F9FB' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#666', borderBottom: '1px solid #eee' }}>园区</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#666', borderBottom: '1px solid #eee' }}>距离</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#666', borderBottom: '1px solid #eee' }}>面积</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#666', borderBottom: '1px solid #eee' }}>租金</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#666', borderBottom: '1px solid #eee' }}>层高</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#666', borderBottom: '1px solid #eee' }}>承重</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#666', borderBottom: '1px solid #eee' }}>评分</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#666', borderBottom: '1px solid #eee' }}>性价比</th>
            </tr>
          </thead>
          <tbody>
            {/* 当前楼盘 */}
            <tr style={{ background: '#E6F7FD' }}>
              <td style={{ padding: '8px 10px', fontWeight: 700, color: '#00A6E0', borderBottom: '1px solid #eee' }}>{building.name}（当前）</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#666', borderBottom: '1px solid #eee' }}>—</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#666', borderBottom: '1px solid #eee' }}>{building.total_area?.toLocaleString()}</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#FF6B00', fontWeight: 700, borderBottom: '1px solid #eee' }}>{Number(building.rent_min).toFixed(1)}</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#666', borderBottom: '1px solid #eee' }}>{building.floor_height}m</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#666', borderBottom: '1px solid #eee' }}>{building.floor_load}T</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#666', borderBottom: '1px solid #eee' }}>{building.park_rating || '-'}</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#00A6E0', borderBottom: '1px solid #eee' }}>基准</td>
            </tr>
            {/* 附近楼盘 */}
            {nearby.map((b, i) => {
              // 性价比计算：租金越低+配套越多+评分越高 = 越好
              const valueScore = Math.round(100 - b.rent_min * 15 + (b.amenities?.length || 0) * 2 + (b.park_rating || 3) * 3);
              const isBetter = valueScore > Math.round(100 - building.rent_min * 15 + (building.amenities?.length || 0) * 2 + (building.park_rating || 3) * 3);
              return (
                <tr key={b.id}>
                  <td style={{ padding: '8px 10px', color: '#333', borderBottom: '1px solid #f5f5f5' }}>{b.name}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#999', borderBottom: '1px solid #f5f5f5' }}>{b.distance}km</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#666', borderBottom: '1px solid #f5f5f5' }}>{b.total_area?.toLocaleString()}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', color: b.rent_min < building.rent_min ? '#34C759' : '#FF3B30', fontWeight: 600, borderBottom: '1px solid #f5f5f5' }}>{Number(b.rent_min).toFixed(1)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#666', borderBottom: '1px solid #f5f5f5' }}>{b.floor_height}m</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#666', borderBottom: '1px solid #f5f5f5' }}>{b.floor_load}T</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#666', borderBottom: '1px solid #f5f5f5' }}>{b.park_rating || '-'}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: isBetter ? '#34C759' : '#999', borderBottom: '1px solid #f5f5f5' }}>{isBetter ? '更优' : '相近'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: '#999' }}>绿色租金=比当前更便宜，绿色性价比=综合更优</div>
    </div>
  );
}
