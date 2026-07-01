'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type UserRole = 'visitor' | 'agent' | 'park' | 'superadmin';

interface RoleContextType {
  role: UserRole;
  setRole: (r: UserRole) => void;
  agentInfo: { name: string; phone: string; agentId: string } | null;
  setAgentInfo: (info: { name: string; phone: string; agentId: string }) => void;
  isAgent: boolean;
  canSeeCommission: boolean;
  referralLock: { agentId: string; buildingId: string; expiresAt: string } | null;
}

const Ctx = createContext<RoleContextType>({
  role: 'visitor', setRole: () => {}, agentInfo: null, setAgentInfo: () => {},
  isAgent: false, canSeeCommission: false, referralLock: null,
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('visitor');
  const [agentInfo, setAgentInfo] = useState<RoleContextType['agentInfo']>(null);
  const [referralLock, setReferralLock] = useState<RoleContextType['referralLock']>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('user_role') as UserRole;
    if (saved) setRole(saved);
    const info = localStorage.getItem('agent_info');
    if (info) {
      try { setAgentInfo(JSON.parse(info)); } catch {}
    }
    // Parse referral from URL
    const params = new URLSearchParams(window.location.search);
    const agentId = params.get('agent');
    const bid = params.get('bid');
    const code = params.get('ref');
    if (agentId && bid && code) {
      const lock = { agentId, buildingId: bid, expiresAt: new Date(Date.now() + 30*86400000).toISOString() };
      localStorage.setItem('referral_lock', JSON.stringify(lock));
      setReferralLock(lock);
    } else {
      const savedLock = localStorage.getItem('referral_lock');
      if (savedLock) {
        try {
          const lock = JSON.parse(savedLock);
          if (new Date(lock.expiresAt) > new Date()) setReferralLock(lock);
          else localStorage.removeItem('referral_lock');
        } catch {}
      }
    }
  }, []);

  const setRoleWrap = (r: UserRole) => {
    setRole(r);
    if (typeof window !== 'undefined') localStorage.setItem('user_role', r);
  };

  const setAgentWrap = (info: { name: string; phone: string; agentId: string }) => {
    setAgentInfo(info);
    if (typeof window !== 'undefined') localStorage.setItem('agent_info', JSON.stringify(info));
  };

  return (
    <Ctx.Provider value={{
      role, setRole: setRoleWrap, agentInfo, setAgentInfo: setAgentWrap,
      isAgent: role === 'agent', canSeeCommission: role === 'agent',
      referralLock,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useRole() { return useContext(Ctx); }

// 预设账号
const PRESET_ACCOUNTS: Record<string, { password: string; name: string; phone: string; role: UserRole; agentId: string }> = {
  admin: { password: 'admin123', name: '超级管理员', phone: '138****8888', role: 'superadmin', agentId: 'admin_001' },
  park: { password: 'park123', name: '园区管理员', phone: '137****7777', role: 'park', agentId: 'park_001' },
  broker: { password: 'broker123', name: '张经纪', phone: '139****9999', role: 'agent', agentId: 'agt_demo_001' },
};

/** 验证预设账号登录，返回用户信息或null */
export function authenticate(username: string, password: string): { name: string; phone: string; role: UserRole; agentId: string } | null {
  const account = PRESET_ACCOUNTS[username];
  if (account && account.password === password) {
    return { name: account.name, phone: account.phone, role: account.role, agentId: account.agentId };
  }
  return null;
}

// Utility: agent link generation
export function agentLink(buildingId: string, agentInfo: { agentId: string } | null): string {
  if (!agentInfo) return '';
  const code = btoa(`${agentInfo.agentId}_${buildingId}_${Date.now()}`).slice(0, 12);
  const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return `${window.location.origin}${base}/find?ref=${code}&agent=${agentInfo.agentId}&bid=${buildingId}`;
}

// Utility: share card
export function shareCard(buildingId: string, buildingName: string, region: string, rent: string, agentName: string): string {
  const link = agentLink(buildingId, { agentId: '' });
  return `【园圈产业园推荐】${buildingName} | ${region} | ${rent}元/㎡/天 | 推荐人：${agentName} | ${link}`;
}
