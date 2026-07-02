// AI办公工具集 — 纯浏览器端处理
// 测试文件：验证每个函数真能跑通

import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import jsPDF from 'jspdf';

// === Excel 处理 ===
// xlsx 库：浏览器端读写 Excel

export function excelToJson(file: File): Promise<any[][]> {
  return file.arrayBuffer().then(buf => {
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  });
}

export function jsonToExcel(rows: any[][], filename = '导出.xlsx') {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename);
}

export function csvToExcel(file: File): Promise<void> {
  return file.text().then(text => {
    const rows = text.split('\n').map(line => line.split(','));
    jsonToExcel(rows, file.name.replace('.csv', '.xlsx'));
  });
}

// === Word 处理 ===
// mammoth 库：docx 转 html

export function docxToHtml(file: File): Promise<string> {
  return file.arrayBuffer().then(buf => mammoth.convertToHtml({ arrayBuffer: buf }).then(r => r.value));
}

// === PDF 生成 ===
// jsPDF：文本/表格导出 PDF

export function textToPdf(text: string, filename = '导出.pdf') {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const lines = doc.splitTextToSize(text, 500);
  doc.text(lines, 30, 40);
  doc.save(filename);
}

export function tableToPdf(rows: any[][], filename = '表格.pdf') {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
  (doc as any).autoTable({
    head: [rows[0]],
    body: rows.slice(1),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [0, 88, 163] },
  });
  doc.save(filename);
}

// === PDF 解析 ===
// pdfjs-dist：PDF 文本提取

let pdfjsReady = false;
async function ensurePdfjs() {
  if (pdfjsReady) return (window as any).pdfjsLib;
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  (window as any).pdfjsLib = pdfjs;
  pdfjsReady = true;
  return pdfjs;
}

export async function pdfToText(file: File): Promise<string> {
  const pdfjs = await ensurePdfjs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it: any) => it.str).join(' ') + '\n\n--- 第' + i + '页 ---\n';
  }
  return text;
}

export async function pdfPageCount(file: File): Promise<number> {
  const pdfjs = await ensurePdfjs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  return pdf.numPages;
}

// PDF 拆分（提取指定页为单独文本）
export async function pdfSplitPages(file: File, ranges: [number, number][]): Promise<{ range: string; text: string }[]> {
  const pdfjs = await ensurePdfjs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const results: { range: string; text: string }[] = [];
  for (const [s, e] of ranges) {
    let text = '';
    for (let i = s; i <= e && i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it: any) => it.str).join(' ') + '\n';
    }
    results.push({ range: `第${s}-${e}页`, text });
  }
  return results;
}

// === 音频提取/转换 ===
// Web Audio API：提取音频、格式转换(转WAV)

export async function audioToWav(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  return audioBufferToWav(audioBuffer);
}

// AudioBuffer 转 WAV
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numChannels * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);
  // WAV header
  const writeString = (offset: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  writeString(0, 'RIFF'); view.setUint32(4, length - 8, true); writeString(8, 'WAVE');
  writeString(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true); view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true); writeString(36, 'data'); view.setUint32(40, length - 44, true);
  // PCM data
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) channels.push(buffer.getChannelData(i));
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// 音频静音裁剪（去除首尾静音）
export async function audioTrimSilence(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  const data = audioBuffer.getChannelData(0);
  const threshold = 0.01;
  let start = 0, end = data.length;
  for (let i = 0; i < data.length; i++) { if (Math.abs(data[i]) > threshold) { start = i; break; } }
  for (let i = data.length - 1; i >= 0; i--) { if (Math.abs(data[i]) > threshold) { end = i; break; } }
  const trimmed = audioCtx.createBuffer(1, end - start, audioBuffer.sampleRate);
  trimmed.copyToChannel(data.slice(start, end), 0);
  return audioBufferToWav(trimmed);
}

// === 多格式转换 ===
// 图片格式转换 (Web Audio 类似的 Canvas 方式)

export async function imageConvert(file: File, targetFormat: 'png' | 'jpeg' | 'webp'): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.width; canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return new Promise(resolve => canvas.toBlob(b => resolve(b!), `image/${targetFormat}`, 0.92)!);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = URL.createObjectURL(file);
  });
}

// === PPT 生成（简化版：标题+内容页） ===
// 用 jsPDF 生成 PPT 风格 PDF（16:9）
export function makeSlides(title: string, slides: { title: string; content: string }[], filename = '演示文稿.pdf') {
  const doc = new jsPDF({ unit: 'pt', format: [960, 540], orientation: 'landscape' });
  // 封面
  doc.setFillColor(0, 88, 163); doc.rect(0, 0, 960, 540, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(36);
  doc.text(doc.splitTextToSize(title, 800), 80, 260);
  // 内容页
  slides.forEach((s, i) => {
    doc.addPage();
    doc.setFillColor(245, 245, 245); doc.rect(0, 0, 960, 540, 'F');
    doc.setFillColor(0, 88, 163); doc.rect(0, 0, 960, 8, 'F');
    doc.setTextColor(17, 17, 17); doc.setFontSize(24);
    doc.text(s.title, 60, 80);
    doc.setFontSize(16); doc.setTextColor(72, 72, 72);
    doc.text(doc.splitTextToSize(s.content, 840), 60, 130);
    doc.setFontSize(10); doc.setTextColor(118, 118, 118);
    doc.text(`${i + 1}`, 920, 520);
  });
  doc.save(filename);
}

// === 文件压缩信息 ===
export function fileMeta(file: File): { name: string; size: string; type: string } {
  const sizeKB = file.size / 1024;
  return {
    name: file.name,
    size: sizeKB > 1024 ? (sizeKB / 1024).toFixed(2) + ' MB' : sizeKB.toFixed(1) + ' KB',
    type: file.type || '未知',
  };
}

// 下载 Blob
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
