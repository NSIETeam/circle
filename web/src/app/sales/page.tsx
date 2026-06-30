'use client';

import React, { useState, useRef, useEffect } from 'react';
import { assetUrl } from '../../lib/asset';
import { extractRequirement, hasApiKey } from '../../lib/deepseek';

const C = {
  primary: '#00A6E0', primaryLight: '#E6F7FD', bg: '#F5F5F5', card: '#fff',
  text: '#333', textSub: '#666', textMuted: '#999', border: '#eee', price: '#00A6E0',
};

function fieldLabel(key: string): string {
  const map: Record<string, string> = { industry: '产业', area: '面积(㎡)', load: '承重(T)', height: '层高(m)', power: '电力(KVA)', rent_min: '最低租金', rent_max: '最高租金', region: '区域', space_type: '空间类型', special: '特殊需求' };
  return map[key] || key;
}

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
  const [activeTab, setActiveTab] = useState<'listings' | 'pending' | 'history' | 'promos' | 'park'>('listings');
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<any>(null);
  const recognitionRef = useRef<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(assetUrl('/data/buildings.json'))
      .then(r => r.json())
      .then(data => setBuildings(data.slice(0, 20)));
    // 加载待审核和审核记录
    setPendingItems(JSON.parse(localStorage.getItem('my_listings') || '[]').filter((b: any) => b.status === 'pending' || b.status === 'pending_review'));
    setHistoryItems(JSON.parse(localStorage.getItem('audit_history') || '[]'));
  }, []);

  // 审核操作
  const handleApprove = (item: any) => {
    // 更新状态
    const listings = JSON.parse(localStorage.getItem('my_listings') || '[]');
    const updated = listings.map((b: any) => b.id === item.id ? { ...b, status: 'approved', audited_at: new Date().toISOString() } : b);
    localStorage.setItem('my_listings', JSON.stringify(updated));
    setPendingItems(updated.filter((b: any) => b.status === 'pending' || b.status === 'pending_review'));
    // 记录历史
    const hist = JSON.parse(localStorage.getItem('audit_history') || '[]');
    hist.unshift({ ...item, status: 'approved', audited_at: new Date().toISOString(), audit_action: '通过上线' });
    localStorage.setItem('audit_history', JSON.stringify(hist));
    setHistoryItems(hist);
  };

  const handleReject = () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    const listings = JSON.parse(localStorage.getItem('my_listings') || '[]');
    const updated = listings.map((b: any) => b.id === rejectTarget.id ? { ...b, status: 'rejected', audited_at: new Date().toISOString(), reject_reason: rejectReason } : b);
    localStorage.setItem('my_listings', JSON.stringify(updated));
    setPendingItems(updated.filter((b: any) => b.status === 'pending' || b.status === 'pending_review'));
    const hist = JSON.parse(localStorage.getItem('audit_history') || '[]');
    hist.unshift({ ...rejectTarget, status: 'rejected', audited_at: new Date().toISOString(), audit_action: `驳回：${rejectReason}` });
    localStorage.setItem('audit_history', JSON.stringify(hist));
    setHistoryItems(hist);
    setRejectTarget(null);
    setRejectReason('');
  };

  // 语音录入
  const handleVoiceStart = () => {
    if (!('webkitSpeechRecognition' in window)) {
      // 不支持语音 → 手动输入
      setShowVoiceInput(true);
      return;
    }
    const rec = new (window as any).webkitSpeechRecognition();
    rec.lang = 'zh-CN'; rec.continuous = true; rec.interimResults = true;
    rec.onresult = (e: any) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setVoiceText(text);
    };
    rec.onend = () => setShowVoiceInput(true);
    recognitionRef.current = rec;
    rec.start();
  };

  // DeepSeek自动拆分语音文本 → 生成楼盘信息
  const handleParseVoice = async () => {
    if (!voiceText.trim()) return;
    setParsing(true);
    try {
      // 优先用DeepSeek提取，降级用本地解析
      let result: any = null;
      if (hasApiKey()) {
        result = await extractRequirement(voiceText);
      }
      if (!result || Object.keys(result).length === 0) {
        // 本地降级解析
        result = localParse(voiceText);
      }
      setParsedResult(result);
    } catch {
      setParsedResult(localParse(voiceText));
    } finally {
      setParsing(false);
    }
  };

  // 本地降级解析
  const localParse = (text: string): any => {
    const result: any = { special: [] };
    const industries = ['AI', '生物医药', '智能制造', '集成电路', '新能源', '新材料', '电子信息', '航空航天'];
    const found = industries.find(ind => text.includes(ind));
    if (found) result.industry = found;
    const areaMatch = text.match(/(\d+\.?\d*)\s*万?\s*(?:平|㎡|平米|平方)/);
    if (areaMatch) result.area = text.includes('万') ? parseFloat(areaMatch[1]) * 10000 : parseFloat(areaMatch[1]);
    const loadMatch = text.match(/(?:承重|荷载)[^\d]*?(\d+\.?\d*)\s*(?:吨|t|T)/);
    if (loadMatch) result.load = parseFloat(loadMatch[1]);
    const heightMatch = text.match(/(?:层高|净高)[^\d]*?(\d+\.?\d*)\s*(?:米|m)/);
    if (heightMatch) result.height = parseFloat(heightMatch[1]);
    const powerMatch = text.match(/(\d+\.?\d*)\s*(?:kva|KVA|kw|KW)/i);
    if (powerMatch) result.power = parseFloat(powerMatch[1]);
    const rentMatch = text.match(/(\d+\.?\d*)\s*[-~]\s*(\d+\.?\d*)\s*元/);
    if (rentMatch) { result.rent_min = parseFloat(rentMatch[1]); result.rent_max = parseFloat(rentMatch[2]); }
    const regions = ['大兴区', '昌平区', '顺义区', '经开区', '朝阳区', '海淀区', '丰台区', '通州区'];
    const region = regions.find(r => text.includes(r));
    if (region) result.region = region;
    if (text.includes('注册')) result.special.push('需注册地');
    if (text.includes('洁净') || text.includes('GMP')) result.special.push('需洁净室');
    if (text.includes('排污') || text.includes('环评')) result.special.push('需环评');
    if (text.includes('独栋')) result.special.push('需独栋');
    if (text.includes('行车') || text.includes('天车')) result.special.push('需行车');
    return result;
  };

  // 应用解析结果到选中房源
  const applyParsedToBuilding = () => {
    if (!selected || !parsedResult) return;
    const updated = buildings.map(b => {
      if (b.id !== selected.id) return b;
      const newB = { ...b };
      if (parsedResult.area) newB.total_area = parsedResult.area;
      if (parsedResult.height) newB.floor_height = parsedResult.height;
      if (parsedResult.load) newB.floor_load = parsedResult.load;
      if (parsedResult.power) newB.power_capacity = parsedResult.power;
      if (parsedResult.rent_min) newB.rent_min = parsedResult.rent_min;
      if (parsedResult.rent_max) newB.rent_max = parsedResult.rent_max;
      if (parsedResult.industry && !newB.industry_tags?.includes(parsedResult.industry)) {
        newB.industry_tags = [...(newB.industry_tags || []), parsedResult.industry];
      }
      return newB;
    });
    setBuildings(updated);
    const newSel = updated.find(b => b.id === selected.id);
    if (newSel) setSelected(newSel);
    setShowVoiceInput(false);
    setVoiceText('');
    setParsedResult(null);
  };

  // 上传楼书 — 支持PDF/Word/PPT/图片，自动解析
  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;

    const fileType = file.type;
    const fileName = file.name;
    let parsedData: any = null;

    // 图片文件 — 直接读取预览
    if (fileType.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        parsedData = autoParseDocument(fileName, '', 'image');
        updateBuildingWithParsed(selected.id, reader.result as string, fileName, parsedData);
      };
      reader.readAsDataURL(file);
    } else {
      // PDF/Word/PPT — 读取文件名提取信息，模拟解析
      // 实际场景：上传到后端OCR/文档解析服务，这里用文件名+内置规则模拟
      const reader = new FileReader();
      reader.onload = () => {
        const textContent = fileType === 'application/pdf' ? '' : ''; // PDF需要后端解析
        parsedData = autoParseDocument(fileName, textContent, fileType);
        updateBuildingWithParsed(selected.id, fileName, fileName, parsedData);
      };
      reader.readAsArrayBuffer(file);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  // 自动解析文档 — 从文件名/内容中提取关键信息
  const autoParseDocument = (fileName: string, content: string, type: string): any => {
    const text = fileName + ' ' + content;
    const lower = text.toLowerCase();
    const result: any = { highlights: [], params: {}, amenities: [] };

    // 提取面积
    const areaMatch = text.match(/(\d+\.?\d*)\s*万?\s*(?:平|㎡|平米|平方)/);
    if (areaMatch) {
      const val = parseFloat(areaMatch[1]);
      result.params['面积'] = text.includes('万') ? `${(val * 10000).toLocaleString()}㎡` : `${val.toLocaleString()}㎡`;
    }

    // 提取层高
    const heightMatch = text.match(/(?:层高|净高)[^\d]*?(\d+\.?\d*)\s*(?:米|m)/);
    if (heightMatch) result.params['层高'] = `${heightMatch[1]}m`;

    // 提取承重
    const loadMatch = text.match(/(?:承重|荷载)[^\d]*?(\d+\.?\d*)\s*(?:吨|t|T)/);
    if (loadMatch) result.params['承重'] = `${loadMatch[1]}T/㎡`;

    // 提取电力
    const powerMatch = text.match(/(\d+\.?\d*)\s*(?:kva|KVA|kw|KW)/i);
    if (powerMatch) result.params['电力'] = `${powerMatch[1]}KVA`;

    // 提取租金
    const rentMatch = text.match(/(\d+\.?\d*)\s*[-~]\s*(\d+\.?\d*)\s*元/);
    if (rentMatch) result.params['租金'] = `${rentMatch[1]}~${rentMatch[2]}元/㎡/天`;

    // 提取产业
    const industries = ['AI', '生物医药', '智能制造', '集成电路', '新能源', '新材料', '电子信息', '航空航天', '食品', '物流'];
    const matched = industries.filter(ind => lower.includes(ind.toLowerCase()));
    if (matched.length > 0) result.tags = matched;

    // 提取配套设施
    const facilities = ['行车', '货梯', '卸货平台', '环评', '消防', '污水处理', '废气处理', '蒸汽', '天然气', 'GMP车间', '实验室', '洁净室', '防静电', '防爆', '危化品仓库', '除尘', '通风', '数据中心', '机房空调', '双回路供电', '光纤接入', '宿舍', '食堂', '停车场'];
    result.amenities = facilities.filter(f => text.includes(f));

    // 自动生成卖点
    result.highlights = [];
    if (result.params['面积']) result.highlights.push(`总面积${result.params['面积']}，空间充裕`);
    if (result.params['层高']) result.highlights.push(`层高${result.params['层高']}，满足设备安装需求`);
    if (result.params['承重']) result.highlights.push(`承重${result.params['承重']}，可放重型设备`);
    if (result.amenities.length > 0) result.highlights.push(`配套完善：${result.amenities.slice(0, 4).join('、')}`);
    if (matched.length > 0) result.highlights.push(`${matched[0]}产业聚集，生态成熟`);

    return result;
  };

  // 更新房源数据
  const updateBuildingWithParsed = (id: string, fileData: string, fileName: string, parsed: any) => {
    const updated = buildings.map(b => {
      if (b.id !== id) return b;
      const newB = { ...b, building_pdf: fileData, sales_notes: b.sales_notes || '', sales_long_image: parsed };
      // 自动填充解析出的参数
      if (parsed.params?.['面积']) {
        const num = parseInt(parsed.params['面积'].replace(/\D/g, ''));
        if (num > 0) newB.total_area = num;
      }
      if (parsed.params?.['层高']) newB.floor_height = parseFloat(parsed.params['层高']);
      if (parsed.params?.['承重']) newB.floor_load = parseFloat(parsed.params['承重']);
      if (parsed.params?.['电力']) newB.power_capacity = parseInt(parsed.params['电力']);
      if (parsed.amenities?.length > 0) newB.amenities = [...new Set([...(b.amenities || []), ...parsed.amenities])];
      if (parsed.tags?.length > 0) newB.industry_tags = [...new Set([...(b.industry_tags || []), ...parsed.tags])];
      return newB;
    });
    setBuildings(updated);
    const newSelected = updated.find(b => b.id === id);
    if (newSelected) {
      setSelected(newSelected);
      setShowUpload(false);
      // 自动生成笔记摘要
      if (parsed.highlights?.length > 0) {
        const summary = `【自动解析】\n${parsed.highlights.join('\n')}`;
        setNotesText(summary);
      }
    }
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

        {/* Tab栏 */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: '#fff', borderRadius: 8, overflow: 'hidden', border: '1px solid #eee' }}>
          {[
            { k: 'listings', l: '我的房源', count: buildings.length },
            { k: 'promos', l: '促销管理', count: 0 },
            { k: 'pending', l: '待审核', count: pendingItems.length },
            { k: 'history', l: '审核记录', count: historyItems.length },
            { k: 'park', l: '园区信息', count: 0 },
          ].map((t, i) => (
            <button key={t.k} onClick={() => setActiveTab(t.k as any)} style={{ flex: 1, padding: '10px 0', border: 'none', borderRight: i < 4 ? '1px solid #eee' : 'none', background: activeTab === t.k ? '#E6F7FD' : '#fff', color: activeTab === t.k ? '#00A6E0' : '#666', fontSize: 14, fontWeight: activeTab === t.k ? 600 : 400, cursor: 'pointer' }}>
              {t.l} {t.count > 0 && <span style={{ fontSize: 12, color: activeTab === t.k ? '#00A6E0' : '#999' }}>({t.count})</span>}
            </button>
          ))}
        </div>

        {/* 房源列表 */}
        {activeTab === 'listings' && (
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
        )}

        {/* 待审核列表 */}
        {activeTab === 'pending' && (
          <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 15, fontWeight: 700, color: C.text }}>待审核内容 ({pendingItems.length})</div>
            {pendingItems.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 14 }}>暂无待审核内容</div>
            ) : pendingItems.map(item => (
              <div key={item.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#333' }}>{item.name || '未命名房源'}</div>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                      {item.region || ''} · {item.industry || ''} · 提交于 {new Date(item.created_at).toLocaleString('zh-CN')}
                    </div>
                    {item.auditResult && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: item.auditResult.riskLevel === 'high' ? '#FFF0F0' : item.auditResult.riskLevel === 'medium' ? '#FFF8E5' : '#EAFBEF', color: item.auditResult.riskLevel === 'high' ? '#FF3B30' : item.auditResult.riskLevel === 'medium' ? '#FF9500' : '#34C759' }}>
                          AI: {item.auditResult.status === 'approved' ? '通过' : item.auditResult.status === 'manual_review' ? '转人工' : '驳回'}
                        </span>
                        {item.auditResult.reasons.map((r: string, i: number) => <span key={i} style={{ fontSize: 10, color: '#999', background: '#F5F5F5', padding: '2px 6px', borderRadius: 3 }}>{r}</span>)}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => handleApprove(item)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: '#34C759', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>通过上线</button>
                  <button onClick={() => setRejectTarget(item)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid #FF3B30', background: '#fff', color: '#FF3B30', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>驳回</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 审核记录 */}
        {activeTab === 'history' && (
          <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 15, fontWeight: 700, color: C.text }}>审核记录 ({historyItems.length})</div>
            {historyItems.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 14 }}>暂无审核记录</div>
            ) : historyItems.map((item, i) => (
              <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: item.status === 'approved' ? '#EAFBEF' : '#FFF0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 16 }}>{item.status === 'approved' ? 'V' : 'X'}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{item.name || '未命名'}</div>
                  <div style={{ fontSize: 12, color: item.status === 'approved' ? '#34C759' : '#FF3B30', marginTop: 2 }}>{item.audit_action}</div>
                </div>
                <span style={{ fontSize: 11, color: '#999' }}>{new Date(item.audited_at).toLocaleString('zh-CN')}</span>
              </div>
            ))}
          </div>
        )}

        {/* 促销管理 */}
        {activeTab === 'promos' && (
          <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>促销管理</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {buildings.slice(0, 6).map(b => (
                <div key={b.id} style={{ border: '1px solid #f0f0f0', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>{b.name}</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <select style={{ flex: 1, height: 34, padding: '0 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, outline: 'none', background: '#fff' }}>
                      <option>特价</option><option>免租</option><option>赠送</option><option>减免</option>
                    </select>
                    <input placeholder="折扣内容" style={{ flex: 2, height: 34, padding: '0 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, outline: 'none' }} />
                  </div>
                  <input type="date" style={{ width: '100%', height: 34, padding: '0 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, marginBottom: 8 }} />
                  <button style={{ width: '100%', height: 36, borderRadius: 6, border: 'none', background: C.primary, color: '#fff', fontSize: 13, cursor: 'pointer' }}>设置促销</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 园区信息 */}
        {activeTab === 'park' && (
          <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
              <div style={{ border: '1px solid #f0f0f0', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 10 }}>入驻企业</div>
                {['智芯科技（AI，已入驻2年）', '康诺生物（生物医药，已入驻1年）', '精工智造（智能制造，已入驻3年）', '芯辰微电子（集成电路，已入驻1年）'].map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < 3 ? '1px solid #f5f5f5' : 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#E6F7FD', color: C.primary, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{c[0]}</div>
                    <span style={{ fontSize: 13, color: C.text }}>{c}</span>
                  </div>
                ))}
              </div>
              <div style={{ border: '1px solid #f0f0f0', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 10 }}>周边交通</div>
                {['最近地铁站 500m', '公交站 200m（3条线路）', '高速入口 2km', '首都机场 35km', '北京南站 25km'].map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < 4 ? '1px solid #f5f5f5' : 'none' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00A6E0" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span style={{ fontSize: 13, color: C.text }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 管理面板 */}
      {selected && !showUpload && !showPreview && (
        <ManagePanel
          building={selected}
          onClose={() => setSelected(null)}
          onUploadDoc={() => { setUploadType('pdf'); setShowUpload(true); fileRef.current?.click(); }}
          onUploadNotes={() => { setUploadType('notes'); setNotesText(selected.sales_notes || ''); setShowUpload(true); }}
          onGenerate={() => generateLongImage(selected)}
          onVoiceInput={() => { setShowVoiceInput(true); setVoiceText(''); setParsedResult(null); handleVoiceStart(); }}
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
      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,image/*" onChange={handleDocUpload} style={{ display: 'none' }} />

      {/* 驳回弹窗 */}
      {rejectTarget && (
        <div onClick={() => { setRejectTarget(null); setRejectReason(''); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: 400, background: '#fff', borderRadius: 12, padding: 20, animation: 'scaleIn 0.25s ease' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>驳回原因</div>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="请输入驳回原因..." autoFocus style={{ width: '100%', minHeight: 80, padding: 10, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} style={{ flex: 1, height: 40, borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#666', fontSize: 14, cursor: 'pointer' }}>取消</button>
              <button onClick={handleReject} disabled={!rejectReason.trim()} style={{ flex: 1, height: 40, borderRadius: 8, border: 'none', background: rejectReason.trim() ? '#FF3B30' : '#ccc', color: '#fff', fontSize: 14, fontWeight: 600, cursor: rejectReason.trim() ? 'pointer' : 'default' }}>确认驳回</button>
            </div>
          </div>
        </div>
      )}
      {/* 语音录入弹窗 */}
      {showVoiceInput && (
        <div onClick={() => setShowVoiceInput(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: 500, maxHeight: '80vh', background: '#fff', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'scaleIn 0.25s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #eee' }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>语音录入 · AI自动拆分</span>
              <button onClick={() => setShowVoiceInput(false)} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#F5F5F5', cursor: 'pointer', fontSize: 14 }}>X</button>
            </div>
            <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
              {/* 语音按钮 */}
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <button onClick={handleVoiceStart} style={{ width: 64, height: 64, borderRadius: '50%', border: 'none', background: '#00A6E0', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
                </button>
                <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>点击说话，描述楼盘信息</div>
              </div>
              {/* 识别文本 */}
              <textarea value={voiceText} onChange={e => setVoiceText(e.target.value)} placeholder="语音识别文本会显示在这里，也可以手动编辑..." style={{ width: '100%', minHeight: 100, padding: 10, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', marginBottom: 12 }} />
              {/* 解析按钮 */}
              <button onClick={handleParseVoice} disabled={!voiceText.trim() || parsing} style={{ width: '100%', height: 40, borderRadius: 8, border: 'none', background: voiceText.trim() && !parsing ? '#00A6E0' : '#ccc', color: '#fff', fontSize: 14, fontWeight: 600, cursor: voiceText.trim() && !parsing ? 'pointer' : 'default' }}>
                {parsing ? 'AI解析中...' : hasApiKey() ? 'DeepSeek智能解析' : '本地规则解析'}
              </button>
              {/* 解析结果 */}
              {parsedResult && (
                <div style={{ marginTop: 12, background: '#E6F7FD', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#00A6E0', marginBottom: 8 }}>AI解析结果：</div>
                  {Object.entries(parsedResult).map(([k, v]: [string, any]) => (
                    <div key={k} style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: '#666', minWidth: 70 }}>{fieldLabel(k)}:</span>
                      <span style={{ color: '#333', fontWeight: 600 }}>{Array.isArray(v) ? v.join('、') : String(v)}</span>
                    </div>
                  ))}
                  <button onClick={applyParsedToBuilding} style={{ width: '100%', height: 38, borderRadius: 8, border: 'none', background: '#34C759', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 10 }}>应用到此房源</button>
                </div>
              )}
              {/* 提示 */}
              <div style={{ marginTop: 12, fontSize: 12, color: '#999', textAlign: 'center' }}>
                示例："这个厂房在大兴区，做生物医药的，面积3000平米，层高6米，承重5吨，电力2000KVA，租金1.5到2块，需要GMP车间和排污"
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== 管理面板 =====
function ManagePanel({ building, onClose, onUploadDoc, onUploadNotes, onGenerate, onVoiceInput }: {
  building: SalesBuilding; onClose: () => void;
  onUploadDoc: () => void; onUploadNotes: () => void; onGenerate: () => void; onVoiceInput: () => void;
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
          {/* 楼书上传 — 多格式 */}
          <div style={{ border: '1px dashed #ddd', borderRadius: 10, padding: 20, textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={building.building_pdf ? '#00A6E0' : '#ccc'} strokeWidth="1.5" style={{ margin: '0 auto 8px', display: 'block' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            <div style={{ fontSize: 14, fontWeight: 600, color: building.building_pdf ? '#00A6E0' : '#333' }}>{building.building_pdf ? '楼书已上传 自动解析完成' : '上传楼书'}</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>支持 PDF / Word / PPT / 图片，自动提取参数和卖点</div>
            {building.sales_long_image?.highlights?.length > 0 && (
              <div style={{ marginTop: 10, background: '#E6F7FD', borderRadius: 8, padding: 10, textAlign: 'left' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#00A6E0', marginBottom: 6 }}>自动解析结果：</div>
                {building.sales_long_image.highlights.map((h: string, i: number) => (
                  <div key={i} style={{ fontSize: 12, color: '#333', lineHeight: 1.6 }}>• {h}</div>
                ))}
              </div>
            )}
            <button onClick={onUploadDoc} style={{ marginTop: 10, padding: '8px 20px', borderRadius: 8, border: '1px solid #00A6E0', background: building.building_pdf ? '#fff' : '#00A6E0', color: building.building_pdf ? '#00A6E0' : '#fff', fontSize: 14, cursor: 'pointer' }}>{building.building_pdf ? '重新上传' : '选择文件'}</button>
          </div>

          {/* 语音录入 — DeepSeek自动拆分 */}
          <div style={{ border: '1px dashed #00A6E0', borderRadius: 10, padding: 20, textAlign: 'center', background: '#E6F7FD' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00A6E0" strokeWidth="1.5" style={{ margin: '0 auto 8px', display: 'block' }}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#00A6E0' }}>语音录入 · AI自动拆分</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>说一段话描述楼盘，DeepSeek自动提取参数</div>
            <button onClick={onVoiceInput} style={{ marginTop: 10, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#00A6E0', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, margin: '10px auto 0' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
              开始语音录入
            </button>
          </div>

          {/* 销售笔记 — 文字/语音/图片 */}
          <div style={{ border: '1px dashed #ddd', borderRadius: 10, padding: 20, textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={building.sales_notes ? '#34C759' : '#ccc'} strokeWidth="1.5" style={{ margin: '0 auto 8px', display: 'block' }}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <div style={{ fontSize: 14, fontWeight: 600, color: building.sales_notes ? '#34C759' : '#333' }}>{building.sales_notes ? '笔记已填写' : '填写销售笔记'}</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>支持文字输入 / 语音录入 / 拍照上传</div>
            <button onClick={onUploadNotes} style={{ marginTop: 10, padding: '8px 20px', borderRadius: 8, border: '1px solid #34C759', background: building.sales_notes ? '#fff' : '#34C759', color: building.sales_notes ? '#34C759' : '#fff', fontSize: 14, cursor: 'pointer' }}>{building.sales_notes ? '编辑笔记' : '开始填写'}</button>
            {building.sales_notes && <div style={{ marginTop: 8, fontSize: 12, color: '#666', textAlign: 'left', background: '#F8F9FB', padding: 10, borderRadius: 6, maxHeight: 80, overflow: 'hidden' }}>{building.sales_notes.slice(0, 100)}...</div>}
          </div>

          {/* 生成长图 */}
          <button onClick={onGenerate} disabled={!building.building_pdf && !building.sales_notes} style={{
            width: '100%', height: 48, borderRadius: 10, border: 'none',
            background: (!building.building_pdf && !building.sales_notes) ? '#ccc' : `linear-gradient(135deg, ${C.primary}, #0088B8)`,
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
          <div style={{ background: `linear-gradient(135deg, ${C.primary}, #0088B8)`, padding: '24px 20px', color: '#fff', textAlign: 'center' }}>
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
