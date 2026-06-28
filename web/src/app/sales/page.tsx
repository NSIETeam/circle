'use client';

import React, { useState, useRef, useEffect } from 'react';
import { assetUrl } from '../../lib/asset';

const C = {
  primary: '#FF552E', primaryLight: '#FFF0EB', bg: '#F5F5F5', card: '#fff',
  text: '#333', textSub: '#666', textMuted: '#999', border: '#eee', price: '#FF552E',
};

interface SalesBuilding {
  id: string;
  name: string;
  region: string;
  total_area: number;
  rent_min: number;
  rent_max: number;
  industry_tags: string[];
  images: string[];
  amenities: string[];
  park_rating: number;
  tenant_count: number;
  floor_height: number;
  floor_load: number;
  power_capacity: number;
  park_name: string;
  building_pdf?: string;     // 楼书URL
  sales_notes?: string;       // 销售笔记
  sales_long_image?: any;     // 自动生成的长图数据
}

export default function SalesPage() {
  const [buildings, setBuildings] = useState<SalesBuilding[]>([]);
  const [selected, setSelected] = useState<SalesBuilding | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadType, setUploadType] = useState<'pdf' | 'notes'>('pdf');
  const [notesText, setNotesText] = useState('');
  const [generatedImage, setGeneratedImage] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(assetUrl('/data/buildings.json'))
      .then(r => r.json())
      .then(data => setBuildings(data.slice(0, 20)));
  }, []);

  // 上传楼书PDF
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    // 模拟上传 — 实际场景上传到OSS/CDN
    const reader = new FileReader();
    reader.onload = () => {
      const updated = buildings.map(b => b.id === selected.id ? { ...b, building_pdf: reader.result as string } : b);
      setBuildings(updated);
      setSelected({ ...selected, building_pdf: reader.result as string });
      setShowUpload(false);
    };
    reader.readAsDataURL(file);
  };

  // 保存笔记
  const handleSaveNotes = () => {
    if (!selected || !notesText.trim()) return;
    const updated = buildings.map(b => b.id === selected.id ? { ...b, sales_notes: notesText } : b);
    setBuildings(updated);
    setSelected({ ...selected, sales_notes: notesText });
    setShowUpload(false);
    setNotesText('');
  };

  // 从楼书+笔记自动生成详情长图数据
  const generateLongImage = (b: SalesBuilding) => {
    const notes = b.sales_notes || '';
    // 从笔记中提取关键信息
    const highlights = notes.split('\n').filter(l => l.trim()).slice(0, 6);
    const longImageData = {
      title: b.name,
      subtitle: b.park_name,
      location: b.region,
      images: b.images || [],
      tags: b.industry_tags || [],
      params: {
        '建筑面积': `${b.total_area?.toLocaleString()}㎡`,
        '层高': `${b.floor_height}m`,
        '承重': `${b.floor_load}T/㎡`,
        '电力': `${b.power_capacity || '-'}KVA`,
        '租金': `${Number(b.rent_min).toFixed(1)}~${Number(b.rent_max).toFixed(1)}元/㎡/天`,
        '园区评分': `${b.park_rating || '-'}/5`,
      },
      amenities: b.amenities || [],
      highlights: highlights.length > 0 ? highlights : [
        `${b.industry_tags?.[0] || '综合'}产业聚集，生态成熟`,
        `已入驻${b.tenant_count}家企业`,
        `层高${b.floor_height}m，承重${b.floor_load}T，适合生产研发`,
        `园区评分${b.park_rating}，运营口碑优秀`,
      ],
      tenantCount: b.tenant_count,
      rating: b.park_rating,
      hasPdf: !!b.building_pdf,
      hasNotes: !!b.sales_notes,
    };
    setGeneratedImage(longImageData);
    setShowPreview(true);
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif' }}>
      {/* 顶部导航 */}
      <div style={{ background: '#fff', borderBottom: `2px solid ${C.primary}`, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px' }}>
          <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/`} style={{ textDecoration: 'none', fontSize: 18, fontWeight: 800, color: C.primary }}>园圈</a>
          <span style={{ fontSize: 14, color: C.textMuted }}>| 销售端</span>
          <div style={{ flex: 1 }} />
          <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/list-building`} style={{ fontSize: 14, color: C.primary, fontWeight: 600, background: C.primaryLight, padding: '6px 14px', borderRadius: 6, textDecoration: 'none' }}>+ 新增房源</a>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px' }}>
        {/* 统计栏 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: '总房源', value: buildings.length, color: C.primary },
            { label: '已传楼书', value: buildings.filter(b => b.building_pdf).length, color: '#2563EB' },
            { label: '已传笔记', value: buildings.filter(b => b.sales_notes).length, color: '#34C759' },
            { label: '已生长图', value: buildings.filter(b => b.sales_long_image).length, color: '#FF9500' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 8, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 房源列表 */}
        <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 15, fontWeight: 700, color: C.text }}>我的房源</div>
          {buildings.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}
              onClick={() => setSelected(b)}
              onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <img src={assetUrl(b.images?.[0] || '/images/buildings/industrial1.jpg')} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{b.region} · {b.total_area}㎡ · {Number(b.rent_min).toFixed(1)}元</div>
              </div>
              {/* 状态标记 */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {b.building_pdf && <span style={{ fontSize: 10, color: '#2563EB', background: '#EFF6FF', padding: '2px 6px', borderRadius: 3 }}>楼书</span>}
                {b.sales_notes && <span style={{ fontSize: 10, color: '#34C759', background: '#EAFBEF', padding: '2px 6px', borderRadius: 3 }}>笔记</span>}
              </div>
              <button onClick={(e) => { e.stopPropagation(); setSelected(b); }} style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${C.primary}`, background: 'transparent', color: C.primary, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>管理</button>
            </div>
          ))}
        </div>
      </div>

      {/* 管理面板 */}
      {selected && !showUpload && !showPreview && (
        <ManagePanel
          building={selected}
          onClose={() => setSelected(null)}
          onUploadPdf={() => { setUploadType('pdf'); setShowUpload(true); fileRef.current?.click(); }}
          onUploadNotes={() => { setUploadType('notes'); setNotesText(selected.sales_notes || ''); setShowUpload(true); }}
          onGenerate={() => generateLongImage(selected)}
        />
      )}

      {/* 笔记输入 */}
      {showUpload && uploadType === 'notes' && (
        <NotesEditor notes={notesText} setNotes={setNotesText} onSave={handleSaveNotes} onClose={() => setShowUpload(false)} />
      )}

      {/* 长图预览 */}
      {showPreview && generatedImage && (
        <LongImagePreview data={generatedImage} onClose={() => setShowPreview(false)} />
      )}

      {/* PDF文件输入 */}
      <input ref={fileRef} type="file" accept="application/pdf" onChange={handlePdfUpload} style={{ display: 'none' }} />
    </div>
  );
}

// ===== 管理面板 =====
function ManagePanel({ building, onClose, onUploadPdf, onUploadNotes, onGenerate }: {
  building: SalesBuilding; onClose: () => void;
  onUploadPdf: () => void; onUploadNotes: () => void; onGenerate: () => void;
}) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 201, width: '90%', maxWidth: 500, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', overflow: 'hidden', animation: 'scaleIn 0.25s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid #eee' }}>
          <img src={assetUrl(building.images?.[0] || '/images/buildings/industrial1.jpg')} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>{building.name}</div>
            <div style={{ fontSize: 13, color: '#999' }}>{building.region} · {building.total_area}㎡</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: '#F5F5F5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 楼书上传 */}
          <div style={{ border: '1px dashed #ddd', borderRadius: 10, padding: 20, textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={building.building_pdf ? '#2563EB' : '#ccc'} strokeWidth="1.5" style={{ margin: '0 auto 8px', display: 'block' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            <div style={{ fontSize: 14, fontWeight: 600, color: building.building_pdf ? '#2563EB' : '#333' }}>{building.building_pdf ? '楼书已上传 ✓' : '上传楼书 PDF'}</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>支持PDF格式，自动提取关键信息</div>
            <button onClick={onUploadPdf} style={{ marginTop: 10, padding: '8px 20px', borderRadius: 8, border: '1px solid #2563EB', background: building.building_pdf ? '#fff' : '#2563EB', color: building.building_pdf ? '#2563EB' : '#fff', fontSize: 14, cursor: 'pointer' }}>{building.building_pdf ? '重新上传' : '选择文件'}</button>
          </div>

          {/* 销售笔记 */}
          <div style={{ border: '1px dashed #ddd', borderRadius: 10, padding: 20, textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={building.sales_notes ? '#34C759' : '#ccc'} strokeWidth="1.5" style={{ margin: '0 auto 8px', display: 'block' }}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <div style={{ fontSize: 14, fontWeight: 600, color: building.sales_notes ? '#34C759' : '#333' }}>{building.sales_notes ? '笔记已填写 ✓' : '填写销售笔记'}</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>记录卖点、优势、注意事项</div>
            <button onClick={onUploadNotes} style={{ marginTop: 10, padding: '8px 20px', borderRadius: 8, border: '1px solid #34C759', background: building.sales_notes ? '#fff' : '#34C759', color: building.sales_notes ? '#34C759' : '#fff', fontSize: 14, cursor: 'pointer' }}>{building.sales_notes ? '编辑笔记' : '开始填写'}</button>
            {building.sales_notes && <div style={{ marginTop: 8, fontSize: 12, color: '#666', textAlign: 'left', background: '#F8F9FB', padding: 10, borderRadius: 6, maxHeight: 80, overflow: 'hidden' }}>{building.sales_notes.slice(0, 100)}...</div>}
          </div>

          {/* 生成长图 */}
          <button onClick={onGenerate} disabled={!building.building_pdf && !building.sales_notes} style={{
            width: '100%', height: 48, borderRadius: 10, border: 'none',
            background: (!building.building_pdf && !building.sales_notes) ? '#ccc' : `linear-gradient(135deg, ${C.primary}, #FF8C5A)`,
            color: '#fff', fontSize: 16, fontWeight: 700, cursor: (!building.building_pdf && !building.sales_notes) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
            生成销售详情长图
          </button>
        </div>
      </div>
    </>
  );
}

