'use client';

import React, { useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { SearchIcon, BuildingIcon, ChevronLeftIcon } from '../../components/icons';

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('broker');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ phone, password, name, role });
      window.location.href = process.env.NEXT_PUBLIC_BASE_PATH || '/';
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div style={{ marginBottom: 32 }}>
        <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/login`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, marginBottom: 24 }}>
          <ChevronLeftIcon size={18} color="var(--text-secondary)" />
          返回登录
        </a>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>注册园圈</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>选择您的角色开始使用</p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ padding: 12, background: 'var(--error-surface)', color: 'var(--error)', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 500 }}>
            {error}
          </div>
        )}

        {/* 角色选择 */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <button type="button" className={`role-card ${role === 'broker' ? 'selected' : ''}`} onClick={() => setRole('broker')}>
            <div className="role-icon" style={{ background: role === 'broker' ? 'var(--primary-surface)' : 'var(--bg)' }}>
              <SearchIcon size={22} color={role === 'broker' ? 'var(--primary)' : 'var(--text-muted)'} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>经纪人</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>找房源 · 带客户</div>
          </button>
          <button type="button" className={`role-card ${role === 'park' ? 'selected' : ''}`} onClick={() => setRole('park')}>
            <div className="role-icon" style={{ background: role === 'park' ? 'var(--primary-surface)' : 'var(--bg)' }}>
              <BuildingIcon size={22} color={role === 'park' ? 'var(--primary)' : 'var(--text-muted)'} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>园区方</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>发房源 · 管线索</div>
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, display: 'block', fontWeight: 500 }}>姓名</label>
          <input className="search-input" type="text" placeholder="请输入姓名" value={name}
            onChange={e => setName(e.target.value)} style={{ width: '100%', paddingLeft: 16 }} required />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, display: 'block', fontWeight: 500 }}>手机号</label>
          <input className="search-input" type="tel" placeholder="请输入手机号" value={phone}
            onChange={e => setPhone(e.target.value)} style={{ width: '100%', paddingLeft: 16 }} required />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, display: 'block', fontWeight: 500 }}>密码</label>
          <input className="search-input" type="password" placeholder="至少6位密码" value={password}
            onChange={e => setPassword(e.target.value)} style={{ width: '100%', paddingLeft: 16 }} minLength={6} required />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}
          style={{ width: '100%', opacity: loading ? 0.6 : 1 }}>
          {loading ? '注册中...' : '注册'}
        </button>
      </form>
    </div>
  );
}
