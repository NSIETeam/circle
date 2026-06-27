// Agent需求解析器 v2 — 智能化增强版
// 增强：模糊匹配、上下文推理、多义词消歧、口语化处理、预算单位换算、评分置信度

export interface ParsedRequirement {
  industry?: string;
  min_area?: number;
  max_area?: number;
  max_rent?: number;
  min_height?: number;
  min_load?: number;
  min_power?: number;
  region?: string;
  raw: string;
  confidence: number;        // 解析置信度 0-1
  matchedKeywords: string[]; // 命中的关键词（用于调试/展示）
}

// ===== 行业词典 — 扩展同义词 + 模糊匹配权重 =====
const INDUSTRY_KEYWORDS: Record<string, { words: string[]; weight: number }> = {
  'AI': {
    words: ['ai', '人工智能', '算法', '大模型', '机器学习', '深度学习', '芯片设计', 'gpu', '智算', '算力', 'aigc', 'llm', '生成式', '智能体', 'agent', '数据中心', 'idc'],
    weight: 1.0,
  },
  '生物医药': {
    words: ['生物', '医药', '制药', '医疗', '基因', '细胞', '疫苗', 'gmp', '实验室', '体外诊断', '医疗器械', '药企', '创新药', 'cdo', 'cro', 'cdmo', '生物制药', '抗体', '蛋白质', '核酸'],
    weight: 1.0,
  },
  '智能制造': {
    words: ['智能制造', '自动化', '机器人', '装备', '机械', '汽车零部件', '精密制造', '工业互联网', '3c', '电子制造', '注塑', '冲压', '机加工', '数控', 'cnc', '产线', '装配', '工业机器人'],
    weight: 1.0,
  },
  '集成电路': {
    words: ['集成电路', '半导体', '芯片', '晶圆', '封装', '测试', '光刻', 'eda', 'ip核', '流片', '代工', 'foundry'],
    weight: 1.0,
  },
  '新能源': {
    words: ['新能源', '光伏', '储能', '锂电池', '氢能', '充电桩', '动力电池', '燃料电池', '太阳能', '风电', '电池', '正极材料', '电解液'],
    weight: 1.0,
  },
  '新材料': {
    words: ['新材料', '复合材料', '纳米材料', '石墨烯', '涂层', '高分子', '陶瓷', '纤维', '合金'],
    weight: 1.0,
  },
  '食品': {
    words: ['食品', '饮料', '乳制品', '冷链', '中央厨房', '烘焙', '调味品', '预制菜'],
    weight: 0.9,
  },
  '物流': {
    words: ['物流', '仓储', '冷链物流', '分拨', '配送', '快递', '供应链', '云仓'],
    weight: 0.9,
  },
};

// ===== 区域 + 别名映射 =====
const REGION_MAP: Record<string, string> = {
  '西湖区': '西湖区', '余杭区': '余杭区', '滨江区': '滨江区', '萧山区': '萧山区',
  '临平区': '临平区', '钱塘区': '钱塘区', '富阳区': '富阳区',
  '大兴区': '大兴区', '亦庄': '大兴区', '昌平区': '昌平区', '顺义区': '顺义区',
  '经开区': '经开区', '浦东新区': '浦东新区', '临港': '浦东新区', '张江': '浦东新区',
  '松江区': '松江区', '嘉定区': '嘉定区', '青浦区': '青浦区',
  '南山区': '南山区', '光明区': '光明区', '坪山区': '坪山区',
  '宝安区': '宝安区', '龙华区': '龙华区', '龙岗区': '龙岗区', '南沙区': '南沙区',
  '黄埔区': '黄埔区', '昆山市': '昆山市', '工业园区': '工业园区',
  '虎丘区': '虎丘区', '相城区': '相城区',
};
const CITY_MAP: Record<string, string> = {
  '杭州': '杭州', '北京': '北京', '上海': '上海', '深圳': '深圳', '广州': '广州', '苏州': '苏州',
};

