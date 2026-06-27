/**
 * 园圈推荐引擎 V4 — 极致轻量
 *
 * 核心设计: 全量房源快照 + 行为统计打包成一个 Redis Key
 *   读路径: 1次 Redis GET → 内存过滤+评分 → 返回   (零SQL, 零Pipeline)
 *   写路径: 房源/行为变更 → 增量更新快照内对应条目
 *
 * 存储: 1000房源 × ~250B/条 ≈ 250KB 单Key (MsgPack压缩后 ~80KB)
 *        结果缓存 ~2KB/查询 × 100查询 ≈ 200KB
 *        总计 < 0.5MB Redis
 *
 * 计算: 内存过滤+评分 O(N) 但 N≤1000, 单次 <1ms
 */

import { redis, query } from '../db';
import { buildIndex, semanticSearch, getVocabSize } from './semantic-search';

// ============================================================
// 类型
// ============================================================

export interface BuildingForMatch {
  id: string; name: string; park_id: string; park_name?: string;
  total_area: number; floor_height: number; floor_load: number; power_capacity: number;
  rent_min: number; rent_max: number;
  industry_tags: string[]; region: string; city: string;
  is_featured: boolean; park_rating: number; tenant_count: number;
  amenities: string[]; created_at: string; images?: string[];
  // 内嵌行为统计（不再单独存）
  v_views: number; v_favs: number; v_consults: number; v_deals: number;
}

export interface ClientRequirement {
  industry?: string; min_area?: number; max_area?: number; max_rent?: number;
  min_height?: number; min_load?: number; min_power?: number;
  region?: string; city?: string;
}

export interface MatchResult {
  building: Omit<BuildingForMatch, 'v_views' | 'v_favs' | 'v_consults' | 'v_deals'>;
  score: number; details: Record<string, number>; reasons: string[];
}

// ============================================================
// Redis Key
// ============================================================

const SNAPSHOT_KEY = 'snap:buildings';    // 全量房源快照 JSON
const RESULT_KEY = (h: string) => `rc:${h}`;  // 结果缓存
const SNAPSHOT_TTL = 600;   // 快照10分钟自动过期（兜底）
const RESULT_TTL = 300;     // 结果5分钟
const SNAPSHOT_LOCK = 'snap:lock';  // 防并发重建

// ============================================================
// 产业权重画像（纯内存常量）
// ============================================================

interface WProfile { industry: number; area: number; budget: number; height: number; load: number; power: number; geo: number; amenity: number; }

const PROFILES: Record<string, WProfile> = {
  '生物医药': { industry: .15, area: .10, budget: .10, height: .05, load: .15, power: .20, geo: .10, amenity: .15 },
  '智能制造': { industry: .15, area: .10, budget: .10, height: .20, load: .20, power: .15, geo: .05, amenity: .05 },
  'AI':       { industry: .15, area: .20, budget: .25, height: .05, load: .05, power: .05, geo: .10, amenity: .15 },
  '软件':     { industry: .15, area: .20, budget: .25, height: .05, load: .05, power: .05, geo: .10, amenity: .15 },
  '_default': { industry: .20, area: .15, budget: .20, height: .10, load: .10, power: .10, geo: .10, amenity: .05 },
};

const AMENITY_NEEDS: Record<string, { req?: string[]; pref?: string[] }> = {
  '生物医药': { req: ['污水处理'], pref: ['实验室', 'GMP', '危化品'] },
  '智能制造': { pref: ['卸货平台', '叉车', '行车', '高标仓'] },
  'AI':       { pref: ['食堂', '班车', '宿舍', '双回路'] },
  '软件':     { pref: ['食堂', '班车', '宿舍', '商业'] },
};

// ============================================================
// 1. 快照管理 — 全量房源打包成1个Redis Key
// ============================================================

