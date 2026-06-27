'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { parseRequirement, summarizeRequirement } from '../lib/agent-parser';

interface Message {
  id: string;
  role: 'user' | 'agent';
  type: 'text' | 'results' | 'requirement';
  content?: string;
  buildings?: any[];
  requirement?: string;
  expandedId?: string;
}

interface Building {
  id: string; name: string; park_name: string; region: string;
  total_area: number; floor_height: number; floor_load: number;
  power_capacity: number; rent_min: number; rent_max: number;
  industry_tags: string[]; images: string[]; is_featured: boolean;
  park_rating: number; tenant_count: number; amenities?: string[];
}

interface SalesChat {
  buildingId: string;
  buildingName: string;
  buildingImage: string;
  messages: { role: 'user' | 'sales'; text: string }[];
}

const FILTERS = [
  { key: '', label: '全部' },
  { key: 'AI', label: 'AI' },
  { key: '生物医药', label: '生物医药' },
  { key: '智能制造', label: '智能制造' },
];

let msgIdCounter = 0;
function genId() { return `msg_${Date.now()}_${msgIdCounter++}`; }

export default function HomePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { id: genId(), role: 'agent', type: 'text',
      content: '你好，我是园圈AI助手。说出你的需求，我来帮你找厂房。\n\n比如："生物医药厂房，3000平米以上，承重5吨，余杭区"' },
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('');
  const [showInputPanel, setShowInputPanel] = useState(false);
  const [activeChat, setActiveChat] = useState<Building | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'sales'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<SalesChat[]>([]);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, activeChat]);

  const addMessage = useCallback((msg: Omit<Message, 'id'>) => {
    setMessages(prev => [...prev, { ...msg, id: genId() }]);
  }, []);

  const toggleExpand = (msgId: string, buildingId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, expandedId: m.expandedId === buildingId ? undefined : buildingId } : m
    ));
  };

  // 联系销售 — 原地打开聊天，同时记录到历史
  const handleContactSales = (building: Building) => {
    setActiveChat(building);
    const existing = chatHistory.find(c => c.buildingId === building.id);
    if (existing) {
      setChatMessages(existing.messages);
    } else {
      const initial = [{ role: 'sales' as const, text: `您好！我是${building.name}的招商顾问，请问有什么可以帮您？` }];
      setChatMessages(initial);
    }
  };

  // 发送消息给销售
  const sendChatMessage = () => {
    if (!chatInput.trim() || !activeChat) return;
    const userMsg = chatInput.trim();
    const newMsgs = [...chatMessages, { role: 'user' as const, text: userMsg }];
    setChatMessages(newMsgs);
    setChatInput('');

    // 保存到历史
    const histItem: SalesChat = {
      buildingId: activeChat.id, buildingName: activeChat.name,
      buildingImage: activeChat.images?.[0] || '/images/buildings/industrial1.jpg',
      messages: newMsgs,
    };
    setChatHistory(prev => {
      const filtered = prev.filter(c => c.buildingId !== activeChat.id);
      return [histItem, ...filtered];
    });

    setTimeout(() => {
      const reply = getSalesReply(userMsg, activeChat);
      const withReply = [...newMsgs, { role: 'sales' as const, text: reply }];
      setChatMessages(withReply);
      setChatHistory(prev => prev.map(c => c.buildingId === activeChat.id ? { ...c, messages: withReply } : c));
    }, 800);
  };

  const handleSend = async (text?: string) => {
    const query = (text || input).trim();
    if (!query || loading) return;
    setInput('');
    addMessage({ role: 'user', type: 'text', content: query });
    setLoading(true);

    const req = parseRequirement(query);
    const summary = summarizeRequirement(req);
    if (summary) addMessage({ role: 'agent', type: 'requirement', requirement: summary });

    try {
      let results: Building[];
      const hasReq = req.industry || req.min_area || req.min_load || req.min_height || req.min_power || req.max_rent || req.region;

      if (hasReq) {
        // 有结构化需求 → 推荐引擎（带原始文本做语义搜索）
        const res = await api.recommend.match({
          keyword: query,
          industry: req.industry, region: req.region, min_area: req.min_area,
          max_area: req.max_area, max_rent: req.max_rent, min_height: req.min_height,
          min_load: req.min_load, min_power: req.min_power, page_size: '5',
        } as any);
        results = (res.data || []).map((r: any) => ({
          ...r.building, images: r.building.images || [],
          match_reason: r.reasons?.[0], match_score: r.score,
        }));

        // 推荐结果为空 → 用关键词兜底搜索
        if (results.length === 0) {
          const fallback = await api.buildings.search({ page_size: '5', keyword: query });
          results = fallback.data;
          if (results.length > 0) {
            addMessage({ role: 'agent', type: 'text', content: '严格条件下暂无匹配，已为您放宽搜索：' });
          }
        }
      } else {
        // 无结构化需求 → 关键词搜索
        const res = await api.buildings.search({ page_size: '5', keyword: query });
        results = res.data;
      }

      if (results.length > 0) {
        addMessage({ role: 'agent', type: 'results', buildings: results, content: `找到 ${results.length} 套匹配房源：` });
      } else {
        addMessage({ role: 'agent', type: 'text', content: '暂时没有匹配的房源。试试换个说法，比如"AI产业园 2000平米"？' });
      }
    } catch {
      addMessage({ role: 'agent', type: 'text', content: '搜索出了点问题，请稍后再试。' });
    } finally { setLoading(false); }
  };

  const handleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // 优先用 Web Speech API
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      // 不支持语音 → 展开文字输入
      setShowInputPanel(true);
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'zh-CN';
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onerror = (e: any) => {
        setIsListening(false);
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          addMessage({ role: 'agent', type: 'text', content: '麦克风权限被拒绝，请在浏览器设置中允许使用麦克风。' });
        }
      };
      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        // 直接传文字给 handleSend，不依赖 input state
        handleSend(transcript);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      setShowInputPanel(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleFilter = async (key: string) => {
    const next = activeFilter === key ? '' : key;
    setActiveFilter(next);
    if (!next) return;
    setLoading(true);
    try {
      const res = await api.buildings.search({ page_size: '10', industry: next });
      addMessage({ role: 'user', type: 'text', content: `筛选：${FILTERS.find(f => f.key === next)?.label}` });
      if (res.data.length > 0) {
        addMessage({ role: 'agent', type: 'results', buildings: res.data, content: `${next}产业 ${res.data.length} 套房源：` });
      } else {
        addMessage({ role: 'agent', type: 'text', content: '该产业暂无房源。' });
      }
    } catch { addMessage({ role: 'agent', type: 'text', content: '筛选失败。' }); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100dvh',
      background: 'linear-gradient(180deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)',
      paddingTop: 'var(--safe-top)', position: 'relative', overflow: 'hidden',
    }}>
      {/* 顶部水滴筛选器 */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-4)', paddingBottom: 'var(--space-1)', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none', position: 'relative', zIndex: 5 }}>
        {FILTERS.map(f => {
          const isActive = activeFilter === f.key;
          return (
            <button key={f.key} onClick={() => handleFilter(f.key)} style={{
              padding: '7px 18px', borderRadius: '999px', border: 'none',
              background: isActive ? 'var(--primary)' : 'var(--glass-light)',
              backdropFilter: isActive ? 'none' : 'blur(20px) saturate(200%)',
              WebkitBackdropFilter: isActive ? 'none' : 'blur(20px) saturate(200%)',
              color: isActive ? '#fff' : 'var(--text-secondary)',
              fontSize: 'var(--text-sm)', fontWeight: isActive ? 'var(--fw-semibold)' : 'var(--fw-medium)',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              boxShadow: isActive ? '0 2px 8px rgba(0,122,255,0.3)' : '0 1px 2px rgba(0,0,0,0.03)',
              transition: 'all 0.3s cubic-bezier(0.25,0.1,0.25,1)',
            }}>{f.label}</button>
          );
        })}
      </div>

      {/* 对话区域 */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '0 var(--space-4) 60px', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg}
            onExpand={(bid) => toggleExpand(msg.id, bid)}
            onContactSales={handleContactSales}
          />
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) 0' }}>
            <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%' }} />
            <div style={{ display: 'flex', gap: 4 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)', animation: `bounce 1.4s infinite ease-in-out both`, animationDelay: `${i*0.16}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 右下角四个悬浮图标 */}
      <div style={{ position: 'fixed', right: 16, bottom: 'calc(64px + var(--safe-bottom))', display: 'flex', flexDirection: 'column', gap: 10, zIndex: 22 }}>
        {/* 上架园区 */}
        <button onClick={() => router.push('/list-building')} style={floatBtnStyle(false)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9v.01" /><path d="M9 12v.01" /><path d="M9 15v.01" /><path d="M9 18v.01" />
          </svg>
        </button>

        {/* 聊过 — 查看与销售的聊天记录 */}
        <button onClick={() => setShowChatHistory(true)} style={floatBtnStyle(chatHistory.length > 0)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          {chatHistory.length > 0 && (
            <span style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: 'var(--error)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{chatHistory.length}</span>
          )}
        </button>

        {/* 收藏 */}
        <button onClick={() => router.push('/favorites')} style={floatBtnStyle(false)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        </button>

        {/* 麦克风 */}
        <button onClick={handleVoice} style={{
          ...floatBtnStyle(false),
          background: isListening ? 'rgba(255,59,48,0.85)' : 'var(--glass-light)',
          animation: isListening ? 'pulse 1.2s infinite' : 'none',
          transform: isListening ? 'scale(1.08)' : 'scale(1)',
          position: 'relative',
        }}>
          {isListening && (
            <>
              {/* 涟漪 */}
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(255,59,48,0.4)', animation: 'ripple 1.5s infinite' }} />
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(255,59,48,0.3)', animation: 'ripple 1.5s infinite 0.5s' }} />
              {/* 声波 */}
              <div style={{ position: 'absolute', bottom: -18, display: 'flex', gap: 3, alignItems: 'flex-end', height: 20 }}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{ width: 3, background: 'var(--error)', borderRadius: 2, animation: `soundBar 0.6s infinite ${i*0.1}s` }} />
                ))}
              </div>
            </>
          )}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isListening ? '#fff' : 'var(--text)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'relative', zIndex: 1 }}>
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
      </div>

      {/* 底部消息输入条 — 固定在底部，透明磨砂 */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 21,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px',
        paddingBottom: 'calc(8px + var(--safe-bottom))',
        background: 'var(--glass-light)',
        backdropFilter: 'blur(30px) saturate(200%)',
        WebkitBackdropFilter: 'blur(30px) saturate(200%)',
        borderTop: '0.5px solid var(--glass-border)',
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { handleSend(); } }}
          placeholder="输入需求..."
          style={{
            flex: 1, minHeight: 36, padding: '8px 16px',
            border: 'none', borderRadius: '999px',
            background: 'var(--glass-input)',
            fontSize: 'var(--text-sm)', color: 'var(--text)', outline: 'none',
            transition: 'box-shadow 0.2s',
          }}
          onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary)'; }}
          onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
        />
        <button
          onClick={() => input.trim() && handleSend()}
          disabled={!input.trim()}
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: input.trim() ? 'var(--primary)' : 'var(--glass-input)',
            cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.2s',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#fff' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      {/* 右下角悬浮按钮上移，避免被底部条遮挡 */}

      {/* 销售聊天面板 */}
      {activeChat && <SalesChatPanel building={activeChat} messages={chatMessages} input={chatInput} setInput={setChatInput} onSend={sendChatMessage} onClose={() => setActiveChat(null)} />}

      {/* 聊天记录列表 */}
      {showChatHistory && <ChatHistoryList history={chatHistory} onClose={() => setShowChatHistory(false)} onOpen={(c) => { setActiveChat({ id: c.buildingId, name: c.buildingName, images: [c.buildingImage] } as Building); setChatMessages(c.messages); setShowChatHistory(false); }} />}
    </div>
  );
}

