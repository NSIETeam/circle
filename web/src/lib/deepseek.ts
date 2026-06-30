/**
 * DeepSeek API 统一接入层
 * 用于信息提取、内容理解、智能问答
 */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 从环境变量读取API Key，回退到localStorage
function getApiKey(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('deepseek_api_key') || '';
  }
  return process.env.DEEPSEEK_API_KEY || '';
}

export function setApiKey(key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('deepseek_api_key', key);
  }
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0;
}

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 调用DeepSeek API
 */
export async function callDeepSeek(
  messages: DeepSeekMessage[],
  options?: { temperature?: number; max_tokens?: number; model?: string }
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    // 无API Key时使用本地规则降级
    return localFallback(messages);
  }

  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || 'deepseek-chat',
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.max_tokens ?? 1000,
      }),
    });

    if (!res.ok) {
      throw new Error(`DeepSeek API error: ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (err) {
    return localFallback(messages);
  }
}

/**
 * 信息提取 — 从文本中提取结构化选址需求
 */
export async function extractRequirement(text: string): Promise<{
  industry?: string;
  area?: number;
  load?: number;
  height?: number;
  power?: number;
  rent?: number;
  region?: string;
  space_type?: string;
  special?: string[];
}> {
  const result = await callDeepSeek([
    { role: 'system', content: '你是厂房选址需求解析助手。从用户输入中提取结构化需求，返回JSON格式。字段：industry(产业),area(面积㎡),load(承重T),height(层高m),power(电力KVA),rent(预算元/㎡/天),region(区域),space_type(空间类型),special(特殊需求数组,如注册地/洁净室/排污)。只返回JSON，不要解释。' },
    { role: 'user', content: text },
  ], { temperature: 0, max_tokens: 300 });

  try {
    return JSON.parse(result);
  } catch {
    return {};
  }
}

/**
 * 内容审核 — 判断内容是否合规
 */
export async function moderateContentAI(text: string): Promise<{
  safe: boolean;
  risk: 'low' | 'medium' | 'high';
  reason?: string;
}> {
  const result = await callDeepSeek([
    { role: 'system', content: '你是内容审核助手。判断内容是否包含敏感信息(政治/色情/暴力/广告/虚假)。返回JSON：{safe:boolean,risk:"low"|"medium"|"high",reason:string}。只返回JSON。' },
    { role: 'user', content: text },
  ], { temperature: 0, max_tokens: 200 });

  try {
    return JSON.parse(result);
  } catch {
    return { safe: true, risk: 'low' };
  }
}

/**
 * 智能问答 — 销售客服自动回复
 */
export async function salesReply(question: string, building: any): Promise<string> {
  const buildingInfo = `房源：${building.name}，${building.region}，${building.total_area}㎡，层高${building.floor_height}m，承重${building.floor_load}T，电力${building.power_capacity}KVA，租金${building.rent_min}-${building.rent_max}元/㎡/天，配套：${(building.amenities || []).join('、')}`;

  const result = await callDeepSeek([
    { role: 'system', content: '你是产业园招商顾问。根据房源信息回答客户问题。简洁专业，不超过100字。' },
    { role: 'user', content: `房源信息：${buildingInfo}\n客户问题：${question}` },
  ], { temperature: 0.5, max_tokens: 200 });

  return result;
}

/**
 * 性价比分析 — 对比多个相似楼盘
 */
export async function analyzeValue(buildings: any[], userReq?: any): Promise<{
  best: string;
  reason: string;
  scores: { id: string; score: number; reason: string }[];
}> {
  if (buildings.length === 0) {
    return { best: '', reason: '无候选楼盘', scores: [] };
  }

  const buildingList = buildings.map(b => ({
    id: b.id, name: b.name, area: b.total_area, rent: b.rent_min,
    height: b.floor_height, load: b.floor_load, power: b.power_capacity,
    amenities: (b.amenities || []).length, rating: b.park_rating,
  }));

  const result = await callDeepSeek([
    { role: 'system', content: '你是产业园选址分析师。对比多个楼盘的性价比，考虑租金、面积、层高、承重、电力、配套数量、园区评分。返回JSON：{best:"楼盘id",reason:"推荐理由",scores:[{id,score(0-100),reason}]}。只返回JSON。' },
    { role: 'user', content: `候选楼盘：${JSON.stringify(buildingList)}\n用户需求：${JSON.stringify(userReq || {})}` },
  ], { temperature: 0.2, max_tokens: 500 });

  try {
    return JSON.parse(result);
  } catch {
    // 降级：用本地算法
    return localValueAnalysis(buildings);
  }
}

// ===== 本地降级算法 =====
function localFallback(messages: DeepSeekMessage[]): string {
  const last = messages[messages.length - 1];
  if (last?.role === 'user') {
    return JSON.stringify({ error: 'DeepSeek API未配置，使用本地规则', text: last.content });
  }
  return '';
}

function localValueAnalysis(buildings: any[]): {
  best: string; reason: string; scores: { id: string; score: number; reason: string }[];
} {
  const scored = buildings.map(b => {
    let score = 50;
    // 租金越低分越高（租金/10为扣分）
    score -= Math.min(b.rent_min * 10, 30);
    // 配套越多分越高
    score += Math.min((b.amenities || []).length * 3, 15);
    // 评分越高分越高
    score += (b.park_rating || 3) * 3;
    // 面积越大灵活性越高
    score += Math.min(b.total_area / 1000, 10);
    return { id: b.id, score: Math.round(score), reason: `租金${b.rent_min}元，配套${(b.amenities || []).length}项，评分${b.park_rating || 3}` };
  });
  scored.sort((a, b) => b.score - a.score);
  return {
    best: scored[0]?.id || '',
    reason: scored[0] ? `综合性价比最高：${scored[0].reason}` : '',
    scores: scored,
  };
}
