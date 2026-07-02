'use client';

import React, { useState, useEffect } from 'react';
import { assetUrl } from '../../lib/asset';
import { useRole, authenticate, agentLink as genLink } from '../../lib/role-context';
import { setCurrentUserId, getCurrentUser, getConversations, PARK_CONTACTS } from '../../lib/chat-store';
import { ChatPanel } from '../../components/ChatPanel';
import { ParkDetail } from '../../components/ParkDetail';
import { IKEA, FONT, SHADOW, RADIUS } from '../../lib/ikea-style';

const C = { primary: '#0058A3', primaryLight: '#E5F0FA', bg: '#F5F5F5', text: '#111', textSub: '#484848', textMuted: '#767676', orange: '#FF6B00', yellow: '#FFDA1A', border: '#E5E5E5', sale: '#E0001B' };

export default function AgentCoopPage() {
  const { isAgent, setRole, agentInfo, setAgentInfo } = useRole();
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selIndustry, setSelIndustry] = useState('');
  const [showLogin, setShowLogin] = useState(!isAgent);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [chatTarget, setChatTarget] = useState<{ id: string; name: string } | null>(null);
  const [showContacts, setShowContacts] = useState(false);
  const [showCompare, setShowCompare] = useState<any>(null);
  const [parkDetail, setParkDetail] = useState<{ name: string; region?: string } | null>(null);
  const bp = process.env.NEXT_PUBLIC_BASE_PATH || '';

  useEffect(() => {
    fetch(assetUrl('/data/buildings.json')).then(r => r.json()).then(data => {
      const withC = data.map((b: any, i: number) => ({
        ...b,
        commission: b.commission || Math.round(parseFloat(b.rent_min) * parseFloat(b.total_area) * 30 * (1 + (i % 3)) / 10000 * 10) / 10,
        commission_rate: b.commission_rate || (1 + (i % 3)) + '个月租金',
      }));
      setBuildings(withC);
    });
  }, []);

  const handleLogin = () => {
    if (!loginUser.trim() || !loginPass.trim()) return;
    const account = authenticate(loginUser.trim(), loginPass);
    if (!account || account.role !== 'agent') { setLoginErr('该账号无经纪人权限'); return; }
    setAgentInfo({ name: account.name, phone: account.phone, agentId: account.agentId });
    setRole(account.role);
    setCurrentUserId(account.agentId, account.name, 'agent');
    setShowLogin(false);
  };

  const filtered = selIndustry ? buildings.filter(b => b.industry_tags?.some((t: string) => t.includes(selIndustry))) : buildings;
  const industries = ['', 'AI', '生物医药', '智能制造', '新能源', '集成电路', '新材料'];
  const me = getCurrentUser();
  const convs = getConversations();

  // ===== 登录页 =====
  if (showLogin) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 420, width: '90%', padding: 40, background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 8 }}>经纪人登录</div>
            <div style={{ display: 'inline-block', fontSize: 11, color: C.orange, background: '#FFF8E5', padding: '3px 12px', borderRadius: 4, fontWeight: 600 }}>测试阶段</div>
          </div>
          <input value={loginUser} onChange={e => { setLoginUser(e.target.value); setLoginErr(''); }} placeholder="账号" style={{ width: '100%', height: 48, padding: '0 16px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 15, outline: 'none', marginBottom: 12, fontFamily: FONT }} />
          <input type="password" value={loginPass} onChange={e => { setLoginPass(e.target.value); setLoginErr(''); }} placeholder="密码" style={{ width: '100%', height: 48, padding: '0 16px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 15, outline: 'none', marginBottom: 12, fontFamily: FONT }} />
          {loginErr && <div style={{ color: C.sale, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>{loginErr}</div>}
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16, background: C.primaryLight, padding: '8px 12px', borderRadius: 6 }}>测试账号：broker / broker123</div>
          <button onClick={handleLogin} style={{ width: '100%', height: 48, borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>登录</button>
          <a href={`${bp}/`} style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 13, color: C.textMuted, textDecoration: 'none' }}>返回首页</a>
        </div>
      </div>
    );
  }

  // ===== 私聊面板（全屏） =====
  if (chatTarget) {
    return (
      <div style={{ height: '100vh', background: C.bg, fontFamily: FONT }}>
        <ChatPanel otherId={chatTarget.id} otherName={chatTarget.name} onBack={() => setChatTarget(null)} />
      </div>
    );
  }

  // ===== 主页：小红书瀑布流 =====
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT }}>
      {/* 顶部导航 */}
      <div style={{ background: C.primary, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px' }}>
          <a href={`${bp}/`} style={{ fontSize: 22, fontWeight: 900, color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: C.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.5"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" /></svg>
            </div>
            园圈
          </a>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>| 经纪端</span>
          <div style={{ flex: 1 }} />
          {/* 私聊入口 */}
          <button onClick={() => setShowContacts(true)} style={{ position: 'relative', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            私聊
            {convs.length > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: C.sale, color: '#fff', fontSize: 10, minWidth: 16, height: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', fontWeight: 700 }}>{convs.length}</span>}
          </button>
          <span style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{agentInfo?.name || '经纪人'}</span>
        </div>
      </div>

      {/* 产业筛选 */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 20px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {industries.map(ind => (
          <button key={ind} onClick={() => setSelIndustry(ind)} style={{ padding: '6px 16px', borderRadius: 999, border: 'none', background: selIndustry === ind ? C.primary : '#fff', color: selIndustry === ind ? '#fff' : C.textSub, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: FONT }}>{ind || '全部'}</button>
        ))}
      </div>

      {/* 瀑布流房源卡片 */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 40px', columns: 4, columnGap: 14 }}>
        {filtered.map((b, i) => {
          const heights = [200, 260, 230, 280, 240, 270]; // 瀑布流错落高度
          const h = heights[i % heights.length];
          return (
            <div key={b.id} style={{ breakInside: 'avoid', marginBottom: 14, background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: SHADOW.card, border: `1px solid ${C.border}`, cursor: 'pointer' }} onClick={() => setParkDetail({ name: b.park_name || b.name, region: b.region })}>
              {/* 图片 */}
              <div style={{ position: 'relative', height: h }}>
                <img src={assetUrl(b.images?.[0] || '/images/buildings/industrial1.jpg')} alt={b.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {/* 佣金黄色标签 — 左上 */}
                <div style={{ position: 'absolute', top: 8, left: 8, background: C.yellow, color: C.primary, padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 900, boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
                  佣金 {b.commission}万
                </div>
                {/* 主推楼型 — 右下 */}
                {b.main_type && <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{b.main_type}</div>}
              </div>
              {/* 内容 */}
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.4, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{b.name}</div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
                  {(b.policy || []).slice(0, 1).map((p: string, j: number) => <span key={j} style={{ fontSize: 10, color: '#008A00', background: '#EAFBEF', padding: '1px 6px', borderRadius: 3 }}>{p}</span>)}
                  {b.road && <span style={{ fontSize: 10, color: C.primary, background: C.primaryLight, padding: '1px 6px', borderRadius: 3, fontWeight: 600 }}>{b.road}</span>}
                  {b.region && <span style={{ fontSize: 10, color: C.textMuted, background: '#F0F0F0', padding: '1px 6px', borderRadius: 3 }}>{b.region}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 900, color: C.sale }}>{Number(b.rent_min).toFixed(1)}</span>
                    <span style={{ fontSize: 11, color: C.textMuted }}>元/㎡/天</span>
                  </div>
                  <span style={{ fontSize: 11, color: C.textMuted }}>{b.commission_rate}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 联系人选择弹窗（私聊入口） */}
      {showContacts && (
        <div onClick={() => setShowContacts(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, background: '#fff', borderRadius: '16px 16px 0 0', padding: 20, maxHeight: '70vh', overflowY: 'auto', animation: 'scaleIn 0.25s ease', fontFamily: FONT }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              联系园区管理者
              <button onClick={() => setShowContacts(false)} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#F0F0F0', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            {/* 已有会话 */}
            {convs.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>最近会话</div>
                {convs.map(c => {
                  const contact = PARK_CONTACTS.find(p => p.id === c.participants.find(x => x !== me?.id));
                  return (
                    <div key={c.id} onClick={() => { setChatTarget({ id: c.participants.find(x => x !== me?.id) || '', name: contact?.name || '园区经理' }); setShowContacts(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.primaryLight, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>{(contact?.name || '园')[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{contact?.name || '园区经理'}</div>
                        <div style={{ fontSize: 12, color: C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{c.lastMessage}</div>
                      </div>
                      {c.unread > 0 && <span style={{ background: C.sale, color: '#fff', fontSize: 11, minWidth: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{c.unread}</span>}
                    </div>
                  );
                })}
              </div>
            )}
            {/* 园区联系人列表 */}
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>园区管理者</div>
            {PARK_CONTACTS.map(p => (
              <div key={p.id} onClick={() => { setChatTarget({ id: p.id, name: p.name }); setShowContacts(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.primaryLight, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>{p.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{p.park}</div>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 园区详情 */}
      {parkDetail && (
        <ParkDetail parkName={parkDetail.name} region={parkDetail.region} onClose={() => setParkDetail(null)} onChatPark={(id, name) => { setParkDetail(null); setChatTarget({ id, name }); }} />
      )}

      {/* 房型快讯弹窗 */}
      {showCompare && (
        <div onClick={() => setShowCompare(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, background: '#fff', borderRadius: 16, overflow: 'hidden', maxHeight: '85vh', overflowY: 'auto', animation: 'scaleIn 0.25s ease', fontFamily: FONT }}>
            <img src={assetUrl(showCompare.images?.[0] || '/images/buildings/industrial1.jpg')} alt="" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: C.text, flex: 1 }}>{showCompare.name}</div>
                <button onClick={() => setShowCompare(null)} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#F0F0F0', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ background: C.yellow, color: C.primary, padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 900 }}>佣金 {showCompare.commission}万</span>
                <span style={{ background: '#FFF0F0', color: C.sale, padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 700 }}>{Number(showCompare.rent_min).toFixed(1)}元/㎡/天</span>
                {showCompare.main_type && <span style={{ background: '#F0F0F0', color: C.textSub, padding: '4px 10px', borderRadius: 6, fontSize: 13 }}>{showCompare.main_type}</span>}
              </div>
              <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7, marginBottom: 12 }}>{showCompare.park_name} · {showCompare.region} · {showCompare.total_area?.toLocaleString()}㎡ · 层高{showCompare.floor_height}m · 承重{showCompare.floor_load}T</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>佣金费率：{showCompare.commission_rate}</div>
              {/* 政策 */}
              {showCompare.policy?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>入驻政策</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{showCompare.policy.map((p: string, j: number) => <span key={j} style={{ fontSize: 12, color: '#008A00', background: '#EAFBEF', padding: '3px 8px', borderRadius: 4 }}>{p}</span>)}</div>
                </div>
              )}
              {/* 操作按钮 */}
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={() => { setChatTarget({ id: PARK_CONTACTS[0].id, name: PARK_CONTACTS[0].name }); setShowCompare(null); }} style={{ flex: 1, height: 44, borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  私聊园区
                </button>
                <button onClick={() => { const link = genLink(showCompare.id, agentInfo); navigator.clipboard?.writeText(link); alert('专属推荐链接已复制'); }} style={{ flex: 1, height: 44, borderRadius: 8, border: `1px solid ${C.orange}`, background: '#fff', color: C.orange, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>分享赚佣金</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