// ===== 笔记编辑器 =====
function NotesEditor({ notes, setNotes, onSave, onClose }: { notes: string; setNotes: (v: string) => void; onSave: () => void; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 201, width: '90%', maxWidth: 500, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', overflow: 'hidden', animation: 'scaleIn 0.25s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #eee' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>销售笔记</span>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: '#F5F5F5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={`填写销售笔记，每行一个卖点，例如：\n\n紧邻高速出口，物流便利\n独栋厂房，可定制改造\n环评已过，可做化工\n周边3公里有员工宿舍区\n政府补贴政策，首年租金减免`} style={{ width: '100%', minHeight: 200, padding: 12, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, lineHeight: 1.6, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} autoFocus />
          <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>提示：每行一个卖点，将自动提取为长图亮点</div>
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '0 20px 20px' }}>
          <button onClick={onClose} style={{ flex: 1, height: 44, borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#666', fontSize: 14, cursor: 'pointer' }}>取消</button>
          <button onClick={onSave} disabled={!notes.trim()} style={{ flex: 1, height: 44, borderRadius: 8, border: 'none', background: notes.trim() ? '#34C759' : '#ccc', color: '#fff', fontSize: 14, fontWeight: 600, cursor: notes.trim() ? 'pointer' : 'default' }}>保存笔记</button>
        </div>
      </div>
    </>
  );
}

