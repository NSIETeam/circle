'use client';

import React, { useState, useRef, useCallback } from 'react';
import { moderateContent, sanitizeText } from '../../lib/content-moderator';

export default function ListBuildingPage() {
  const [form, setForm] = useState({
    name: '', park_name: '', region: '', industry: '',
    total_area: '', floor_height: '', floor_load: '',
    power_capacity: '', rent_min: '', rent_max: '',
    contact: '', phone: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [auditResult, setAuditResult] = useState<{ status: string; reasons: string[] } | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [docFile, setDocFile] = useState<{ name: string; data: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [dragTarget, setDragTarget] = useState<'images' | 'doc' | null>(null);
  const fileImgRef = useRef<HTMLInputElement>(null);
  const fileDocRef = useRef<HTMLInputElement>(null);

  const handleChange = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  // 图片上传
  const addImages = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 6 - images.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => setImages(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  // 楼书上传 — PDF/Word/PPT/图片
  const addDoc = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDocFile({ name: file.name, data: reader.result as string });
    reader.readAsDataURL(file);
  };

  // 拖拽处理
  const handleDrop = (e: React.DragEvent, target: 'images' | 'doc') => {
    e.preventDefault();
    setDragOver(false);
    setDragTarget(null);
    if (target === 'images') addImages(e.dataTransfer.files);
    else addDoc(e.dataTransfer.files);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // AI审核
    const result = moderateContent({
      name: form.name, description: form.park_name, notes: notes,
      rent_min: parseFloat(form.rent_min), rent_max: parseFloat(form.rent_max),
      total_area: parseFloat(form.total_area), industry: form.industry, fileName: docFile?.name,
    });
    if (result.status === 'rejected') {
      setAuditResult(result);
      return;
    }
    // 脱敏笔记中的联系方式
    const safeNotes = sanitizeText(notes);
    const status = result.status === 'manual_review' ? 'pending_review' : 'pending';
    const listings = JSON.parse(localStorage.getItem('my_listings') || '[]');
    listings.push({ ...form, id: Date.now().toString(), created_at: new Date().toISOString(), status, auditResult: result, images, building_pdf: docFile?.data, sales_notes: safeNotes });
    localStorage.setItem('my_listings', JSON.stringify(listings));
    setAuditResult(result);
    setSubmitted(true);
  };

  const inputStyle: React.CSSProperties = { width: '100%', minHeight: 44, padding: '12px 16px', border: 'none', borderRadius: 10, background: '#F5F6FA', fontSize: 14, color: '#333', outline: 'none' };
  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#666', marginBottom: 6, display: 'block' };
  const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #eee' };
  const sectionStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: '#333', padding: '12px 0 8px', display: 'flex', alignItems: 'center', gap: 6 };

  if (submitted) {
    const isRejected = auditResult?.status === 'rejected';
    const isManual = auditResult?.status === 'manual_review';
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, background: '#F5F6FA' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: isRejected ? 'rgba(255,59,48,0.1)' : 'rgba(0,166,224,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          {isRejected ? (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          ) : (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#00A6E0" strokeWidth="2.5" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          )}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{isRejected ? '内容审核未通过' : '提交成功'}</h2>
        <p style={{ color: '#999', textAlign: 'center', lineHeight: 1.6, marginBottom: 16 }}>
          {isRejected ? '您提交的内容包含不合规信息：' : isManual ? '内容已提交，AI检测到部分信息需人工确认，平台将在1个工作日内完成审核。' : '您的厂房信息已提交，平台将在1个工作日内审核。'}
        </p>
        {auditResult?.reasons.map((r, i) => (
          <div key={i} style={{ fontSize: 13, color: isRejected ? '#FF3B30' : '#666', background: isRejected ? '#FFF0F0' : '#F8F9FB', padding: '6px 12px', borderRadius: 6, marginBottom: 4, width: '80%' }}>• {r}</div>
        ))}
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          {isRejected && <button onClick={() => { setSubmitted(false); setAuditResult(null); }} style={{ padding: '10px 24px', borderRadius: 10, border: '1px solid #ddd', background: '#fff', color: '#666', fontSize: 14, cursor: 'pointer' }}>返回修改</button>}
          <button onClick={() => { window.location.href = process.env.NEXT_PUBLIC_BASE_PATH || '/'; }} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#00A6E0', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{isRejected ? '返回首页' : '完成'}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F6FA', fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif' }}>
      {/* 导航栏 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: '#fff', borderBottom: '2px solid #00A6E0', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => { window.location.href = process.env.NEXT_PUBLIC_BASE_PATH || '/'; }} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: '#F5F6FA', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#333' }}>上架厂房</span>
        <div style={{ width: 36 }} />
      </div>

      <form onSubmit={handleSubmit} style={{ padding: 16, maxWidth: 600, margin: '0 auto' }}>
        {/* 1. 厂房图片 — 支持拖拽 */}
        <div style={sectionStyle}><span style={{ width: 3, height: 16, background: '#00A6E0', borderRadius: 2 }} />厂房图片</div>
        <div style={cardStyle}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); setDragTarget('images'); }}
            onDragLeave={() => { setDragOver(false); setDragTarget(null); }}
            onDrop={(e) => handleDrop(e, 'images')}
            onClick={() => fileImgRef.current?.click()}
            style={{
              border: dragTarget === 'images' ? '2px dashed #00A6E0' : '2px dashed #ddd',
              borderRadius: 10, padding: 20, cursor: 'pointer',
              background: dragTarget === 'images' ? '#E6F7FD' : '#FAFBFC',
              transition: 'all 0.2s', textAlign: 'center',
            }}
          >
            {images.length === 0 ? (
              <>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" style={{ margin: '0 auto 8px', display: 'block' }}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                <div style={{ fontSize: 14, color: '#666' }}>点击或拖拽上传图片</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>最多6张，支持JPG/PNG</div>
              </>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' }}>
                {images.map((img, i) => (
                  <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
                    <img src={img} alt="" style={{ width: '100%', height: '100%', borderRadius: 8, objectFit: 'cover' }} />
                    <button type="button" onClick={(e) => { e.stopPropagation(); setImages(prev => prev.filter((_, idx) => idx !== i)); }} style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>×</button>
                  </div>
                ))}
                {images.length < 6 && <div style={{ width: 72, height: 72, borderRadius: 8, background: '#F5F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#999' }}>+</div>}
              </div>
            )}
          </div>
          <input ref={fileImgRef} type="file" accept="image/*" multiple onChange={(e) => addImages(e.target.files)} style={{ display: 'none' }} />
        </div>

        {/* 2. 楼书上传 — 支持拖拽，多格式 */}
        <div style={sectionStyle}><span style={{ width: 3, height: 16, background: '#00A6E0', borderRadius: 2 }} />楼书文档</div>
        <div style={cardStyle}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); setDragTarget('doc'); }}
            onDragLeave={() => { setDragOver(false); setDragTarget(null); }}
            onDrop={(e) => handleDrop(e, 'doc')}
            onClick={() => fileDocRef.current?.click()}
            style={{
              border: dragTarget === 'doc' ? '2px dashed #00A6E0' : '2px dashed #ddd',
              borderRadius: 10, padding: 20, cursor: 'pointer',
              background: dragTarget === 'doc' ? '#E6F7FD' : '#FAFBFC',
              transition: 'all 0.2s', textAlign: 'center',
            }}
          >
            {docFile ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00A6E0" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                <span style={{ fontSize: 14, color: '#333', fontWeight: 600 }}>{docFile.name}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); setDocFile(null); }} style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: '#F5F6FA', cursor: 'pointer', color: '#999' }}>×</button>
              </div>
            ) : (
              <>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" style={{ margin: '0 auto 8px', display: 'block' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                <div style={{ fontSize: 14, color: '#666' }}>点击或拖拽上传楼书</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>支持 PDF / Word / PPT，自动解析参数和卖点</div>
              </>
            )}
          </div>
          <input ref={fileDocRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,image/*" onChange={(e) => addDoc(e.target.files)} style={{ display: 'none' }} />
        </div>

        {/* 3. 销售笔记 */}
        <div style={sectionStyle}><span style={{ width: 3, height: 16, background: '#00A6E0', borderRadius: 2 }} />销售笔记</div>
        <div style={cardStyle}>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="记录卖点、优势、注意事项，每行一个要点。上传楼书后可自动生成。" style={{ width: '100%', minHeight: 120, padding: 12, border: '1px solid #eee', borderRadius: 10, fontSize: 14, lineHeight: 1.6, outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: '#FAFBFC' }} />
          <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>提示：每行一个卖点，将自动提取为长图亮点</div>
        </div>

        {/* 4. 基本信息 */}
        <div style={sectionStyle}><span style={{ width: 3, height: 16, background: '#00A6E0', borderRadius: 2 }} />基本信息</div>
        <div style={cardStyle}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>厂房名称 *</label>
            <input style={inputStyle} placeholder="如：宏创AI产业园A栋" value={form.name} onChange={e => handleChange('name', e.target.value)} required />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>所属园区 *</label>
            <input style={inputStyle} placeholder="如：宏创AI产业园" value={form.park_name} onChange={e => handleChange('park_name', e.target.value)} required />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>所在区域 *</label>
            <select style={inputStyle} value={form.region} onChange={e => handleChange('region', e.target.value)} required>
              <option value="">请选择区域</option>
              <option>大兴区</option><option>昌平区</option><option>顺义区</option>
              <option>经开区</option><option>朝阳区</option><option>海淀区</option>
              <option>丰台区</option><option>通州区</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>产业类型 *</label>
            <select style={inputStyle} value={form.industry} onChange={e => handleChange('industry', e.target.value)} required>
              <option value="">请选择产业</option>
              <option>AI</option><option>生物医药</option><option>智能制造</option>
              <option>集成电路</option><option>新能源</option><option>新材料</option>
              <option>电子信息</option><option>航空航天</option>
            </select>
          </div>
        </div>

        {/* 5. 厂房参数 */}
        <div style={sectionStyle}><span style={{ width: 3, height: 16, background: '#00A6E0', borderRadius: 2 }} />厂房参数</div>
        <div style={cardStyle}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>总面积（㎡）*</label>
            <input type="number" style={inputStyle} placeholder="如：3000" value={form.total_area} onChange={e => handleChange('total_area', e.target.value)} required />
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>层高（m）</label>
              <input type="number" style={inputStyle} placeholder="如：6" value={form.floor_height} onChange={e => handleChange('floor_height', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>承重（T/㎡）</label>
              <input type="number" style={inputStyle} placeholder="如：5" value={form.floor_load} onChange={e => handleChange('floor_load', e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>电力（KVA）</label>
            <input type="number" style={inputStyle} placeholder="如：2000" value={form.power_capacity} onChange={e => handleChange('power_capacity', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>最低租金</label>
              <input type="number" step="0.1" style={inputStyle} placeholder="如：1.5" value={form.rent_min} onChange={e => handleChange('rent_min', e.target.value)} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>最高租金</label>
              <input type="number" step="0.1" style={inputStyle} placeholder="如：2.5" value={form.rent_max} onChange={e => handleChange('rent_max', e.target.value)} />
            </div>
          </div>
        </div>

        {/* 6. 联系方式 */}
        <div style={sectionStyle}><span style={{ width: 3, height: 16, background: '#00A6E0', borderRadius: 2 }} />联系方式</div>
        <div style={cardStyle}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>联系人 *</label>
            <input style={inputStyle} placeholder="姓名" value={form.contact} onChange={e => handleChange('contact', e.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>手机号 *</label>
            <input type="tel" style={inputStyle} placeholder="手机号码" value={form.phone} onChange={e => handleChange('phone', e.target.value)} required />
          </div>
        </div>

        <button type="submit" style={{ width: '100%', height: 48, borderRadius: 10, border: 'none', background: '#00A6E0', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 12, marginTop: 8 }}>提交上架</button>

        {/* 付费权益占位 */}
        <div style={{ background: '#FFFDF6', border: '1px solid #FFE0B2', borderRadius: 10, padding: 14, marginBottom: 40 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#FF6B00', marginBottom: 8 }}>推广权益（敬请期待）</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: '首页置顶', desc: '7天', icon: 'M12 2L2 7l10 5 10-5z' },
              { label: '优先推荐', desc: '流量加持', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' },
              { label: '专属标签', desc: '限时优惠', icon: 'M20.6 12.6l-7.2 7.2a2 2 0 01-2.8 0L2 12V2h10z' },
              { label: '数据报告', desc: '客户画像', icon: 'M3 3v18h18M7 13l4-7 4 4 4-6' },
            ].map(item => (
              <div key={item.label} style={{ flex: '1 1 45%', padding: 8, background: '#fff', borderRadius: 8, border: '1px dashed #FFE0B2', textAlign: 'center', opacity: 0.7 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#999' }}>{item.label}</div>
                <div style={{ fontSize: 11, color: '#ccc', marginTop: 2 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
