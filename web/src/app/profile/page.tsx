'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import BottomNav from '../../components/BottomNav';
import {
  ChevronLeftIcon, ChevronRightIcon, UserIcon, StarIcon, CalendarIcon,
  ChatIcon, ShareIcon, ShieldIcon, FactoryIcon, CpuIcon,
} from '../../components/icons';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <div style={{ paddingBottom: 70 }}>
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--primary-surface)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserIcon size={32} color="var(--primary)" />
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>登录后查看个人信息</p>
          <button className="btn-primary" style={{ width: '60%' }} onClick={() => router.push(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/login`)}>
            登录 / 注册
          </button>
        </div>
        <BottomNav active="profile" />
      </div>
    );
  }

  const levelMap: Record<string, string> = {
    registered: '注册经纪人', verified: '认证经纪人',
    silver: '银牌经纪人', gold: '金牌经纪人', diamond: '钻石经纪人',
  };
  const roleLabel = user.role === 'broker'
    ? (levelMap[user.broker_level || ''] || '注册经纪人')
    : user.role === 'park' ? '园区方'
    : user.role === 'admin' ? '管理员' : '运营方';

  const menuItems = [
    { icon: CalendarIcon, label: '我的带看', path: '/visits' },
    { icon: ChatIcon, label: '我的消息', path: '/messages' },
    { icon: StarIcon, label: '我的收藏', path: '/favorites' },
    { icon: ShareIcon, label: '分享记录', path: '/shares' },
  ];

  const toolItems = [
    { icon: CpuIcon, label: 'AI转型成熟度诊断', path: '/assessment', badge: '新' },
  ];

  return (
    <div style={{ paddingBottom: 90, background: 'var(--bg)', minHeight: '100vh' }}>
      {/* 顶部导航栏 - 返回按钮独立一行，不与头像重叠 */}
      <div style={{
        padding: '12px 16px',
        display: 'flex', alignItems: 'center',
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
      }}>
        <button
          onClick={() => router.push(process.env.NEXT_PUBLIC_BASE_PATH || '/')}
          style={{
            width: 36, height: 36, borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--card)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ChevronLeftIcon size={18} color="var(--text-secondary)" />
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>
          我的
        </span>
        <div style={{ width: 36 }} />
      </div>

      {/* 用户信息区 */}
      <div style={{
        padding: '24px 16px 28px',
        background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid rgba(255,255,255,0.3)',
          }}>
            <UserIcon size={28} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{user.name}</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
              {roleLabel} · {user.phone}
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div style={{ padding: '0 16px', marginTop: -16, position: 'relative', zIndex: 1 }}>
        <div className="card" style={{ display: 'flex', justifyContent: 'space-around', padding: '16px 0' }}>
          <StatItem icon={CalendarIcon} label="带看次数" value="0" />
          <div style={{ width: 1, background: 'var(--border)' }} />
          <StatItem icon={FactoryIcon} label="收藏房源" value="0" />
          <div style={{ width: 1, background: 'var(--border)' }} />
          <StatItem icon={ChatIcon} label="咨询记录" value="0" />
        </div>
      </div>

      {/* 菜单列表 */}
      <div style={{ padding: '12px 16px 0' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                onClick={() => router.push(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}${item.path}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', cursor: 'pointer',
                  borderBottom: i < menuItems.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color="var(--primary)" />
                </div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{item.label}</span>
                <ChevronRightIcon size={16} color="var(--text-muted)" />
              </div>
            );
          })}
        </div>

        {/* 工具入口 */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', padding: '0 4px 8px' }}>
            AI工具
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {toolItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  onClick={() => router.push(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}${item.path}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px', cursor: 'pointer',
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} color="var(--primary)" />
                  </div>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{item.label}</span>
                  {item.badge && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: '#fff',
                      background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                      padding: '2px 8px', borderRadius: 10,
                    }}>
                      {item.badge}
                    </span>
                  )}
                  <ChevronRightIcon size={16} color="var(--text-muted)" />
                </div>
              );
            })}
          </div>
        </div>

        {/* 管理员入口 */}
        {user.role === 'admin' && (
          <div className="card" style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
            <div
              onClick={() => router.push(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/admin`)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldIcon size={18} color="var(--accent)" />
              </div>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>管理后台</span>
              <ChevronRightIcon size={16} color="var(--text-muted)" />
            </div>
          </div>
        )}
      </div>

      {/* 退出登录 */}
      <div style={{ padding: '16px' }}>
        <button
          onClick={() => { logout(); router.push(process.env.NEXT_PUBLIC_BASE_PATH || '/'); }}
          style={{
            width: '100%', padding: '13px', background: 'var(--card)',
            border: '1.5px solid var(--error)', borderRadius: 'var(--radius-md)',
            color: 'var(--error)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}
        >
          退出登录
        </button>
      </div>

      <BottomNav active="profile" />
    </div>
  );
}

function StatItem({ icon: Icon, label, value }: { icon: typeof StarIcon; label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <Icon size={18} color="var(--primary)" />
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  );
}