// ===== 长图预览 =====
function LongImagePreview({ data, onClose }: { data: any; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 301, width: '90%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', borderRadius: 16, animation: 'scaleIn 0.3s ease' }}>
        {/* 长图内容 — 可截图分享 */}
        <div id="long-image-content" style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.3)' }}>
          {/* 头部渐变 */}
          <div style={{ background: `linear-gradient(135deg, ${C.primary}, #FF8C5A)`, padding: '24px 20px', color: '#fff', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{data.title}</div>
            <div style={{ fontSize: 14, opacity: 0.9 }}>{data.subtitle} · {data.location}</div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
              {data.tags.map((t: string) => <span key={t} style={{ fontSize: 11, background: 'rgba(255,255,255,0.25)', padding: '3px 10px', borderRadius: 999 }}>{t}</span>)}
            </div>
          </div>

          {/* 图片 */}
          {data.images.length > 0 && (
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: 12 }}>
              {data.images.slice(0, 3).map((img: string, i: number) => <img key={i} src={assetUrl(img)} alt="" style={{ width: '100%', height: 160, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />)}
            </div>
          )}

          {/* 核心参数 */}
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#333', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 3, height: 18, background: C.primary, borderRadius: 2 }} /> 核心参数
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {Object.entries(data.params).map(([k, v]) => (
                <div key={k} style={{ background: '#F8F9FB', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 11, color: '#999' }}>{k}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#333', marginTop: 2 }}>{v as string}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 亮点 — 从笔记提取 */}
          <div style={{ padding: '0 20px 16px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#333', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 3, height: 18, background: C.primary, borderRadius: 2 }} /> 楼盘亮点
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.highlights.map((h: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.primaryLight, color: C.primary, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <span style={{ fontSize: 14, color: '#333', lineHeight: 1.5 }}>{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 配套设施 */}
          {data.amenities.length > 0 && (
            <div style={{ padding: '0 20px 16px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#333', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 3, height: 18, background: C.primary, borderRadius: 2 }} /> 配套设施
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.amenities.map((a: string, i: number) => <span key={i} style={{ fontSize: 12, color: '#666', background: '#F5F5F5', padding: '5px 12px', borderRadius: 999 }}>{a}</span>)}
              </div>
            </div>
          )}

          {/* 底部 */}
          <div style={{ background: '#F8F9FB', padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.price }}>{data.params['租金']}</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>已入驻 {data.tenantCount} 家企业 · 评分 {data.rating}/5</div>
            <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: C.primary }}>园圈 · 产业地产招商平台</div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: 10, padding: 16, justifyContent: 'center' }}>
          <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#666', fontSize: 14, cursor: 'pointer' }}>关闭</button>
          <button onClick={() => window.print()} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
            打印/保存
          </button>
        </div>
      </div>
    </>
  );
}