// ===== 悬浮按钮样式 =====
function floatBtnStyle(hasBadge: boolean): React.CSSProperties {
  return {
    width: 44, height: 44, borderRadius: '50%', border: 'none',
    background: 'var(--glass-light)', backdropFilter: 'blur(20px) saturate(200%)',
    WebkitBackdropFilter: 'blur(20px) saturate(200%)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    transition: 'transform 0.15s cubic-bezier(0.25,0.1,0.25,1), box-shadow 0.2s',
    WebkitTapHighlightColor: 'transparent',
  };
}

// ===== 消息气泡 =====
function MessageBubble({ msg, onExpand, onContactSales }: {
  msg: Message; onExpand: (id: string) => void; onContactSales: (b: Building) => void;
}) {
  if (msg.role === 'agent' && msg.type === 'text') {
    return (
      <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #007AFF, #5856D6)', padding: '1px 6px', borderRadius: 4 }}>AI</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>园圈助手</span>
        </div>
        <div style={{ background: 'var(--glass-medium)', backdropFilter: 'blur(20px) saturate(200%)', WebkitBackdropFilter: 'blur(20px) saturate(200%)', padding: '12px 16px', borderRadius: '16px', borderBottomLeftRadius: '4px', fontSize: 'var(--text-md)', color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>{msg.content}</div>
      </div>
    );
  }
  if (msg.role === 'agent' && msg.type === 'requirement') {
    return (
      <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
        <div style={{ background: 'var(--primary-surface)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: '10px 14px', borderRadius: '12px', borderBottomLeftRadius: '4px', fontSize: 'var(--text-sm)', color: 'var(--primary-dark)', fontWeight: 500, lineHeight: 1.5 }}>{msg.requirement}</div>
      </div>
    );
  }
  if (msg.role === 'agent' && msg.type === 'results') {
    return (
      <div style={{ alignSelf: 'flex-start', width: '100%' }}>
        {msg.content && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 8 }}>{msg.content}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(msg.buildings || []).map((b, i) => (
            <BuildingCard key={b.id || i} building={b} expanded={msg.expandedId === b.id} onToggle={() => onExpand(b.id)} onContactSales={() => onContactSales(b)} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div style={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
      <div style={{ background: 'var(--primary)', color: '#fff', padding: '12px 16px', borderRadius: '16px', borderBottomRightRadius: '4px', fontSize: 'var(--text-md)', lineHeight: 1.5 }}>{msg.content}</div>
    </div>
  );
}

// ===== 房源卡片 =====
function BuildingCard({ building, expanded, onToggle, onContactSales }: {
  building: Building; expanded: boolean; onToggle: () => void; onContactSales: () => void;
}) {
  const img = building.images?.[0] || '/images/buildings/industrial1.jpg';
  return (
    <div style={{ background: 'var(--glass-card)', backdropFilter: 'blur(20px) saturate(200%)', WebkitBackdropFilter: 'blur(20px) saturate(200%)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      {/* 概要 */}
      <div onClick={onToggle} style={{ display: 'flex', height: 84, cursor: 'pointer' }}>
        <div style={{ width: 84, height: 84, flexShrink: 0, position: 'relative' }}>
          <img src={img} alt={building.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
          {(building as any).match_score && <div style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4, backdropFilter: 'blur(4px)' }}>{(building as any).match_score}分</div>}
        </div>
        <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
          <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{building.name}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{building.region} · {building.total_area?.toLocaleString()}㎡ · {building.floor_height}m层高 · {building.floor_load}T承重</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {(building.industry_tags || []).slice(0, 2).map(tag => <span key={tag} className={`tag ${tag === 'AI' ? 'tag-ai' : tag === '生物医药' ? 'tag-bio' : tag === '智能制造' ? 'tag-manufacturing' : 'tag-default'}`}>{tag}</span>)}
            </div>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text)' }}>{Number(building.rent_min).toFixed(1)}起</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: 12 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}><polyline points="6 9 12 15 18 9" /></svg>
        </div>
      </div>

      {/* 匹配理由 */}
      {(building as any).match_reason && <div style={{ padding: '5px 12px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', borderTop: '0.5px solid rgba(60,60,67,0.12)' }}>{(building as any).match_reason}</div>}

      {/* 展开详情 */}
      {expanded && (
        <div style={{ padding: 16, borderTop: '0.5px solid var(--glass-border)', animation: 'expandIn 0.3s cubic-bezier(0.25,0.1,0.25,1)' }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12, scrollbarWidth: 'none' }}>
            {(building.images || ['/images/buildings/industrial1.jpg']).map((im, i) => <img key={i} src={im} alt="" style={{ width: 180, height: 110, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} loading="lazy" />)}
          </div>
          <div className="info-grid" style={{ marginBottom: 12 }}>
            <div className="info-item"><span className="info-label">面积</span><span className="info-value">{building.total_area?.toLocaleString()}㎡</span></div>
            <div className="info-item"><span className="info-label">层高</span><span className="info-value">{building.floor_height}m</span></div>
            <div className="info-item"><span className="info-label">承重</span><span className="info-value">{building.floor_load}T/㎡</span></div>
            <div className="info-item"><span className="info-label">电力</span><span className="info-value">{building.power_capacity || '-'}KVA</span></div>
            <div className="info-item"><span className="info-label">租金</span><span className="info-value">{Number(building.rent_min).toFixed(1)}~{Number(building.rent_max).toFixed(1)}</span></div>
            <div className="info-item"><span className="info-label">评分</span><span className="info-value">{building.park_rating || '-'}/5</span></div>
          </div>
          {building.amenities && building.amenities.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>配套设施</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{building.amenities!.map((a, i) => <span key={i} className="chip" style={{ fontSize: 'var(--text-xs)', padding: '3px 10px' }}>{a}</span>)}</div>
            </div>
          )}
          <button onClick={onContactSales} className="btn-primary" style={{ width: '100%' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 6 }}>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            联系销售
          </button>
        </div>
      )}
    </div>
  );
}

// ===== 销售聊天面板 =====
function SalesChatPanel({ building, messages, input, setInput, onSend, onClose }: {
  building: Building; messages: { role: 'user' | 'sales'; text: string }[];
  input: string; setInput: (v: string) => void; onSend: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showContract, setShowContract] = useState(false);
  useEffect(() => { if (ref.current) ref.current.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' }); }, [messages]);
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 300, animation: 'fadeIn 0.2s' }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301, maxHeight: '70vh', display: 'flex', flexDirection: 'column', background: 'var(--glass-sheet)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', borderRadius: '20px 20px 0 0', boxShadow: '0 -8px 32px rgba(0,0,0,0.12)', animation: 'slideUpSheet 0.35s cubic-bezier(0.25,0.1,0.25,1)', paddingBottom: 'var(--safe-bottom)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '0.5px solid var(--glass-border)' }}>
          <img src={building.images?.[0] || '/images/buildings/industrial1.jpg'} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{building.name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{building.region} · 招商顾问在线</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(120,120,128,0.12)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div ref={ref} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              {m.role === 'sales' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#fff',
                    background: 'linear-gradient(135deg, #007AFF, #5856D6)',
                    padding: '1px 6px', borderRadius: 4, letterSpacing: '0.02em',
                  }}>AI</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>智能客服</span>
                </div>
              )}
              <div style={{ background: m.role === 'user' ? 'var(--primary)' : 'var(--glass-input)', color: m.role === 'user' ? '#fff' : 'var(--text)', padding: '8px 12px', borderRadius: '14px', borderBottomRightRadius: m.role === 'user' ? 4 : 14, borderBottomLeftRadius: m.role === 'user' ? 14 : 4, fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>{m.text}</div>
            </div>
          ))}
        </div>
        {/* 确定租购按钮 */}
        <div style={{ padding: '8px 16px 0' }}>
          <button onClick={() => setShowContract(true)} className="btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #34C759, #30D158)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            确定租购 · 生成合同
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 16px', borderTop: '0.5px solid var(--glass-border)', marginTop: 4 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && onSend()} placeholder="输入消息..." style={{ flex: 1, minHeight: 36, padding: '8px 16px', border: 'none', borderRadius: '999px', background: 'var(--glass-input)', fontSize: 'var(--text-md)', color: 'var(--text)', outline: 'none' }} />
          <button onClick={onSend} disabled={!input.trim()} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: input.trim() ? 'var(--primary)' : 'rgba(120,120,128,0.2)', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#fff' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </button>
        </div>
      </div>

      {/* 预制合同 */}
      {showContract && <ContractPanel building={building} onClose={() => setShowContract(false)} />}
    </>
  );
}

// ===== 聊天记录列表 =====
function ChatHistoryList({ history, onClose, onOpen }: {
  history: SalesChat[]; onClose: () => void; onOpen: (c: SalesChat) => void;
}) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 300, animation: 'fadeIn 0.2s' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 301, width: '90%', maxWidth: 360, maxHeight: '60vh', background: 'var(--glass-sheet)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', borderRadius: 20, boxShadow: 'var(--shadow-xl)', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'scaleIn 0.25s cubic-bezier(0.25,0.1,0.25,1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid rgba(60,60,67,0.12)' }}>
          <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>聊天记录</span>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--glass-input)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {history.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>还没有聊天记录</div>
          ) : history.map(c => (
            <div key={c.buildingId} onClick={() => onOpen(c)} className="list-row" style={{ borderRadius: 12 }}>
              <img src={c.buildingImage} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.buildingName}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.messages[c.messages.length - 1]?.text}</div>
              </div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{c.messages.length}条</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ===== 销售自动回复 =====
