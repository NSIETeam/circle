'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { FactoryIcon } from '../../components/icons';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(phone, password);
      window.location.href = '/';
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ position: 'relative' }}>
      {/* 返回按钮 */}
      <button
        onClick={() => router.push('/')}
        style={{
          position: 'absolute', top: 'calc(16px + var(--safe-top))', left: 16,
          width: 36, height: 36, borderRadius: '50%', border: 'none',
          background: 'var(--glass-input)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
      </button>

      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div className="auth-logo">
          <FactoryIcon size={28} color="#fff" />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>园圈</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>产业地产招商平台</p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ padding: 12, background: 'var(--error-surface)', color: 'var(--error)', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 500 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, display: 'block', fontWeight: 500 }}>手机号</label>
          <input
            type="tel"
            placeholder="请输入手机号"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="form-field"
            required
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, display: 'block', fontWeight: 500 }}>密码</label>
          <input
            type="password"
            placeholder="请输入密码"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="form-field"
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}
          style={{ width: '100%', opacity: loading ? 0.6 : 1 }}>
          {loading ? '登录中...' : '登录'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
        还没有账号？ <a href="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>立即注册</a>
      </div>

      <div style={{ textAlign: 'center', marginTop: 40, fontSize: 11, color: 'var(--text-muted)' }}>
        登录即表示同意《服务协议》和《隐私政策》
      </div>
    </div>
  );
}
