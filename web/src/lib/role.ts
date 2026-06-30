// 角色权限管理
// 会议纪要：经纪人可见佣金，C端不可见佣金

export type UserRole = 'visitor' | 'agent' | 'park_admin';

const ROLE_KEY = 'user_role';
const AGENT_KEY = 'agent_info';

export function getRole(): UserRole {
  if (typeof window === 'undefined') return 'visitor';
  return (localStorage.getItem(ROLE_KEY) as UserRole) || 'visitor';
}

export function setRole(role: UserRole) {
  if (typeof window !== 'undefined') localStorage.setItem(ROLE_KEY, role);
}

export function isAgent(): boolean {
  return getRole() === 'agent';
}

export function canSeeCommission(): boolean {
  return isAgent();
}

export interface AgentInfo {
  name: string;
  phone: string;
  agency: string;
  verified: boolean;
  agentId: string;
}

export function getAgentInfo(): AgentInfo | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AGENT_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setAgentInfo(info: AgentInfo) {
  if (typeof window !== 'undefined') localStorage.setItem(AGENT_KEY, JSON.stringify(info));
}

export function logoutAgent() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(AGENT_KEY);
  }
}

// 经纪人专属链接生成 — 用于客户归属追踪
export function generateAgentLink(buildingId: string): string {
  const agent = getAgentInfo();
  if (!agent) return '';
  const code = btoa(`${agent.agentId}_${buildingId}_${Date.now()}`).slice(0, 12);
  const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return `${window.location.origin}${base}/find?ref=${code}&agent=${agent.agentId}&bid=${buildingId}`;
}

// 客户归属锁定 — 从URL参数解析，锁定30天保护期
export function parseReferral(): { agentId: string; buildingId: string; code: string } | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const agentId = params.get('agent');
  const bid = params.get('bid');
  const code = params.get('ref');
  if (agentId && bid && code) {
    const lock = { agentId, buildingId: bid, code, lockedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 24 * 3600000).toISOString() };
    localStorage.setItem('referral_lock', JSON.stringify(lock));
    // 保护期内，其他经纪人链接不覆盖
    const existing = getReferralLock();
    if (existing && new Date(existing.expiresAt) > new Date()) {
      return existing; // 已有有效保护期，不覆盖
    }
    localStorage.setItem('referral_lock', JSON.stringify(lock));
    return { agentId, buildingId: bid, code };
  }
  return null;
}

// 检查当前客户是否被某经纪人锁定
export function getReferralLock(): { agentId: string; buildingId: string; code: string; lockedAt: string; expiresAt: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('referral_lock');
  if (!raw) return null;
  try {
    const lock = JSON.parse(raw);
    if (new Date(lock.expiresAt) < new Date()) { localStorage.removeItem('referral_lock'); return null; }
    return lock;
  } catch { return null; }
}

// 获取解释信息
export function getReferralInfo(): string {
  const lock = getReferralLock();
  if (!lock) return '';
  const remaining = Math.ceil((new Date(lock.expiresAt).getTime() - Date.now()) / 86400000);
  return `已锁定·保护期剩余${remaining}天`;
}

// 生成分享推荐卡片
export function generateShareCard(buildingId: string, buildingName: string, region: string, rent: string): string {
  const agent = getAgentInfo();
  const agentName = agent?.name || '经纪人';
  const link = generateAgentLink(buildingId);
  return `【园圈产业园推荐】${buildingName} | ${region} | ${rent}元/㎡/天 | 推荐人：${agentName} | ${link}`;
}