function getSalesReply(msg: string, b: Building): string {
  const l = msg.toLowerCase();
  if (l.includes('价格') || l.includes('租金') || l.includes('多少钱')) return `${b.name}租金${Number(b.rent_min).toFixed(1)}~${Number(b.rent_max).toFixed(1)}元/㎡/天，面积和租期不同有议价空间。您需要多大面积？`;
  if (l.includes('面积') || l.includes('多大')) return `可租面积500㎡到${b.total_area?.toLocaleString()}㎡，可灵活分割。您需要多大？`;
  if (l.includes('看') || l.includes('参观') || l.includes('预约')) return `好的，帮您预约看房。您这周几方便？`;
  if (l.includes('层高')) return `层高${b.floor_height}米，满足大部分生产需求。`;
  if (l.includes('承重')) return `承重${b.floor_load}吨/㎡，可放重型设备。`;
  if (l.includes('环评')) return `园区已有环评手续，可确认具体等级。`;
  return `好的，关于${b.name}还有什么想了解的？`;
}

// ===== 预制合同面板 =====
function ContractPanel({ building, onClose }: { building: Building; onClose: () => void }) {
  const today = new Date().toLocaleDateString('zh-CN');
  const contractNo = `YQ-${Date.now().toString().slice(-8)}`;
  const rentMid = ((Number(building.rent_min) + Number(building.rent_max)) / 2).toFixed(2);
  const yearRent = (Number(rentMid) * Number(building.total_area) * 365).toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 400, animation: 'fadeIn 0.2s' }} />
      <div style={{ position: 'fixed', top: '5%', left: '50%', transform: 'translateX(-50%)', zIndex: 401, width: '92%', maxWidth: 380, maxHeight: '85vh', background: 'var(--glass-sheet)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', borderRadius: 20, boxShadow: 'var(--shadow-xl)', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'scaleIn 0.3s cubic-bezier(0.25,0.1,0.25,1)' }}>
        {/* 头部 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid var(--glass-border)' }}>
          <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>厂房租赁意向合同</span>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--glass-input)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* 合同内容 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', fontSize: 'var(--text-sm)', lineHeight: 1.8, color: 'var(--text)' }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 4 }}>厂房租赁意向协议书</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>合同编号：{contractNo}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>签订日期：{today}</div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>甲方（出租方）：</div>
            <div>{building.park_name || building.name} 管理方</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>乙方（承租方）：</div>
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>（待填写）</div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>第一条 租赁标的</div>
            <div>甲方将位于{building.region}的<strong>{building.name}</strong>厂房出租给乙方使用。</div>
          </div>

          <div className="info-grid" style={{ marginBottom: 12, background: 'var(--glass-input)', padding: 12, borderRadius: 12 }}>
            <div className="info-item"><span className="info-label">建筑面积</span><span className="info-value">{building.total_area?.toLocaleString()}㎡</span></div>
            <div className="info-item"><span className="info-label">层高</span><span className="info-value">{building.floor_height}m</span></div>
            <div className="info-item"><span className="info-label">承重</span><span className="info-value">{building.floor_load}T/㎡</span></div>
            <div className="info-item"><span className="info-label">电力</span><span className="info-value">{building.power_capacity || '-'}KVA</span></div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>第二条 租金标准</div>
            <div>日租金：<strong>{rentMid}元/㎡/天</strong>（区间{Number(building.rent_min).toFixed(1)}~{Number(building.rent_max).toFixed(1)}元）</div>
            <div>年租金约：<strong>{yearRent}元</strong></div>
            <div>租金支付方式：押三付一，每季度初5个工作日内支付。</div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>第三条 租赁期限</div>
            <div>租赁期限为 <strong>3年</strong>，自实际交付之日起算。期满后乙方在同等条件下享有优先续租权。</div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>第四条 用途限制</div>
            <div>乙方承租厂房仅限用于 <strong>{(building.industry_tags || ['工业生产'])[0]}</strong> 相关生产经营活动，不得擅自改变用途。</div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>第五条 双方权利义务</div>
            <div>1. 甲方保证厂房具备合法产权及消防验收手续。</div>
            <div>2. 乙方应按时支付租金，合理使用厂房设施。</div>
            <div>3. 装修改造需经甲方书面同意，费用由乙方承担。</div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>第六条 违约责任</div>
            <div>任何一方违约，应向守约方支付年租金10%的违约金，并赔偿由此造成的损失。</div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
            <div><div>甲方签章：</div><div style={{ marginTop: 20 }}>日期：{today}</div></div>
            <div><div>乙方签章：</div><div style={{ marginTop: 20 }}>日期：____年__月__日</div></div>
          </div>

          <div style={{ marginTop: 16, padding: 10, background: 'rgba(255,149,0,0.08)', borderRadius: 8, fontSize: 'var(--text-xs)', color: 'var(--warning)' }}>
            此为意向协议，正式合同将在实地看房后由双方协商签署。
          </div>
        </div>

        {/* 底部操作 */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px', borderTop: '0.5px solid var(--glass-border)' }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1, minHeight: 40 }}>关闭</button>
          <button onClick={() => {
            // 生成可打印的合同
            const contractEl = document.createElement('div');
            contractEl.innerHTML = '<pre style="font-size:12px;line-height:1.8;white-space:pre-wrap;padding:20px;">' +
              '园圈平台 - 厂房租赁意向协议书\n' +
              '合同编号：' + contractNo + '\n' +
              '签订日期：' + today + '\n\n' +
              '甲方：' + (building.park_name || building.name) + ' 管理方\n' +
              '乙方：（待填写）\n\n' +
              '租赁标的：' + building.name + '（' + building.region + '）\n' +
              '面积：' + building.total_area + '㎡  层高：' + building.floor_height + 'm  承重：' + building.floor_load + 'T/㎡\n' +
              '日租金：' + rentMid + '元/㎡/天  年租金约：' + yearRent + '元\n' +
              '租期：3年  支付方式：押三付一\n\n' +
              '此为意向协议，正式合同将在实地看房后签署。\n' +
              '</pre>';
            const win = window.open('', '_blank');
            if (win) { win.document.body.appendChild(contractEl); win.print(); }
          }} className="btn-primary" style={{ flex: 1, minHeight: 40, background: 'linear-gradient(135deg, #007AFF, #4CA6FF)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 4 }}>
              <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
            </svg>
            打印/保存
          </button>
        </div>
      </div>
    </>
  );
}
