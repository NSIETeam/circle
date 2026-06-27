'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { HomeIcon, MapIcon, StarIcon, UserIcon } from './icons';

type Tab = 'home' | 'map' | 'favorites' | 'profile';

const TABS: { key: Tab; label: string; icon: typeof HomeIcon }[] = [
  { key: 'home', label: '首页', icon: HomeIcon },
  { key: 'map', label: '地图', icon: MapIcon },
  { key: 'favorites', label: '收藏', icon: StarIcon },
  { key: 'profile', label: '我的', icon: UserIcon },
];

const PATHS: Record<Tab, string> = {
  home: '/',
  map: '/map',
  favorites: '/favorites',
  profile: '/profile',
};

export default function BottomNav({ active }: { active: Tab }) {
  const router = useRouter();

  return (
    <div className="thumb-zone">
      {TABS.map(item => {
        const Icon = item.icon;
        const isActive = item.key === active;
        return (
          <div
            key={item.key}
            className={`tab-item ${isActive ? 'active' : ''}`}
            onClick={() => router.push(PATHS[item.key])}
          >
            <Icon size={24} color={isActive ? 'var(--primary)' : 'var(--text-muted)'} />
            <span>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export type { Tab };
