'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import BottomNav from '../../components/BottomNav';
import { StarIcon, FactoryIcon } from '../../components/icons';

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/login`);
      return;
    }
    if (user) {
      // 从 localStorage 读取收藏列表
      const stored = localStorage.getItem(`favorites_${user.id}`);
      if (stored) {
        try { setFavorites(JSON.parse(stored)); } catch { setFavorites([]); }
      }
      setLoading(false);
    }
  }, [user, authLoading, router]);

  const removeFavorite = (id: string) => {
    const updated = favorites.filter(b => b.id !== id);
    setFavorites(updated);
    if (user) {
      localStorage.setItem(`favorites_${user.id}`, JSON.stringify(updated));
    }
  };

  if (authLoading || loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
      <div className="skeleton" style={{ width: 60, height: 60, margin: '0 auto 16px', borderRadius: 14 }} />
      <p>加载中...</p>
    </div>
  );

  return (
    <div style={{ paddingBottom: 90, background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{
        padding: '16px', display: 'flex', alignItems: 'center',
        borderBottom: '1px solid var(--border)', background: 'var(--card)',
      }}>
        <span style={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: 16 }}>我的收藏</span>
      </div>

      <div style={{ padding: 16 }}>
        {favorites.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
            <StarIcon size={56} color="var(--text-muted)" />
            <p style={{ marginTop: 16, fontSize: 15, fontWeight: 500 }}>还没有收藏的房源</p>
            <p style={{ marginTop: 8, fontSize: 13 }}>浏览房源时点击星标即可收藏</p>
            <button
              onClick={() => router.push(process.env.NEXT_PUBLIC_BASE_PATH || '/')}
              className="btn-primary"
              style={{ marginTop: 24, width: '60%' }}
            >
              去看看房源
            </button>
          </div>
        ) : (
          favorites.map(b => (
            <div key={b.id} className="card" style={{ marginBottom: 10, cursor: 'pointer' }}
              onClick={() => router.push(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/buildings/${b.id}`)}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="thumb-placeholder">
                  <FactoryIcon size={28} color="var(--primary)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    {b.region} · {b.park_name}
                  </div>
                  <div style={{ color: 'var(--primary)', fontWeight: 700 }}>
                    {Number(b.rent_min).toFixed(1)} 起/㎡/天
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFavorite(b.id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
                >
                  <StarIcon size={20} color="var(--warning)" filled />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav active="favorites" />
    </div>
  );
}