async function buildSnapshot(): Promise<BuildingForMatch[]> {
  const result = await query(
    `SELECT b.id, b.name, b.park_id, b.total_area, b.floor_height, b.floor_load,
            b.power_capacity, b.rent_min, b.rent_max, b.industry_tags,
            b.region, b.city, b.is_featured, b.amenities, b.created_at, b.images,
            p.name as park_name, p.rating as park_rating, p.tenant_count,
            COALESCE(bh.views, 0) as v_views,
            COALESCE(bh.favs, 0) as v_favs,
            COALESCE(bh.consults, 0) as v_consults,
            COALESCE(bh.deals, 0) as v_deals
     FROM buildings b
     LEFT JOIN parks p ON b.park_id = p.id
     LEFT JOIN (
       SELECT target_id,
         SUM(CASE WHEN action='view_building' THEN 1 ELSE 0 END) as views,
         SUM(CASE WHEN action='favorite' THEN 1 ELSE 0 END) as favs,
         SUM(CASE WHEN action='consult' THEN 1 ELSE 0 END) as consults,
         SUM(CASE WHEN action='deal' THEN 1 ELSE 0 END) as deals
       FROM activity_logs WHERE target_type='building' GROUP BY target_id
     ) bh ON bh.target_id::uuid = b.id
     WHERE b.status = 'active'`,
  );

  return result.rows.map((r: any) => ({
    ...r,
    total_area: Number(r.total_area), floor_height: Number(r.floor_height),
    floor_load: Number(r.floor_load), power_capacity: Number(r.power_capacity),
    rent_min: Number(r.rent_min), rent_max: Number(r.rent_max),
    park_rating: Number(r.park_rating) || 0, tenant_count: Number(r.tenant_count) || 0,
    v_views: Number(r.v_views) || 0, v_favs: Number(r.v_favs) || 0,
    v_consults: Number(r.v_consults) || 0, v_deals: Number(r.v_deals) || 0,
  }));
}

async function getSnapshot(): Promise<BuildingForMatch[]> {
  // 1. 尝试读快照
  const raw = await redis.get(SNAPSHOT_KEY);
  if (raw) {
    try { return JSON.parse(raw) as BuildingForMatch[]; } catch { /* fallthrough */ }
  }

  // 2. 快照不存在，加锁重建（防并发）
  const lock = await redis.set(SNAPSHOT_LOCK, '1', 'EX', 30, 'NX');
  if (!lock) {
    // 其他进程在重建，等50ms重试
    await sleep(50);
    const retry = await redis.get(SNAPSHOT_KEY);
    if (retry) return JSON.parse(retry) as BuildingForMatch[];
    // 仍然没有，直接查DB
    return buildSnapshot();
  }

  // 3. 查DB + 写快照
  const buildings = await buildSnapshot();
  await redis.setex(SNAPSHOT_KEY, SNAPSHOT_TTL, JSON.stringify(buildings));
  // 构建语义搜索索引
  buildIndex(buildings);
  await redis.del(SNAPSHOT_LOCK);
  return buildings;
}

// ============================================================
// 2. 增量更新 — 不重建全量快照
// ============================================================

/** 房源变更时：重建快照（低频操作） */
export async function invalidateSnapshot(): Promise<void> {
  await redis.del(SNAPSHOT_KEY);
  // 清除结果缓存
  const keys = await redis.keys('rc:*');
  if (keys.length > 0) await redis.del(...keys);
}

/** 行为变更时：直接修改快照内对应字段（高频操作） */
export async function incrBehavior(buildingId: string, action: string): Promise<void> {
  const field = action === 'view_building' ? 'v_views'
    : action === 'favorite' ? 'v_favs'
    : action === 'consult' ? 'v_consults'
    : action === 'deal' ? 'v_deals' : null;
  if (!field) return;

  const raw = await redis.get(SNAPSHOT_KEY);
  if (!raw) return; // 快照不存在时下次重建会带上

  const buildings = JSON.parse(raw) as BuildingForMatch[];
  const b = buildings.find(b => b.id === buildingId);
  if (b) {
    (b as any)[field] = ((b as any)[field] || 0) + 1;
    await redis.setex(SNAPSHOT_KEY, SNAPSHOT_TTL, JSON.stringify(buildings));
  }
}

// ============================================================
// 3. 内存硬过滤（从快照中筛候选集）
// ============================================================

function filterSnapshot(buildings: BuildingForMatch[], req: ClientRequirement): BuildingForMatch[] {
  return buildings.filter(b => {
    if (req.min_area && b.total_area < req.min_area) return false;
    if (req.min_height && b.floor_height < req.min_height) return false;
    if (req.min_load && b.floor_load < req.min_load) return false;
    if (req.min_power && b.power_capacity < req.min_power) return false;
    // 预算：允许 rent_min 超出预算50%以内（可议价空间）
    if (req.max_rent && b.rent_min > req.max_rent * 1.5) return false;
    if (req.region && b.region !== req.region) return false;
    return true;
  });
}

// ============================================================
// 4. 内存评分 — 纯计算
// ============================================================

