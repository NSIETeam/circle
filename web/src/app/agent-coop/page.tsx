'use client';

import React, { useState, useEffect } from 'react';
import { assetUrl } from '../../lib/asset';
import { useRole, agentLink as genLink, shareCard as genCard, authenticate } from '../../lib/role-context';

const C = { primary: '#00A6E0', primaryLight: '#E6F7FD', bg: '#F5F6FA', text: '#333', textSub: '#666', textMuted: '#999', orange: '#FF6B00' };

export default function AgentCoopPage() {
  const { isAgent, setRole, agentInfo, setAgentInfo } = useRole();
  const [buildings, setBuildings] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [selIndustry, setSelIndustry] = useState('');
  const [selSort, setSelSort] = useState<'commission' | 'price' | 'rating'>('commission');
  const [showLogin, setShowLogin] = useState(!isAgent);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [compareTarget, setCompareTarget] = useState<any>(null);

  useEffect(() => {
    fetch(assetUrl('/data/buildings.json')).then(r => r.json()).then(data => {
      // 添加佣金数据（如果JSON中还没有）
      const withCommission = data.map((b: any) => ({
        ...b,
        commission: b.commission || Math.round(parseFloat(b.rent_min) * parseFloat(b.total_area) * 30 * (1 + (data.indexOf(b) % 3)) / 10000 * 10) / 10,
        commission_rate: b.commission_rate || (1 + (data.indexOf(b) % 3)) + '个月租金',
      }));
      setBuildings(withCommission);
      setFiltered(withCommission);
    });
  }, []);

  useEffect(() => {
    let list = [...buildings];
    if (selIndustry) list = list.filter(b => b.industry_tags?.some((t: string) => t.includes(selIndustry)));
    if (selSort === 'commission') list.sort((a, b) => b.commission - a.commission);
    else if (selSort === 'price') list.sort((a, b) => a.rent_min - b.rent_min);
    else list.sort((a, b) => (b.park_rating || 0) - (a.park_rating || 0));
    setFiltered(list);
  }, [selIndustry, selSort, buildings]);

  const handleLogin = () => {
    if (!loginUser.trim() || !loginPass.trim()) return;
    const account = authenticate(loginUser.trim(), loginPass);
    if (!account) { setLoginErr('账号或密码错误'); return; }
    setAgentInfo({ name: account.name, phone: account.phone, agentId: account.agentId });
    setRole(account.role);
    setShowLogin(false);
  };

  const bp = process.env.NEXT_PUBLIC_BASE_PATH || '';

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif' }}>
      {showLogin ? (
        <div style={{ maxWidth: 400, margin: '80px auto', padding: 32, background: '#fff', borderRadius: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>经纪人登录</div>
          <div style={{ fontSize: 13, color: '#999', textAlign: 'center', marginBottom: 24 }}>登录后查看所有在售楼盘佣金</div>
          <input value={loginUser} onChange={e => { setLoginUser(e.target.value); setLoginErr(''); }} placeholder="账号" style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', marginBottom: 12 }} />
          <input type="password" value={loginPass} onChange={e => { setLoginPass(e.target.value); setLoginErr(''); }} placeholder="密码" style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', marginBottom: 12 }} />
          {loginErr && <div style={{ color: '#FF3B30', fontSize: 13, marginBottom: 12 }}>{loginErr}</div>}
          <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>测试账号：admin / admin123</div>
          <button onClick={handleLogin} style={{ width: '100%', height: 44, borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>登录</button>
        </div>
      ) : (
        <>
          {/* 顶部导航 */}
          <div style={{ background: '#fff', borderBottom: `2px solid ${C.primary}`, position: 'sticky', top: 0, zIndex: 100 }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px' }}>
              <a href={`${bp}/`} style={{ fontSize: 18, fontWeight: 800, color: C.primary, textDecoration: 'none' }}>园圈</a>
              <span style={{ fontSize: 14, color: C.textMuted }}>| 经纪端</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 13, color: C.textSub }}>{agentInfo?.name || '经纪人'}</span>
            </div>
          </div>

          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px' }}>
            {/* 统计 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: '在售楼盘', value: filtered.length, color: C.primary },
                { label: '总佣金池', value: Math.round(filtered.reduce((s, b) => s + b.commission, 0)) + '万', color: C.orange },
                { label: '最高佣金', value: Math.round(Math.max(...filtered.map(b => b.commission), 0)) + '万', color: '#34C759' },
                { label: '平均评分', value: (filtered.reduce((s, b) => s + (b.park_rating || 0), 0) / filtered.length || 0).toFixed(1), color: '#5856D6' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: 14, border: '1px solid #f0f0f0' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* 筛选栏 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, color: C.textSub }}>产业：</span>
              {['', 'AI', '生物医药', '智能制造', '新能源', '集成电路', '新材料'].map(ind => (
                <button key={ind} onClick={() => setSelIndustry(ind)} style={{ padding: '5px 14px', borderRadius: 999, border: 'none', background: selIndustry === ind ? C.primary : '#fff', color: selIndustry === ind ? '#fff' : C.textSub, fontSize: 13, cursor: 'pointer' }}>{ind || '全部'}</button>
              ))}
              <span style={{ marginLeft: 16, fontSize: 14, color: C.textSub }}>排序：</span>
              {[
                { k: 'commission' as const, l: '佣金高→低' },
                { k: 'price' as const, l: '租金低→高' },
                { k: 'rating' as const, l: '评分高→低' },
              ].map(s => (
                <button key={s.k} onClick={() => setSelSort(s.k)} style={{ padding: '5px 14px', borderRadius: 999, border: 'none', background: selSort === s.k ? C.primary : '#fff', color: selSort === s.k ? '#fff' : C.textSub, fontSize: 13, cursor: 'pointer' }}>{s.l}</button>
              ))}
            </div>

            {/* 楼盘列表 */}
            <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
              {filtered.map((b, i) => {
                const nearby = buildings
                  .filter(o => o.id !== b.id)
                  .map(o => ({ ...o, dist: Math.round(Math.sqrt(Math.pow((o.latitude - b.latitude) * 111, 2) + Math.pow((o.longitude - b.longitude) * 111, 2))) }))
                  .filter(o => o.dist <= 20)
                  .sort((a, b2) => a.dist - b2.dist)
                  .slice(0, 3);

                return (
                  <div key={b.id} style={{ padding: '14px 16px', borderBottom: i < filtered.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <img src={assetUrl(b.images?.[0] || '/images/buildings/industrial1.jpg')} alt="" style={{ width: 100, height: 80, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{b.name}</span>
                          {(b as any).main_type && <span style={{ fontSize: 11, color: C.primary, background: C.primaryLight, padding: '2px 6px', borderRadius: 3 }}>{(b as any).main_type}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{b.park_name} · {b.region} · {b.total_area?.toLocaleString()}㎡ · {b.floor_height}m · {b.floor_load}T</div>

                        {/* 政策 + 周边 */}
                        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                          {(b.policy || []).slice(0, 2).map((p: string, j: number) => (
                            <span key={j} style={{ fontSize: 10, color: '#34C759', background: '#EAFBEF', padding: '2px 6px', borderRadius: 3 }}>{p}</span>
                          ))}
                          {(b.surrounding || []).slice(0, 2).map((s: string, j: number) => (
                            <span key={'s'+j} style={{ fontSize: 10, color: C.textMuted, background: '#F0F2F5', padding: '2px 6px', borderRadius: 3 }}>{s}</span>
                          ))}
                        </div>

                        {/* 入驻企业 + 条件 */}
                        {(b as any).conditions && (
                          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>条件：{(b as any).conditions}</div>
                        )}
                      </div>

                      {/* 佣金列 */}
                      <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: C.orange }}>{b.commission}万</div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>{b.commission_rate}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{Number(b.rent_min).toFixed(1)}元/㎡/天</div>
                      </div>
                    </div>

                    {/* 附近对比 + 操作 */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                      {nearby.length > 0 && (
                        <button onClick={() => setCompareTarget(compareTarget?.id === b.id ? null : b)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #ddd', background: compareTarget?.id === b.id ? C.primaryLight : '#fff', color: compareTarget?.id === b.id ? C.primary : C.textSub, fontSize: 12, cursor: 'pointer' }}>
                          {compareTarget?.id === b.id ? '收起对比' : `附近${nearby.length}处对比`}
                        </button>
                      )}
                      <button onClick={() => { const card = genCard(b.id, b.name, b.region, `${Number(b.rent_min).toFixed(1)}`, agentInfo?.name || ''); navigator.clipboard.writeText(card); alert('推荐卡片已复制'); }} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: C.orange, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>分享推荐</button>
                    </div>

                    {/* 附近对比表 */}
                    {compareTarget?.id === b.id && nearby.length > 0 && (
                      <div style={{ marginTop: 10, overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: '#F8F9FB' }}>
                              <th style={thStyle}>楼盘</th><th style={thStyle}>距离</th><th style={thStyle}>面积</th>
                              <th style={thStyle}>租金</th><th style={thStyle}>佣金</th><th style={thStyle}>评分</th><th style={thStyle}>性价比</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ background: C.primaryLight }}>
                              <td style={tdStyle}><strong>{b.name}</strong></td><td style={tdStyle}>—</td><td style={tdStyle}>{b.total_area?.toLocaleString()}</td>
                              <td style={tdStyle2}>{Number(b.rent_min).toFixed(1)}</td><td style={tdStyle2}>{b.commission}万</td>
                              <td style={tdStyle}>{b.park_rating || '-'}</td><td style={tdStyle}>当前</td>
                            </tr>
                            {nearby.map((n: any) => {
                              const isBetterValue = n.commission / n.rent_min > b.commission / b.rent_min;
                              return (
                                <tr key={n.id}>
                                  <td style={tdStyle}>{n.name}</td><td style={tdStyle}>{n.dist}km</td><td style={tdStyle}>{n.total_area?.toLocaleString()}</td>
                                  <td style={{ ...tdStyle2, color: n.rent_min < b.rent_min ? '#34C759' : '#666' }}>{Number(n.rent_min).toFixed(1)}</td>
                                  <td style={{ ...tdStyle2, color: n.commission > b.commission ? '#FF6B00' : '#666' }}>{n.commission}万</td>
                                  <td style={tdStyle}>{n.park_rating || '-'}</td>
                                  <td style={{ ...tdStyle, fontWeight: 700, color: isBetterValue ? '#34C759' : '#999' }}>{isBetterValue ? '更优' : '一般'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#666', borderBottom: '1px solid #eee' };
const tdStyle: React.CSSProperties = { padding: '6px 8px', color: '#333', borderBottom: '1px solid #f5f5f5' };
const tdStyle2: React.CSSProperties = { ...tdStyle, fontWeight: 600 };