// ===== 面积口语化表达 → 数字 =====
// "一栋楼" → 3000, "一层" → 1500, "半个标准厂房" → 2500
const AREA_SLANG: Record<string, number> = {
  '一栋楼': 3000, '一栋': 3000, '整栋': 5000, '半栋': 2500,
  '一层': 1500, '一层楼': 1500, '两层': 3000, '三层': 4500,
  '一个标准厂房': 2500, '标准厂房': 2500,
  '小厂房': 500, '中型厂房': 2000, '大厂房': 5000, '大型厂房': 8000,
  '车间': 1000, '一个车间': 1000,
  '办公区': 200, '研发中心': 500, '实验室': 300,
};

export function parseRequirement(text: string): ParsedRequirement {
  const lower = text.toLowerCase().trim();
  const req: ParsedRequirement = { raw: text, confidence: 0, matchedKeywords: [] };
  let scoreParts = 0;

  // 1. 行业 — 加权匹配，取最高分
  let bestIndustry: string | undefined;
  let bestIndustryScore = 0;
  for (const [industry, { words, weight }] of Object.entries(INDUSTRY_KEYWORDS)) {
    const hits = words.filter(w => lower.includes(w));
    if (hits.length > 0) {
      const s = hits.length * weight;
      if (s > bestIndustryScore) {
        bestIndustryScore = s;
        bestIndustry = industry;
        req.matchedKeywords.push(...hits);
      }
    }
  }
  if (bestIndustry) { req.industry = bestIndustry; scoreParts++; }

  // 2. 面积 — 多策略
  // 2a. 范围 "2000-5000平米" "2千~5千平" "2000到3000㎡"
  const areaRange = text.match(/(\d+\.?\d*)\s*(?:万|千)?\s*[-~至到～]\s*(\d+\.?\d*)\s*(?:万|千)?\s*(?:平|㎡|平米|平方)/);
  if (areaRange) {
    req.min_area = normalizeAreaNum(areaRange[1], areaRange[0]);
    req.max_area = normalizeAreaNum(areaRange[2], areaRange[0]);
    req.matchedKeywords.push('面积范围');
    scoreParts++;
  } else {
    // 2b. 口语化 "一栋楼" "两层"
    for (const [slang, val] of Object.entries(AREA_SLANG)) {
      if (text.includes(slang)) {
        // 判断是否"至少/以上"
        if (/(?:至少|不低于|不少于|需要|想要|大概)/.test(text.slice(0, text.indexOf(slang)))) {
          req.min_area = val;
        } else {
          req.min_area = val;
        }
        req.matchedKeywords.push(slang);
        scoreParts++;
        break;
      }
    }
    // 2c. 数字+单位
    if (!req.min_area) {
      // 模糊数字 "几千平" "一两千平" "万把平" "两三千平"
      const fuzzyMatch = text.match(/([几一二三四五六七八九十两]\s*千|几万|万把|一两千|两三千|三四千|五六千)\s*(?:平|㎡|平米|平方)/);
      if (fuzzyMatch) {
        const fuzzy = fuzzyMatch[1];
        if (fuzzy.includes('几万') || fuzzy.includes('万把')) req.min_area = 10000;
        else if (fuzzy.includes('两三千')) { req.min_area = 2000; req.max_area = 3000; }
        else if (fuzzy.includes('三四千')) { req.min_area = 3000; req.max_area = 4000; }
        else if (fuzzy.includes('五六千')) { req.min_area = 5000; req.max_area = 6000; }
        else if (fuzzy.includes('几')) { const n = fuzzy.includes('千') ? 1000 : 10000; req.min_area = n; req.max_area = n * 5; }
        else if (fuzzy.match(/\d/)) { const n = parseInt(fuzzy.replace(/\D/g, '')); req.min_area = n * 1000; }
        req.matchedKeywords.push('模糊面积');
        scoreParts++;
      } else {
        const minAreaMatch = text.match(/(?:至少|不低于|不少于|最小|起步|需要|想要|大概|约|要|找)\s*(\d+\.?\d*)\s*(?:万|千)?\s*(?:平|㎡|平米|平方)/);
        const aboveMatch = text.match(/(\d+\.?\d*)\s*(?:万|千)?\s*(?:平|㎡|平米|平方)\s*(?:以上|往上|起步|起)/);
        const plainMatch = text.match(/(\d+\.?\d*)\s*(?:万|千)?\s*(?:平|㎡|平米|平方)/);
        const matched = minAreaMatch || aboveMatch || plainMatch;
        if (matched) {
          req.min_area = normalizeAreaNum(matched[1], matched[0]);
          req.matchedKeywords.push('面积');
          scoreParts++;
        }
      }
    }
  }

  // 3. 承重 — 增加口语化 "放重设备" "重型" "很重"
  const loadMatch = text.match(/(?:承重|地面荷载|楼面荷载|荷载|承重能力)[^\d]*?(\d+\.?\d*)\s*(?:吨|t|T|千牛|kn|KN)/);
  if (loadMatch) {
    req.min_load = parseFloat(loadMatch[1]);
    req.matchedKeywords.push('承重');
    scoreParts++;
  } else {
    const loadAlt = text.match(/(\d+\.?\d*)\s*(?:吨|t|T)\s*(?:承重|荷载)/);
    if (loadAlt) { req.min_load = parseFloat(loadAlt[1]); req.matchedKeywords.push('承重'); scoreParts++; }
    else {
      // 口语化推理
      if (/重型设备|很重|大型机械|冲床|注塑机|压机/.test(text)) { req.min_load = 5; req.matchedKeywords.push('重型设备→5T'); scoreParts += 0.5; }
      else if (/中型设备|普通机械|一般生产/.test(text)) { req.min_load = 3; req.matchedKeywords.push('中型设备→3T'); scoreParts += 0.5; }
      else if (/轻型|电子|组装|包装/.test(text)) { req.min_load = 1; req.matchedKeywords.push('轻型→1T'); scoreParts += 0.5; }
    }
  }

  // 4. 层高 — 增加口语化 "放行车" "大型设备"
  const heightMatch = text.match(/(?:层高|净高|室内净高|高度)[^\d]*?(\d+\.?\d*)\s*(?:米|m|M)/);
  if (heightMatch) {
    req.min_height = parseFloat(heightMatch[1]);
    req.matchedKeywords.push('层高');
    scoreParts++;
  } else {
    const heightAlt = text.match(/(\d+\.?\d*)\s*(?:米|m)\s*(?:层高|净高)/);
    if (heightAlt) { req.min_height = parseFloat(heightAlt[1]); req.matchedKeywords.push('层高'); scoreParts++; }
    else {
      // 口语化推理
      if (/行车|天车|吊车|起重机/.test(text)) { req.min_height = 8; req.matchedKeywords.push('行车→8m'); scoreParts += 0.5; }
      else if (/大型设备|高设备|机床|冲床/.test(text)) { req.min_height = 7; req.matchedKeywords.push('大型设备→7m'); scoreParts += 0.5; }
      else if (/loft|复式|夹层/.test(text.toLowerCase())) { req.min_height = 6; req.matchedKeywords.push('loft→6m'); scoreParts += 0.5; }
    }
  }

  // 5. 电力 — 增加口语化 "高用电" "大功率"
  const powerMatch = text.match(/(?:电力|用电|配电|装机容量|功率|电量|用电量)[^\d]*?(\d+\.?\d*)\s*(?:kva|KVA|kw|KW|千瓦|千伏安)/i);
  if (powerMatch) {
    req.min_power = parseFloat(powerMatch[1]);
    req.matchedKeywords.push('电力');
    scoreParts++;
  } else {
    if (/高用电|大功率|耗电大|双回路|增容/.test(text)) { req.min_power = 2000; req.matchedKeywords.push('高用电→2000KVA'); scoreParts += 0.5; }
    else if (/普通用电|一般用电/.test(text)) { req.min_power = 500; req.matchedKeywords.push('普通用电→500KVA'); scoreParts += 0.5; }
  }

  // 6. 预算 — 增加月租/年租换算 + 口语化
  const rentDayMatch = text.match(/(?:租金|预算|价格|日租|费用|不超过|以内|最高|每天|每平|每平米)[^\d]*?(\d+\.?\d*)\s*(?:元|块)\s*(?:\/|每)?\s*(?:平|㎡|平米|平方)?\s*(?:\/|每)?\s*(?:天|日)/);
  const rentPlainMatch = text.match(/(?:租金|预算|价格|日租|月租|费用|不超过|以内|最高)[^\d]*?(\d+\.?\d*)\s*(?:元|块)/);
  const rentMatch = rentDayMatch || rentPlainMatch;
  if (rentMatch) {
    const val = parseFloat(rentMatch[1]);
    // 如果是月租，换算成日租（月租 ÷ 30 ÷ 面积 → 但这里面积未知，用常见值）
    if (/月租|每月|月租金/.test(text) && val > 10) {
      req.max_rent = Math.round((val / 30 / 1000) * 100) / 100; // 粗略换算
      req.matchedKeywords.push('月租换算');
    } else if (/年租|每年|年租金/.test(text) && val > 100) {
      req.max_rent = Math.round((val / 365 / 1000) * 100) / 100;
      req.matchedKeywords.push('年租换算');
    } else {
      req.max_rent = val;
      req.matchedKeywords.push('预算');
    }
    scoreParts++;
  } else {
    // 口语化预算推理
    if (/便宜|性价比|低价|实惠|省钱/.test(text)) { req.max_rent = 1.2; req.matchedKeywords.push('便宜→≤1.2元'); scoreParts += 0.5; }
    else if (/高端|甲级|高品质|好的/.test(text)) { req.max_rent = 3.0; req.matchedKeywords.push('高端→≤3元'); scoreParts += 0.5; }
  }

  // 7. 区域
  for (const [alias, region] of Object.entries(REGION_MAP)) {
    if (text.includes(alias)) { req.region = region; req.matchedKeywords.push(alias); scoreParts++; break; }
  }
  if (!req.region) {
    for (const [alias, city] of Object.entries(CITY_MAP)) {
      if (text.includes(alias)) { req.region = city; req.matchedKeywords.push(alias); scoreParts += 0.5; break; }
    }
  }

  // 置信度计算
  req.confidence = Math.min(scoreParts / 3, 1); // 3个维度命中即满分

  return req;
}