function scoreOne(b: BuildingForMatch, req: ClientRequirement): MatchResult {
  const reasons: string[] = [];
  const details: Record<string, number> = {};
  const w = PROFILES[req.industry || ''] || PROFILES['_default'];
  let s = 0;

  // 产业匹配
  let indScore = 0.3;
  if (req.industry && b.industry_tags?.length) {
    const ri = req.industry.toLowerCase();
    const tags = b.industry_tags.map(t => t.toLowerCase());
    if (tags.includes(ri)) { indScore = 1.0; reasons.push(`${b.name}产业定位${req.industry}，生态成熟`); }
    else if (tags.some(t => t.includes(ri) || ri.includes(t))) { indScore = 0.6; reasons.push(`园区方向与${req.industry}相关，可兼容`); }
    else indScore = 0.2;
  }
  details.industry = indScore; s += indScore * w.industry;

  // 面积
  let aScore = 0.3;
  if (req.min_area && req.max_area && req.max_area > req.min_area) {
    if (b.total_area >= req.min_area && b.total_area <= req.max_area) { aScore = 1.0; reasons.push(`面积${b.total_area.toLocaleString()}㎡完全满足需求`); }
    else if (b.total_area > req.max_area) aScore = Math.max(0.4, 1.0 - (b.total_area - req.max_area) / req.max_area * 0.5);
    else aScore = Math.max(0, 1 - (req.min_area - b.total_area) / req.min_area);
  }
  details.area = r2(aScore); s += aScore * w.area;

  // 预算（价值导向）
  let bScore = 0.3;
  if (req.max_rent && req.max_rent > 0) {
    if (b.rent_max <= req.max_rent) {
      const ratio = b.rent_max / req.max_rent;
      if (ratio >= 0.6 && ratio <= 0.95) { bScore = 1.0; reasons.push(`租金${b.rent_min}-${b.rent_max}在预算内，性价比合理`); }
      else if (ratio < 0.6) { bScore = 0.75; reasons.push('租金远低于预算，建议核实房源状况'); }
      else bScore = 0.9;
    } else if (b.rent_min <= req.max_rent) { bScore = 0.6; reasons.push(`租金${b.rent_min}起，上限略超预算可议价`); }
    else bScore = Math.max(0, 1 - (b.rent_min - req.max_rent) / req.max_rent);
  }
  details.budget = r2(bScore); s += bScore * w.budget;

  // 层高
  let hScore = 0.3;
  if (req.min_height && req.min_height > 0) {
    if (b.floor_height >= req.min_height) { hScore = 1.0; if (b.floor_height >= req.min_height * 1.3 && b.floor_height >= 7) reasons.push(`层高${b.floor_height}m充裕，适合设备安装或夹层改造`); }
    else hScore = Math.max(0, 1 - (req.min_height - b.floor_height) / req.min_height);
  }
  details.height = r2(hScore); s += hScore * w.height;

  // 承重
  let lScore = 0.3;
  if (req.min_load && req.min_load > 0) {
    if (b.floor_load >= req.min_load) { lScore = 1.0; if (b.floor_load >= req.min_load * 1.5) reasons.push(`承重${b.floor_load}T远超需求，适合重型设备`); }
    else lScore = Math.max(0, 1 - (req.min_load - b.floor_load) / req.min_load);
  }
  details.load = r2(lScore); s += lScore * w.load;

  // 电力
  let pScore = 0.3;
  if (req.min_power && req.min_power > 0) {
    if (b.power_capacity >= req.min_power) { pScore = 1.0; if (b.power_capacity >= req.min_power * 2) reasons.push(`电力${b.power_capacity}KVA充裕，满足扩产需求`); }
    else pScore = Math.max(0, 1 - (req.min_power - b.power_capacity) / req.min_power);
  }
  details.power = r2(pScore); s += pScore * w.power;

  // 地理
  let gScore = 0.3;
  if (req.region && b.region) {
    if (b.region === req.region) gScore = 1.0;
    else if (req.city && b.city === req.city) gScore = 0.6;
    else gScore = 0.2;
  }
  details.geo = r2(gScore); s += gScore * w.geo;

  // 配套
  let amScore = 0.5;
  const needs = req.industry ? AMENITY_NEEDS[req.industry] : null;
  if (needs && b.amenities?.length) {
    const ba = b.amenities.map(a => a.toLowerCase());
    if (needs.req) {
      for (const r of needs.req) {
        if (!ba.some(a => a.includes(r.toLowerCase()) || r.toLowerCase().includes(a))) { amScore = 0.1; reasons.push(`缺少${r}等关键配套，需评估改造成本`); }
      }
    }
    if (amScore > 0.1 && needs.pref) {
      const matched = needs.pref.filter(p => ba.some(a => a.includes(p.toLowerCase()) || p.toLowerCase().includes(a)));
      amScore = 0.4 + (matched.length / needs.pref.length) * 0.6;
      if (matched.length >= 2) reasons.push(`配套完善：${matched.join('、')}等齐全`);
    }
  }
  details.amenity = r2(amScore); s += amScore * w.amenity;

  // ===== 增益 =====
  let mod = 0;
  if (b.is_featured) { mod += 3; reasons.push('宏创精选房源，平台认证'); }
  if (b.park_rating >= 4.5) { mod += 3; reasons.push(`园区评分${b.park_rating}，运营口碑优秀`); }
  else if (b.park_rating >= 4.0) mod += 1.5;
  else if (b.park_rating > 0 && b.park_rating < 3.5) mod -= 2;
  if (b.tenant_count >= 50) { mod += 2; reasons.push(`已入驻${b.tenant_count}家企业，产业生态成熟`); }
  else if (b.tenant_count >= 20) mod += 1;
  else if (b.tenant_count > 0 && b.tenant_count < 5) mod -= 1;

  // 反马太：新房源保护
  if (b.created_at) {
    const ageDays = (Date.now() - new Date(b.created_at).getTime()) / 86400000;
    if (ageDays <= 7) { mod += 4; reasons.push('新上架房源，抢先带看'); }
    else if (ageDays <= 30) mod += 2;
  }

  // 行为热度（对数衰减，防马太）
  const heat = b.v_views + b.v_favs * 3 + b.v_consults * 5;
  if (heat > 0) mod += Math.min(3, Math.log10(heat + 1) * 2);
  if (b.v_deals > 0) reasons.push(`已有${b.v_deals}笔成交记录`);

  const final = Math.max(0, Math.min(100, Math.round(s * 100 + mod)));

  // 剥离内部行为字段
  const { v_views, v_favs, v_consults, v_deals, ...publicBuilding } = b;

  return { building: publicBuilding as any, score: final, details, reasons: reasons.slice(0, 4) };
}

