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

// 客户归属锁定 — 从URL参数解析
export function parseReferral(): { agentId: string; buildingId: string; code: string } | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const agentId = params.get('agent');
  const bid = params.get('bid');
  const code = params.get('ref');
  if (agentId && bid && code) {
    // 存入localStorage锁定归属
    localStorage.setItem('referral_lock', JSON.stringify({ agentId, buildingId: bid, code, lockedAt: new Date().toISOString() }));
    return { agentId, buildingId: bid, code };
  }
  return null;
}

// 检查当前客户是否被某经纪人锁定
export function getReferralLock(): { agentId: string; buildingId: string; code: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('referral_lock');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
