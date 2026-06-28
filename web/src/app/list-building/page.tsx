'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function ListBuildingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', park_name: '', region: '', industry: '',
    total_area: '', floor_height: '', floor_load: '',
    power_capacity: '', rent_min: '', rent_max: '',
    contact: '', phone: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  // 图片上传 — 转base64存localStorage（演示用）
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).slice(0, 6 - images.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    // 清空input允许重复选择
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 保存到 localStorage（演示用，后续接API）
    const buildings = JSON.parse(localStorage.getItem('my_listings') || '[]');
    buildings.push({ ...form, id: Date.now().toString(), created_at: new Date().toISOString(), status: 'pending', images });
    localStorage.setItem('my_listings', JSON.stringify(buildings));
    setSubmitted(true);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', minHeight: 44, padding: '12px 16px',
    border: 'none', borderRadius: 'var(--radius-md)',
    background: 'var(--fill-tertiary)',
    fontSize: 'var(--text-md)', color: 'var(--text)', outline: 'none',
    transition: 'background 0.2s, box-shadow 0.2s',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-medium)',
    color: 'var(--text-secondary)', marginBottom: 6, display: 'block',
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, background: 'var(--bg)' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(52,199,89,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>提交成功</h2>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6, marginBottom: 24 }}>
          您的厂房信息已提交，平台将在1个工作日内审核。<br/>审核通过后将在首页展示。
        </p>
        <button onClick={() => { window.location.href = '/'; }} className="btn-primary" style={{ width: '80%' }}>返回首页</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'var(--safe-top)' }}>
      {/* 导航栏 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '0.5px solid var(--border)', background: 'var(--surface-overlay)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <button onClick={() => { window.location.href = '/'; }} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--fill-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, WebkitTapHighlightColor: 'transparent' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 'var(--text-lg)', fontWeight: 600 }}>上架厂房</span>
        <div style={{ width: 36 }} />
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '16px' }}>
        <div className="section-header" style={{ padding: '8px 0' }}>厂房图片</div>
        <div style={{ background: 'var(--card)', borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {/* 已上传图片 */}
            {images.map((img, i) => (
              <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
                <img src={img} alt="" style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
                <button type="button" onClick={() => removeImage(i)} style={{
                  position: 'absolute', top: -6, right: -6,
                  width: 22, height: 22, borderRadius: '50%', border: 'none',
                  background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, lineHeight: 1,
                }}>×</button>
              </div>
            ))}
            {/* 上传按钮 */}
            {images.length < 6 && (
              <button type="button" onClick={() => fileInputRef.current?.click()} style={{
                width: 72, height: 72, borderRadius: 'var(--radius-md)', border: 'none',
                background: 'var(--fill-tertiary)', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                </svg>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{images.length}/6</span>
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: 'none' }} />
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 8 }}>最多上传6张，支持 JPG/PNG</p>
        </div>

        <div className="section-header" style={{ padding: '8px 0' }}>基本信息</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24, background: 'var(--card)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
          <div>
            <label style={labelStyle}>厂房名称 *</label>
            <input style={inputStyle} placeholder="如：宏创AI产业园A栋" value={form.name} onChange={e => handleChange('name', e.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>所属园区 *</label>
            <input style={inputStyle} placeholder="如：宏创AI产业园" value={form.park_name} onChange={e => handleChange('park_name', e.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>所在区域 *</label>
            <select style={inputStyle} value={form.region} onChange={e => handleChange('region', e.target.value)} required>
              <option value="">请选择区域</option>
              <option>昌平区</option><option>大兴区</option><option>浦东新区</option>
              <option>松江区</option><option>南山区</option><option>光明区</option>
              <option>坪山区</option><option>余杭区</option><option>西湖区</option>
              <option>工业园区</option><option>黄埔区</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>产业类型 *</label>
            <select style={inputStyle} value={form.industry} onChange={e => handleChange('industry', e.target.value)} required>
              <option value="">请选择产业</option>
              <option>AI</option><option>生物医药</option><option>智能制造</option>
              <option>集成电路</option><option>新能源</option><option>新材料</option>
            </select>
          </div>
        </div>

        <div className="section-header" style={{ padding: '8px 0' }}>厂房参数</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24, background: 'var(--card)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
          <div>
            <label style={labelStyle}>总面积（㎡）*</label>
            <input type="number" style={inputStyle} placeholder="如：3000" value={form.total_area} onChange={e => handleChange('total_area', e.target.value)} required />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>层高（m）</label>
              <input type="number" style={inputStyle} placeholder="如：6" value={form.floor_height} onChange={e => handleChange('floor_height', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>承重（T/㎡）</label>
              <input type="number" style={inputStyle} placeholder="如：5" value={form.floor_load} onChange={e => handleChange('floor_load', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>电力（KVA）</label>
            <input type="number" style={inputStyle} placeholder="如：2000" value={form.power_capacity} onChange={e => handleChange('power_capacity', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>最低租金（元/㎡/天）</label>
              <input type="number" step="0.1" style={inputStyle} placeholder="如：1.5" value={form.rent_min} onChange={e => handleChange('rent_min', e.target.value)} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>最高租金</label>
              <input type="number" step="0.1" style={inputStyle} placeholder="如：2.5" value={form.rent_max} onChange={e => handleChange('rent_max', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="section-header" style={{ padding: '8px 0' }}>联系方式</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24, background: 'var(--card)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
          <div>
            <label style={labelStyle}>联系人 *</label>
            <input style={inputStyle} placeholder="姓名" value={form.contact} onChange={e => handleChange('contact', e.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>手机号 *</label>
            <input type="tel" style={inputStyle} placeholder="手机号码" value={form.phone} onChange={e => handleChange('phone', e.target.value)} required />
          </div>
        </div>

        <button type="submit" className="btn-primary" style={{ width: '100%', marginBottom: 40, background: 'linear-gradient(135deg, #007AFF, #4CA6FF)' }}>
          提交上架
        </button>
      </form>
    </div>
  );
}
