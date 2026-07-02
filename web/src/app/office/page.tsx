'use client';

import React, { useState, useRef } from 'react';
import { IKEA, FONT, SHADOW, RADIUS } from '../../lib/ikea-style';
import {
  excelToJson, docxToHtml, textToPdf,
  pdfToText, pdfPageCount, pdfSplitPages, audioToWav,
  imageConvert, makeSlides, fileMeta, downloadBlob
} from '../../lib/office-tools';

const C = { primary: '#0058A3', primaryLight: '#E5F0FA', bg: '#F5F5F5', text: '#111', textSub: '#484848', textMuted: '#767676', border: '#E5E5E5', green: '#008A00', sale: '#E0001B' };

const TOOLS = [
  { group: '文档处理', items: [
    { id: 'docx2html', name: 'Word转网页', desc: '上传docx提取为可读HTML', icon: 'doc', accept: '.docx' },
    { id: 'pdf2text', name: 'PDF解析', desc: '提取PDF全部文字内容', icon: 'pdf', accept: '.pdf' },
    { id: 'pdfsplit', name: 'PDF拆分', desc: '按页码范围拆分提取', icon: 'split', accept: '.pdf' },
  ]},
  { group: '表格处理', items: [
    { id: 'xlsx2json', name: 'Excel转数据', desc: '读取Excel为可编辑表格', icon: 'xls', accept: '.xlsx,.xls' },
  ]},
  { group: 'PDF生成', items: [
    { id: 'text2pdf', name: '文本转PDF', desc: '输入文本一键生成PDF', icon: 'pdf2', accept: '' },
    { id: 'makeppt', name: '制作PPT', desc: '快速生成演示文稿PDF', icon: 'ppt', accept: '' },
  ]},
  { group: '音视频处理', items: [
    { id: 'audio2wav', name: '音频转WAV', desc: '任意音频转为标准WAV', icon: 'audio', accept: 'audio/*' },
  ]},
  { group: '图片转换', items: [
    { id: 'img2png', name: '转PNG', desc: '图片转为PNG格式', icon: 'img', accept: 'image/*' },
    { id: 'img2jpg', name: '转JPG', desc: '图片转为JPG格式', icon: 'img', accept: 'image/*' },
    { id: 'img2webp', name: '转WebP', desc: '图片转为WebP格式', icon: 'img', accept: 'image/*' },
  ]},
];

const ICONS: Record<string, string> = {
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/>',
  xls: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/>',
  ppt: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/>',
  audio: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  img: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  split: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="12" y1="2" x2="12" y2="22"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/>',
  xls2: '<path d="M12 3v18M3 12h18"/>',
  csv: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>',
  pdf2: '<path d="M12 2v20M2 7l10-5 10 5"/>',
  pdf3: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>',
  audio2: '<path d="M3 12h2l2-6 4 12 3-9 2 3h5"/>',
};

