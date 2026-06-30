/**
 * 客户端微型搜索引擎 — TF-IDF + 余弦相似度
 * 纯前端实现，零后端依赖，适配 GitHub Pages 静态部署
 */

export interface BuildingData {
  id: string;
  name: string;
  park_name: string;
  region: string;
  city: string;
  total_area: number;
  floor_height: number;
  floor_load: number;
  power_capacity: number;
  rent_min: number;
  rent_max: number;
  industry_tags: string[];
  images: string[];
  is_featured: boolean;
  park_rating: number;
  tenant_count: number;
  amenities: string[];
  latitude: number;
  longitude: number;
}

const DICT = new Set<string>([
  '人工智能','机器学习','深度学习','大模型','芯片设计','算力','数据中心','idc',
  '生物医药','制药','医疗','基因','细胞','疫苗','医疗器械','创新药','cro','cdmo','生物制药','抗体',
  '智能制造','自动化','机器人','精密制造','工业互联网','注塑','冲压','机加工','数控','cnc','产线','装配',
  '集成电路','半导体','芯片','晶圆','封装','光刻','eda','流片',
  '新能源','光伏','储能','锂电池','氢能','充电桩','动力电池','燃料电池','太阳能','风电','电池',
  '新材料','复合材料','纳米材料','石墨烯','高分子','陶瓷','纤维','合金',
  '食品','饮料','冷链','中央厨房','烘焙','预制菜',
  '物流','仓储','分拨','配送','快递','供应链','云仓',
  '行车','天车','吊车','货梯','卸货平台','环评','消防','污水处理','废气处理','蒸汽','天然气',
  '研发','实验室','办公','宿舍','食堂','停车场','gmp','洁净室','防静电','防爆','危化品','除尘','通风',
  '西湖区','余杭区','滨江区','萧山区','大兴区','昌平区','浦东新区','松江区','南山区','光明区','坪山区','南沙区',
  '杭州','北京','上海','深圳','广州','苏州',
  '厂房','园区','产业园','产业','生产','制造','加工','面积','层高','承重','电力','租金','便宜','高端',
  '轻型','重型','中型','大型','标准','定制','出租','租赁','招商',
]);

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const lower = text.toLowerCase();
  while (i < text.length) {
    if (/[a-z]/i.test(text[i])) {
      let j = i;
      while (j < text.length && /[a-z0-9]/i.test(text[j])) j++;
      tokens.push(lower.slice(i, j));
      i = j; continue;
    }
    if (/\d/.test(text[i])) { let j = i; while (j < text.length && /[\d.]/.test(text[j])) j++; i = j; continue; }
    let matched = false;
    for (let len = Math.min(6, text.length - i); len >= 2; len--) {
      const word = text.slice(i, i + len);
      if (DICT.has(word)) { tokens.push(word); i += len; matched = true; break; }
    }
    if (!matched) { const s = text[i]; if (DICT.has(s)) tokens.push(s); i++; }
  }
  return tokens;
}

let buildings: BuildingData[] = [];
let docVectors: { id: string; tf: Map<string, number>; norm: number }[] = [];
let idfMap: Map<string, number> = new Map();

function buildingToText(b: BuildingData): string {
  return [b.name, b.park_name, b.region, b.city, ...(b.industry_tags || []), ...(b.amenities || [])].join(' ');
}

function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  const max = Math.max.apply(null, Array.from(tf.values()).concat([1]));
  tf.forEach((v, k) => tf.set(k, v / max));
  return tf;
}

export function initSearchEngine(data: BuildingData[]): void {
  buildings = data;
  const allTokens: string[][] = [];
  const docFreq = new Map<string, number>();

  for (const b of data) {
    const tokens = tokenize(buildingToText(b));
    allTokens.push(tokens);
    const seen = new Set(tokens);
    seen.forEach(t => docFreq.set(t, (docFreq.get(t) || 0) + 1));
  }

  const N = data.length;
  idfMap = new Map();
  docFreq.forEach((df, term) => idfMap.set(term, Math.log((N + 1) / (df + 1)) + 1));

  docVectors = data.map((b, i) => {
    const tf = computeTF(allTokens[i]);
    const weights = new Map<string, number>();
    let norm = 0;
    tf.forEach((tfVal, term) => {
      const idf = idfMap.get(term) || 1;
      const w = tfVal * idf;
      weights.set(term, w);
      norm += w * w;
    });
    return { id: b.id, tf: weights, norm: Math.sqrt(norm) || 1 };
  });
}

