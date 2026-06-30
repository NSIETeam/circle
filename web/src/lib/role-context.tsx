'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type UserRole = 'visitor' | 'agent' | 'park';

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