// 面积数字规范化 — 处理"万""千"单位
function normalizeAreaNum(numStr: string, context: string): number {
  const val = parseFloat(numStr);
  if (context.includes('万')) return val * 10000;
  if (context.includes('千')) return val * 1000;
  // 纯数字≤50，大概率是"万平"的简写
  if (val <= 50) return val * 10000;
  return val;
}

// 生成用户可读的解析摘要
export function summarizeRequirement(req: ParsedRequirement): string {
  const parts: string[] = [];
  if (req.industry) parts.push(`行业：${req.industry}`);
  if (req.min_area && req.max_area) parts.push(`面积：${req.min_area.toLocaleString()}-${req.max_area.toLocaleString()}㎡`);
  else if (req.min_area) parts.push(`面积：≥${req.min_area.toLocaleString()}㎡`);
  if (req.min_load) parts.push(`承重：≥${req.min_load}T`);
  if (req.min_height) parts.push(`层高：≥${req.min_height}m`);
  if (req.min_power) parts.push(`电力：≥${req.min_power}KVA`);
  if (req.max_rent) parts.push(`预算：≤${req.max_rent}元/㎡/天`);
  if (req.region) parts.push(`区域：${req.region}`);
  const confLabel = req.confidence >= 0.8 ? '✓' : req.confidence >= 0.5 ? '≈' : '?';
  return parts.length > 0 ? `${confLabel} 已识别需求 → ${parts.join(' · ')}` : '';
}