export interface SearchResult {
  building: BuildingData;
  score: number;
  reasons: string[];
}

export function searchBuildings(query: string, filters?: {
  industry?: string; min_area?: number; max_area?: number;
  max_rent?: number; min_height?: number; min_load?: number;
  min_power?: number; region?: string;
}, topK = 10): SearchResult[] {
  if (buildings.length === 0) return [];

  // 1. 结构化过滤
  let candidates = buildings;
  if (filters) {
    candidates = buildings.filter(b => {
      if (filters.industry && !b.industry_tags?.some(t => t.toLowerCase() === filters.industry!.toLowerCase())) return false;
      if (filters.min_area && b.total_area < filters.min_area) return false;
      if (filters.max_area && b.total_area > filters.max_area) return false;
      if (filters.min_height && b.floor_height < filters.min_height) return false;
      if (filters.min_load && b.floor_load < filters.min_load) return false;
      if (filters.min_power && b.power_capacity < filters.min_power) return false;
      if (filters.max_rent && b.rent_min > filters.max_rent * 1.5) return false;
      if (filters.region && b.region !== filters.region && b.city !== filters.region) return false;
      return true;
    });
  }

  // 2. 自动放宽
  if (candidates.length === 0 && filters) {
    candidates = buildings.filter(b => {
      if (filters.industry && !b.industry_tags?.some(t => t.toLowerCase() === filters.industry!.toLowerCase())) return false;
      return true;
    });
  }
  if (candidates.length === 0) candidates = buildings.slice(0, 20);

  // 3. 语义搜索
  const queryTokens = tokenize(query);
  let queryWeights: Map<string, number> | null = null;
  let queryNorm = 1;

  if (queryTokens.length > 0) {
    const queryTF = computeTF(queryTokens);
    const qw = new Map<string, number>();
    queryWeights = qw;
    queryNorm = 0;
    queryTF.forEach((tfVal, term) => {
      const idf = idfMap.get(term) || 1;
      const w = tfVal * idf;
      qw.set(term, w);
      queryNorm += w * w;
    });
    queryNorm = Math.sqrt(queryNorm) || 1;
  }

  // 4. 评分 + 融合
  const results: SearchResult[] = candidates.map(b => {
    let structScore = 0;
    const reasons: string[] = [];
    const f = filters || {};

    if (f.industry && b.industry_tags?.some(t => t.toLowerCase() === f.industry!.toLowerCase())) {
      structScore += 30; reasons.push(`${b.name}产业定位${f.industry}，生态成熟`);
    }
    if (f.min_area && b.total_area >= f.min_area) { structScore += 10; }
    if (f.min_load && b.floor_load >= f.min_load) { structScore += 10; reasons.push(`承重${b.floor_load}T满足要求`); }
    if (f.min_height && b.floor_height >= f.min_height) { structScore += 10; reasons.push(`层高${b.floor_height}m充裕`); }
    if (f.min_power && b.power_capacity >= f.min_power) { structScore += 10; reasons.push(`电力${b.power_capacity}KVA满足`); }
    if (f.max_rent && b.rent_min <= f.max_rent * 1.5) { structScore += 10; reasons.push(`租金${b.rent_min}元在预算范围内`); }
    if (b.is_featured) { structScore += 8; reasons.push('宏创精选房源，平台认证'); }
    if (b.park_rating >= 4.5) { structScore += 7; reasons.push(`园区评分${b.park_rating}，运营口碑优秀`); }
    if (f.region && (b.region === f.region || b.city === f.region)) { structScore += 5; }
    if (b.amenities && b.amenities.length > 5) { structScore += 5; reasons.push('配套完善'); }

    // 语义融合
    let semScore = 0;
    if (queryWeights) {
      const doc = docVectors.find(d => d.id === b.id);
      if (doc) {
        let dot = 0;
        const smaller = queryWeights.size < doc.tf.size ? queryWeights : doc.tf;
        const larger = queryWeights.size < doc.tf.size ? doc.tf : queryWeights;
        smaller.forEach((w, term) => {
          const otherW = larger.get(term);
          if (otherW) dot += w * otherW;
        });
        semScore = dot / (queryNorm * doc.norm);
        if (semScore > 0.3 && reasons.length < 3) reasons.push('与您的描述语义高度匹配');
      }
    }

    const finalScore = Math.round(structScore * 0.7 + semScore * 100 * 0.3);
    return { building: b, score: finalScore, reasons };
  });

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

export function getBuildingById(id: string): BuildingData | undefined {
  return buildings.find(b => b.id === id);
}

export function getAllBuildings(): BuildingData[] {
  return buildings;
}

/**
 * 性价比推荐算法
 * 当多个楼盘地理位置相近且基本参数类似时，推荐综合性价比最高的
 */
export function recommendBestValue(candidates: BuildingData[], topK = 5): { building: BuildingData; score: number; reason: string }[] {
  if (candidates.length === 0) return [];

  const scored = candidates.map(b => {
    let score = 50;
    const reasons: string[] = [];

    // 1. 租金性价比（越低越好，但不能太离谱）
    const rentAvg = (b.rent_min + b.rent_max) / 2;
    if (rentAvg <= 1.0) { score += 15; reasons.push('租金优势明显'); }
    else if (rentAvg <= 1.5) { score += 10; reasons.push('租金合理'); }
    else if (rentAvg <= 2.0) { score += 5; }
    else { score -= 5; }

    // 2. 配套设施完善度
    const amenityCount = (b.amenities || []).length;
    if (amenityCount >= 8) { score += 12; reasons.push(`配套完善(${amenityCount}项)`); }
    else if (amenityCount >= 5) { score += 8; }
    else if (amenityCount >= 3) { score += 4; }

    // 3. 园区评分
    const rating = b.park_rating || 3;
    if (rating >= 4.5) { score += 10; reasons.push(`园区评分${rating}优秀`); }
    else if (rating >= 4.0) { score += 6; }
    else if (rating >= 3.5) { score += 3; }

    // 4. 空间灵活性（面积大可分割）
    if (b.total_area >= 5000) { score += 8; reasons.push('面积大可灵活分割'); }
    else if (b.total_area >= 2000) { score += 4; }

    // 5. 硬件参数（层高/承重/电力综合）
    let hardwareScore = 0;
    if (b.floor_height >= 6) hardwareScore += 3;
    if (b.floor_load >= 3) hardwareScore += 3;
    if (b.power_capacity >= 2000) hardwareScore += 3;
    score += hardwareScore;
    if (hardwareScore === 9) reasons.push('硬件参数全面优秀');

    // 6. 入驻企业数（生态成熟度）
    if (b.tenant_count >= 200) { score += 6; reasons.push(`入驻${b.tenant_count}家，生态成熟`); }
    else if (b.tenant_count >= 100) { score += 3; }

    // 7. 推荐房源加分
    if (b.is_featured) { score += 4; reasons.push('平台精选房源'); }

    score = Math.max(1, Math.min(100, Math.round(score)));
    return { building: b, score, reason: reasons.join('；') || '综合条件均衡' };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * 找到地理位置相近的楼盘并推荐性价比最高的
 */
export function findNearbyBest(b: BuildingData[], target: BuildingData, radius = 20): BuildingData[] {
  const nearby = b.filter(item => {
    if (item.id === target.id) return false;
    const dist = Math.sqrt(
      Math.pow((item.latitude - target.latitude) * 111, 2) +
      Math.pow((item.longitude - target.longitude) * 111, 2)
    );
    return dist <= radius;
  });
  return nearby;
}
