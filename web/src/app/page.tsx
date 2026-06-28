'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { parseRequirement, summarizeRequirement, type ParsedRequirement } from '../lib/agent-parser';
import { initSearchEngine, searchBuildings, type BuildingData } from '../lib/client-search';
import { assetUrl } from '../lib/asset';

interface Building extends BuildingData {
  match_score?: number;
  match_reason?: string;
}

// 58同城配色
const C = {
  primary: '#FF552E',      // 58橙
  primaryLight: '#FFF0EB', // 浅橙背景
  primaryDark: '#E84A1F',
  bg: '#F5F5F5',
  card: '#FFFFFF',
  text: '#333333',
  textSub: '#666666',
  textMuted: '#999999',
  border: '#EEEEEE',
  price: '#FF552E',
  tagBg: '#FFF0EB',
  tagFg: '#FF552E',
};

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
  const [all, setAll] = useState<Building[]>([]);
  const [list, setList] = useState<Building[]>([]);
  const [keyword, setKeyword] = useState('');
  const [selIndustry, setSelIndustry] = useState('全部');
  const [selArea, setSelArea] = useState('不限');
  const [selRent, setSelRent] = useState('不限');
  const [selSort, setSelSort] = useState('default');
  const [selected, setSelected] = useState<Building | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiMsgs, setAiMsgs] = useState<{ role: 'user' | 'agent'; text: string }[]>([
    { role: 'agent', text: '您好，我是园圈AI选址助手。描述您的需求，我来帮您筛选厂房。\n\n例如：生物医药厂房，3000平米以上，承重5吨，余杭区' },
  ]);
  const [lastReq, setLastReq] = useState<ParsedRequirement | null>(null);
  const [pendingQ, setPendingQ] = useState<string | null>(null);
  const [city, setCity] = useState('全国');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const aiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(assetUrl('/data/buildings.json'))
      .then(r => r.json())
      .then((data: BuildingData[]) => {
        initSearchEngine(data);
        const mapped = data as Building[];
        setAll(mapped);
        setList(mapped);
      });
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

  // 执行筛选
  const doFilter = useCallback(() => {
    let results = [...all];

    // 关键词搜索
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
      results = searchResults.map(r => ({ ...r.building, match_score: r.score, match_reason: r.reasons[0] }));
    } else if (selIndustry !== '全部') {
      const searchResults = searchBuildings('', { industry: selIndustry }, 100);
      results = searchResults.map(r => ({ ...r.building, match_score: r.score, match_reason: r.reasons[0] }));
    }

    // 面积筛选
    const areaFilter = parseAreaFilter(selArea);
    if (areaFilter.min) results = results.filter(b => b.total_area >= areaFilter.min!);
    if (areaFilter.max) results = results.filter(b => b.total_area <= areaFilter.max!);

    // 租金筛选
    const rentFilter = parseRentFilter(selRent);
    if (rentFilter.max) results = results.filter(b => b.rent_min <= rentFilter.max!);

    // 排序
    if (selSort === 'price_asc') results.sort((a, b) => a.rent_min - b.rent_min);
    else if (selSort === 'price_desc') results.sort((a, b) => b.rent_min - a.rent_min);
    else if (selSort === 'area_desc') results.sort((a, b) => b.total_area - a.total_area);
    else if (keyword.trim() || selIndustry !== '全部') results.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

    setList(results);
  }, [all, keyword, selIndustry, selArea, selRent, selSort]);

  useEffect(() => { doFilter(); }, [selIndustry, selArea, selRent, selSort, keyword, doFilter]);

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

  const cities = ['全国', '杭州', '北京', '上海', '深圳', '广州', '苏州'];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif' }}>
      {/* ===== 顶部导航栏 ===== */}
      <div style={{ background: '#fff', borderBottom: `2px solid ${C.primary}`, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px' }}>
          {/* Logo */}
          <div style={{ fontSize: 22, fontWeight: 800, color: C.primary, flexShrink: 0, letterSpacing: '-0.02em' }}>园圈</div>
          {/* 城市选择 */}
          <button onClick={() => setShowCityPicker(!showCityPicker)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: '1px solid #ddd', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 13, color: C.textSub }}>
            {city}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {/* 搜索框 */}
          <div style={{ flex: 1, display: 'flex', maxWidth: 500 }}>
            <input value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && doFilter()} placeholder="搜索园区/厂房/地址/产业" style={{ flex: 1, height: 36, padding: '0 12px', border: `2px solid ${C.primary}`, borderRadius: '4px 0 0 4px', fontSize: 14, outline: 'none', borderRight: 'none' }} />
            <button onClick={doFilter} style={{ background: C.primary, color: '#fff', border: 'none', borderRadius: '0 4px 4px 0', padding: '0 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>搜索</button>
          </div>
          {/* AI助手 */}
          <button onClick={() => setShowAI(!showAI)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: showAI ? C.primary : 'none', color: showAI ? '#fff' : C.primary, border: `1px solid ${C.primary}`, borderRadius: 4, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
            AI选址
          </button>
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

      {/* ===== AI对话面板 ===== */}
      {showAI && (
        <div style={{ background: '#fff', borderBottom: '1px solid #eee', maxHeight: '280px', display: 'flex', flexDirection: 'column' }}>
          <div ref={aiRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
            {aiMsgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                {m.role === 'agent' && <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: `linear-gradient(135deg, ${C.primary}, #FF8C5A)`, padding: '1px 6px', borderRadius: 3, marginBottom: 3, display: 'inline-block' }}>AI</span>}
                <div style={{ background: m.role === 'user' ? C.primary : '#F5F5F5', color: m.role === 'user' ? '#fff' : C.text, padding: '8px 12px', borderRadius: 8, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.text}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '8px 20px', borderTop: '1px solid #f5f5f5', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
            <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAISend()} placeholder="描述您的选址需求..." style={{ flex: 1, height: 34, padding: '0 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, outline: 'none' }} />
            <button onClick={() => handleAISend()} disabled={!aiInput.trim()} style={{ background: aiInput.trim() ? C.primary : '#ccc', color: '#fff', border: 'none', borderRadius: 4, padding: '0 16px', fontSize: 14, cursor: aiInput.trim() ? 'pointer' : 'default' }}>发送</button>
          </div>
        </div>
      )}

      {/* ===== 主内容区 ===== */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px', display: 'flex', gap: 16 }}>
        {/* 左侧筛选栏 */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>产业类型</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {INDUSTRIES.map(ind => <button key={ind} onClick={() => setSelIndustry(ind)} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: selIndustry === ind ? C.primary : '#F5F5F5', color: selIndustry === ind ? '#fff' : C.textSub, fontSize: 12, cursor: 'pointer' }}>{ind}</button>)}
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>面积</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {AREA_OPTIONS.map(a => <button key={a} onClick={() => setSelArea(a)} style={{ textAlign: 'left', padding: '5px 10px', borderRadius: 4, border: selArea === a ? `1px solid ${C.primary}` : '1px solid transparent', background: selArea === a ? C.primaryLight : 'none', color: selArea === a ? C.primary : C.textSub, fontSize: 13, cursor: 'pointer' }}>{a}</button>)}
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>租金（元/㎡/天）</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {RENT_OPTIONS.map(r => <button key={r} onClick={() => setSelRent(r)} style={{ textAlign: 'left', padding: '5px 10px', borderRadius: 4, border: selRent === r ? `1px solid ${C.primary}` : '1px solid transparent', background: selRent === r ? C.primaryLight : 'none', color: selRent === r ? C.primary : C.textSub, fontSize: 13, cursor: 'pointer' }}>{r}</button>)}
            </div>
          </div>
        </div>

        {/* 右侧列表区 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 排序栏 */}
          <div style={{ background: '#fff', borderRadius: 8, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {SORT_OPTIONS.map(s => <button key={s.key} onClick={() => setSelSort(s.key)} style={{ padding: '5px 12px', borderRadius: 4, border: 'none', background: selSort === s.key ? C.primary : 'none', color: selSort === s.key ? '#fff' : C.textSub, fontSize: 13, cursor: 'pointer', fontWeight: selSort === s.key ? 600 : 400 }}>{s.label}</button>)}
            </div>
            <span style={{ fontSize: 13, color: C.textMuted }}>共 {list.length} 套</span>
          </div>

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
                  <div style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>{b.region} · {b.park_name}</div>
                  <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>{b.total_area?.toLocaleString()}㎡ | {b.floor_height}m层高 | {b.floor_load}T承重 | {b.power_capacity || '-'}KVA</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    {(b.industry_tags || []).slice(0, 4).map(t => <span key={t} style={{ fontSize: 11, color: C.tagFg, background: C.tagBg, padding: '2px 6px', borderRadius: 3 }}>{t}</span>)}
                    {b.amenities?.slice(0, 2).map(a => <span key={a} style={{ fontSize: 11, color: C.textMuted, background: '#F5F5F5', padding: '2px 6px', borderRadius: 3 }}>{a}</span>)}
                  </div>
                </div>
                {b.match_reason && <div style={{ fontSize: 12, color: C.primary, marginTop: 4 }}>{b.match_reason}</div>}
              </div>
              {/* 价格 */}
              <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 100 }}>
                <div><span style={{ fontSize: 20, fontWeight: 800, color: C.price }}>{Number(b.rent_min).toFixed(1)}</span><span style={{ fontSize: 12, color: C.textMuted }}>元/㎡/天</span></div>
                {b.match_score && <div style={{ fontSize: 12, color: C.primary, marginTop: 4 }}>匹配 {b.match_score}分</div>}
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{b.tenant_count}家入驻</div>
              </div>
            </div>
          ))}

          {list.length === 0 && <div style={{ textAlign: 'center', padding: 60, color: C.textMuted, fontSize: 14 }}>暂无匹配房源，试试调整筛选条件</div>}
        </div>
      </div>

      {/* ===== 详情弹窗 ===== */}
      {selected && <DetailModal building={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ===== 详情弹窗 =====
function DetailModal({ building, onClose }: { building: Building; onClose: () => void }) {
  const [tab, setTab] = useState<'info' | 'params' | 'facilities'>('info');
  const [showChat, setShowChat] = useState(false);
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>{building.name}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: C.primary }}>{Number(building.rent_min).toFixed(1)}<span style={{ fontSize: 12, fontWeight: 400, color: '#999' }}>元/㎡/天</span></span>
          </div>
          <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>{building.region} · {building.park_name} · 已入驻{building.tenant_count}家企业</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {(building.industry_tags || []).slice(0, 4).map(t => <span key={t} style={{ fontSize: 11, color: C.tagFg, background: C.tagBg, padding: '2px 8px', borderRadius: 3 }}>{t}</span>)}
          </div>
        </div>
        {/* Tab */}
        <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
          {[{ k: 'info', l: '基本信息' }, { k: 'params', l: '空间参数' }, { k: 'facilities', l: '配套设施' }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k as any)} style={{ flex: 1, padding: '10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: tab === t.k ? 600 : 400, color: tab === t.k ? C.primary : '#999', borderBottom: tab === t.k ? `2px solid ${C.primary}` : '2px solid transparent' }}>{t.l}</button>
          ))}
        </div>
        {/* 内容 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {tab === 'info' && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{[['区域', building.region], ['面积', `${building.total_area?.toLocaleString()}㎡`], ['评分', `${building.park_rating || '-'}/5`], ['入驻', `${building.tenant_count}家`], ['租金', `${Number(building.rent_min).toFixed(1)}~${Number(building.rent_max).toFixed(1)}元`], ['产业', (building.industry_tags || []).join('、') || '-']].map(([l, v]) => <div key={l}><div style={{ fontSize: 12, color: '#999' }}>{l}</div><div style={{ fontSize: 15, fontWeight: 600, color: '#333', marginTop: 2 }}>{v}</div></div>)}{building.match_reason && <div style={{ gridColumn: '1/3', padding: 10, background: C.primaryLight, borderRadius: 6, fontSize: 13, color: C.primary }}>{building.match_reason}</div>}</div>}
          {tab === 'params' && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{[['层高', `${building.floor_height}m`], ['承重', `${building.floor_load}T/㎡`], ['电力', `${building.power_capacity || '-'}KVA`], ['面积', `${building.total_area?.toLocaleString()}㎡`], ['租金', `${Number(building.rent_min).toFixed(1)}~${Number(building.rent_max).toFixed(1)}元`], ['园区', building.park_name]].map(([l, v]) => <div key={l} style={{ background: '#F8F9FB', borderRadius: 8, padding: 12 }}><div style={{ fontSize: 12, color: '#999' }}>{l}</div><div style={{ fontSize: 16, fontWeight: 700, color: '#333', marginTop: 4 }}>{v}</div></div>)}</div>}
          {tab === 'facilities' && <div>{building.amenities?.length ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{building.amenities.map((a, i) => <span key={i} style={{ fontSize: 13, color: '#333', background: '#F5F5F5', padding: '6px 14px', borderRadius: 999 }}>{a}</span>)}</div> : <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>暂无配套信息</div>}</div>}
        </div>
        {/* 底部按钮 */}
        <div style={{ display: 'flex', gap: 10, padding: '12px 20px', borderTop: '1px solid #eee' }}>
          <button onClick={() => setShowChat(true)} style={{ flex: 1, height: 44, borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>咨询招商</button>
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'fadeIn 0.2s' }} onClick={onClose}>
      <div style={{ maxHeight: '60vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '12px 12px 0 0' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid #eee' }}>
          <span style={{ flex: 1, color: '#333', fontWeight: 600, fontSize: 15 }}>{building.name} · 招商顾问</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#F5F5F5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
        </div>
        <div ref={ref} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              {m.role === 'sales' && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: `linear-gradient(135deg, ${C.primary}, #FF8C5A)`, padding: '1px 5px', borderRadius: 3, marginBottom: 2, display: 'inline-block' }}>AI</span>}
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