export default function OfficePage() {
  const [selTool, setSelTool] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [textInput, setTextInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const bp = process.env.NEXT_PUBLIC_BASE_PATH || '';

  const currentTool = TOOLS.flatMap(g => g.items).find(t => t.id === selTool);

  const handleFile = async (file: File) => {
    setBusy(true); setResult(null);
    try {
      switch (selTool) {
        case 'docx2html': { const html = await docxToHtml(file); setResult({ type: 'html', html, meta: fileMeta(file) }); break; }
        case 'pdf2text': { const text = await pdfToText(file); setResult({ type: 'text', text, meta: fileMeta(file) }); break; }
        case 'pdfsplit': { const n = await pdfPageCount(file); const ranges: [number, number][] = [[1, Math.ceil(n/2)], [Math.ceil(n/2)+1, n]]; const parts = await pdfSplitPages(file, ranges); setResult({ type: 'split', parts, meta: fileMeta(file), pages: n }); break; }
        case 'xlsx2json': { const rows = await excelToJson(file); setResult({ type: 'table', rows, meta: fileMeta(file) }); break; }
        case 'audio2wav': { const blob = await audioToWav(file); downloadBlob(blob, file.name.replace(/\.[^.]+$/, '.wav')); setResult({ type: 'done', msg: 'WAV已下载' }); break; }
        case 'img2png': { const b = await imageConvert(file, 'png'); downloadBlob(b, file.name.replace(/\.[^.]+$/, '.png')); setResult({ type: 'done', msg: 'PNG已下载' }); break; }
        case 'img2jpg': { const b = await imageConvert(file, 'jpeg'); downloadBlob(b, file.name.replace(/\.[^.]+$/, '.jpg')); setResult({ type: 'done', msg: 'JPG已下载' }); break; }
        case 'img2webp': { const b = await imageConvert(file, 'webp'); downloadBlob(b, file.name.replace(/\.[^.]+$/, '.webp')); setResult({ type: 'done', msg: 'WebP已下载' }); break; }
      }
    } catch (e: any) {
      setResult({ type: 'error', msg: e.message || '处理失败' });
    } finally { setBusy(false); }
  };

  const handleTextAction = () => {
    setBusy(true);
    try {
      if (selTool === 'text2pdf') { textToPdf(textInput, '文本.pdf'); setResult({ type: 'done', msg: 'PDF已下载' }); }
      else if (selTool === 'makeppt') {
        const lines = textInput.trim().split('\n');
        const title = lines[0] || '演示文稿';
        const slides = lines.slice(1).map(l => { const [t, ...c] = l.split('|'); return { title: t || '', content: c.join('|') }; });
        makeSlides(title, slides, '演示文稿.pdf'); setResult({ type: 'done', msg: 'PPT已下载(16:9 PDF)' });
      }
    } catch (e: any) { setResult({ type: 'error', msg: e.message }); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT, display: 'flex', flexDirection: 'column' }}>
      {/* 顶部 */}
      <div style={{ background: C.primary, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <a href={`${bp}/`} style={{ fontSize: 20, fontWeight: 900, color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 6, background: '#FFDA1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.5"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" /></svg>
          </div>
          园圈
        </a>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>| AI办公</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginLeft: 8 }}>所有处理在浏览器本地完成，文件不上传，安全私密</span>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* 左侧工具栏 */}
        <div style={{ width: 240, background: '#fff', borderRight: `1px solid ${C.border}`, overflowY: 'auto', flexShrink: 0 }}>
          {TOOLS.map(g => (
            <div key={g.group}>
              <div style={{ padding: '14px 16px 6px', fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase' }}>{g.group}</div>
              {g.items.map(t => (
                <button key={t.id} onClick={() => { setSelTool(t.id); setResult(null); setTextInput(''); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', border: 'none', background: selTool === t.id ? C.primaryLight : 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: FONT, borderLeft: selTool === t.id ? `3px solid ${C.primary}` : '3px solid transparent' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={selTool === t.id ? C.primary : C.textSub} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICONS[t.icon] || ICONS.doc }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: selTool === t.id ? C.primary : C.text }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* 右侧操作区 */}
        <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
          {!currentTool ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: C.textMuted }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>选择左侧工具开始</div>
              <div style={{ fontSize: 14 }}>支持 Word/Excel/PDF/音频/图片 等常用办公处理</div>
            </div>
          ) : (
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 6 }}>{currentTool.name}</div>
              <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 24 }}>{currentTool.desc}</div>

              {/* 文件上传类工具 */}
              {currentTool.accept && (
                <div>
                  <div onClick={() => fileRef.current?.click()} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }} onDragOver={e => e.preventDefault()} style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: 48, textAlign: 'center', cursor: 'pointer', background: '#fff', transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = C.primary} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>点击或拖拽文件到这里</div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>支持 {currentTool.accept}</div>
                  </div>
                  <input ref={fileRef} type="file" accept={currentTool.accept} style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                </div>
              )}

              {/* 文本输入类工具 */}
              {!currentTool.accept && (
                <div>
                  <textarea value={textInput} onChange={e => setTextInput(e.target.value)} placeholder={
                    selTool === 'text2pdf' ? '输入要转为PDF的文本内容...' :
                    selTool === 'table2pdf' ? '输入表格(行用换行，列用Tab键分隔)\n例如:\n姓名\t年龄\n张三\t25' :
                    selTool === 'makeppt' ? '第一行是标题\n后续每行格式：页标题|内容\n例如:\nAI选址汇报\n项目背景|我们是一个产业园平台\n技术方案|使用DeepSeek做语义匹配' :
                    '输入数据(行用换行，列用Tab键分隔)'
                  } style={{ width: '100%', minHeight: 200, padding: 14, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: 'monospace', outline: 'none', resize: 'vertical', lineHeight: 1.6 }} />
                  <button onClick={handleTextAction} disabled={!textInput.trim() || busy} style={{ marginTop: 12, padding: '12px 32px', borderRadius: 8, border: 'none', background: textInput.trim() && !busy ? C.primary : '#ccc', color: '#fff', fontSize: 15, fontWeight: 700, cursor: textInput.trim() && !busy ? 'pointer' : 'default', fontFamily: FONT }}>
                    {busy ? '处理中...' : '生成并下载'}
                  </button>
                </div>
              )}

              {/* 处理结果 */}
              {busy && <div style={{ marginTop: 20, padding: 16, background: C.primaryLight, borderRadius: 8, color: C.primary, fontSize: 14, textAlign: 'center' }}>正在处理中，请稍候...</div>}
              {result?.type === 'done' && <div style={{ marginTop: 20, padding: 16, background: '#EAFBEF', borderRadius: 8, color: C.green, fontSize: 14, textAlign: 'center', fontWeight: 600 }}>✓ {result.msg}</div>}
              {result?.type === 'error' && <div style={{ marginTop: 20, padding: 16, background: '#FFF0F0', borderRadius: 8, color: C.sale, fontSize: 14 }}>处理失败：{result.msg}</div>}
              {result?.type === 'html' && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>文件：{result.meta.name} ({result.meta.size})</div>
                  <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, fontSize: 14, lineHeight: 1.8, maxHeight: 400, overflowY: 'auto' }} dangerouslySetInnerHTML={{ __html: result.html }} />
                </div>
              )}
              {result?.type === 'text' && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>文件：{result.meta.name} ({result.meta.size})</div>
                  <pre style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, fontSize: 13, lineHeight: 1.6, maxHeight: 400, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{result.text}</pre>
                </div>
              )}
              {result?.type === 'table' && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>文件：{result.meta.name} ({result.meta.size}) · {result.rows.length}行</div>
                  <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff' }}>
                      <tbody>{result.rows.map((r: any[], i: number) => (
                        <tr key={i} style={{ background: i === 0 ? C.primaryLight : 'transparent' }}>
                          {r.map((c: any, j: number) => <td key={j} style={{ padding: '6px 10px', borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, color: i === 0 ? C.primary : C.text, fontWeight: i === 0 ? 700 : 400 }}>{String(c ?? '')}</td>)}
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
              {result?.type === 'split' && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>共 {result.pages} 页，已拆分为 {result.parts.length} 段</div>
                  {result.parts.map((p: any, i: number) => (
                    <div key={i} style={{ marginBottom: 12, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.primary, marginBottom: 6 }}>{p.range}</div>
                      <pre style={{ fontSize: 12, lineHeight: 1.6, maxHeight: 150, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>{p.text}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