// ============================================================
// 5. 主入口 — 1次Redis GET → 内存过滤+评分 → 返回
// ============================================================

export async function recommend(
  req: ClientRequirement,
  topK = 10,
  rawText?: string,
): Promise<{ results: MatchResult[]; total: number; cached: boolean }> {
  // 5a. 结果缓存
  const hash = hashReq(req);
  const cached = await redis.get(RESULT_KEY(hash));
  if (cached) {
    try { return { ...JSON.parse(cached), cached: true }; } catch { /* fallthrough */ }
  }

  // 5b. 读全量快照（1次 Redis GET）
  const all = await getSnapshot();

  // 5c. 语义搜索 — 如果有原始文本，计算语义相似度
  let semanticScores: Map<string, number> | null = null;
  if (rawText && rawText.trim().length > 2) {
    const semResults = semanticSearch(rawText, all.length);
    if (semResults.length > 0) {
      semanticScores = new Map(semResults.map(s => [s.buildingId, s.score]));
    }
  }

  // 5d. 内存硬过滤
  let candidates = filterSnapshot(all, req);

  // 5e. 无结果时自动逐级放宽条件
  if (candidates.length === 0) {
    const relaxed1 = { ...req, region: undefined };
    candidates = filterSnapshot(all, relaxed1);
  }
  if (candidates.length === 0) {
    const relaxed2 = { ...req, region: undefined, max_rent: undefined };
    candidates = filterSnapshot(all, relaxed2);
  }
  if (candidates.length === 0) {
    if (req.industry) {
      candidates = all.filter(b => b.industry_tags?.some(t => t.toLowerCase() === req.industry!.toLowerCase()));
    }
  }
  if (candidates.length === 0) {
    // 语义搜索兜底
    if (semanticScores && semanticScores.size > 0) {
      candidates = all.filter(b => semanticScores.has(b.id));
    }
  }
  if (candidates.length === 0) {
    candidates = all.slice(0, 20);
  }

  // 5f. 内存评分排序 + 语义融合
  const scored = candidates.map(b => {
    const result = scoreOne(b, req);
    // 语义融合：加权 30% 语义分 + 70% 结构化分
    if (semanticScores) {
      const semScore = semanticScores.get(b.id) || 0;
      result.score = Math.round(result.score * 0.7 + semScore * 100 * 0.3);
      if (semScore > 0.3 && result.reasons.length < 3) {
        result.reasons.push('与您的描述语义高度匹配');
      }
    }
    return result;
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topK);

  // 5g. 写结果缓存
  const cacheData = { results: top, total: scored.length };
  await redis.setex(RESULT_KEY(hash), RESULT_TTL, JSON.stringify(cacheData));

  return { ...cacheData, cached: false };
}

// ============================================================
// 工具
// ============================================================

function r2(n: number): number { return Math.round(n * 100) / 100; }

function hashReq(req: ClientRequirement): string {
  const str = JSON.stringify(req, Object.keys(req).sort());
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }
