// AI转型成熟度诊断问卷数据
// L1-L5 五阶段，Q1-Q15 共15题，每题 A=1 / B=2 / C=3 / D=4 / E=5，满分75分

export type OptionKey = 'A' | 'B' | 'C' | 'D' | 'E';

export interface QuestionOption {
  key: OptionKey;
  score: number;
  text: string;
}

export interface Question {
  id: number;
  stage: string;        // 所属阶段标签，如 "L1"
  stageName: string;    // 阶段名称，如 "认知探索期"
  title: string;        // 题目
  options: QuestionOption[];
}

export interface StageInfo {
  code: string;         // "L1"
  name: string;         // "认知探索期"
  feature: string;      // 阶段特征
  minScore: number;
  maxScore: number;
  summary: string;      // 简明判断
}

export interface Dimension {
  key: string;          // "战略" / "场景" / "能力" / "平台" / "业务"
  questionIds: number[];// 该维度对应的题目编号
  maxScore: number;     // 15
}

export const STAGES: StageInfo[] = [
  { code: 'L1', name: '认知探索期', minScore: 15, maxScore: 25,
    feature: '老板有意识，员工试用工具，没有方向',
    summary: '你的公司刚开始意识到AI的重要性' },
  { code: 'L2', name: '试点验证期', minScore: 26, maxScore: 40,
    feature: '选中场景跑MVP，验证AI能不能为我所用',
    summary: '你的公司在试点AI，但还未形成体系' },
  { code: 'L3', name: '流程嵌入期', minScore: 41, maxScore: 55,
    feature: 'AI进入核心业务流程，成为日常工作方式',
    summary: '你的公司AI已进入核心业务流程' },
  { code: 'L4', name: '规模扩展期', minScore: 56, maxScore: 67,
    feature: '跨部门规模化，组织能力沉淀，AI工厂成型',
    summary: '你的公司已具备AI规模化能力' },
  { code: 'L5', name: '业务重塑期', minScore: 68, maxScore: 75,
    feature: '业务模式被重新定义，AI产生新增长曲线',
    summary: '你的公司是AI Native标杆' },
];

export const DIMENSIONS: Dimension[] = [
  { key: '战略', questionIds: [1, 2, 3], maxScore: 15 },
  { key: '场景', questionIds: [4, 5, 6], maxScore: 15 },
  { key: '能力', questionIds: [7, 8, 9], maxScore: 15 },
  { key: '平台', questionIds: [10, 11, 12], maxScore: 15 },
  { key: '业务', questionIds: [13, 14, 15], maxScore: 15 },
];

export const QUESTIONS: Question[] = [
  // ===== L1 认知探索期 · 自检 =====
  {
    id: 1, stage: 'L1', stageName: '认知探索期',
    title: '公司一把手对AI转型的态度？',
    options: [
      { key: 'A', score: 1, text: '还没进入议事日程' },
      { key: 'B', score: 2, text: '高层关注，但还没形成共识' },
      { key: 'C', score: 3, text: '一把手公开表态支持，正在思考路径' },
      { key: 'D', score: 4, text: '一把手亲自牵头，有专项例会' },
      { key: 'E', score: 5, text: 'AI已是公司战略核心，每月有专项进展汇报' },
    ],
  },
  {
    id: 2, stage: 'L1', stageName: '认知探索期',
    title: '公司目前AI使用的最常见场景是？',
    options: [
      { key: 'A', score: 1, text: '几乎没有人在用' },
      { key: 'B', score: 2, text: '个别员工用ChatGPT/Claude等工具写文档、查资料' },
      { key: 'C', score: 3, text: '多个部门员工日常使用AI辅助工作' },
      { key: 'D', score: 4, text: 'AI已进入核心业务流程，员工依赖度高' },
      { key: 'E', score: 5, text: 'AI已重塑工作方式，没有AI业务停转' },
    ],
  },
  {
    id: 3, stage: 'L1', stageName: '认知探索期',
    title: '公司内部对"AI能为我们做什么"的共识程度？',
    options: [
      { key: 'A', score: 1, text: '完全没讨论过' },
      { key: 'B', score: 2, text: '有讨论，但说法不一' },
      { key: 'C', score: 3, text: '已有初步方向，但缺落地路径' },
      { key: 'D', score: 4, text: '已形成清晰的AI战略路径' },
      { key: 'E', score: 5, text: 'AI转型已写入公司年度核心目标' },
    ],
  },
  // ===== L2 试点验证期 · 自检 =====
  {
    id: 4, stage: 'L2', stageName: '试点验证期',
    title: '公司是否有正在跑通的AI落地项目？',
    options: [
      { key: 'A', score: 1, text: '没有，还在调研阶段' },
      { key: 'B', score: 2, text: '有1-2个尝试性的项目，但效果不明确' },
      { key: 'C', score: 3, text: '有3-5个明确的AI项目正在推进' },
      { key: 'D', score: 4, text: '有10+个AI项目在多个部门同步推进' },
      { key: 'E', score: 5, text: 'AI项目已成为常规工作机制' },
    ],
  },
  {
    id: 5, stage: 'L2', stageName: '试点验证期',
    title: '公司是否有专人/团队负责AI落地？',
    options: [
      { key: 'A', score: 1, text: '没有专人负责' },
      { key: 'B', score: 2, text: '有人兼职推进，无独立团队' },
      { key: 'C', score: 3, text: '有专职AI转型负责人' },
      { key: 'D', score: 4, text: '有跨部门AI转型小组' },
      { key: 'E', score: 5, text: '有专门的AI变革委员会，由一把手直管' },
    ],
  },
  {
    id: 6, stage: 'L2', stageName: '试点验证期',
    title: 'AI项目的ROI（投入产出）能不能讲清楚？',
    options: [
      { key: 'A', score: 1, text: '没人算ROI' },
      { key: 'B', score: 2, text: '想算但缺数据，凭感觉' },
      { key: 'C', score: 3, text: '个别项目能讲清ROI' },
      { key: 'D', score: 4, text: '主要AI项目都有ROI追踪' },
      { key: 'E', score: 5, text: 'AI对业务核心指标的贡献已可量化' },
    ],
  },
  // ===== L3 流程嵌入期 · 自检 =====
  {
    id: 7, stage: 'L3', stageName: '流程嵌入期',
    title: 'AI在公司核心业务流程中的渗透程度？',
    options: [
      { key: 'A', score: 1, text: '还没进入业务流程' },
      { key: 'B', score: 2, text: '仅用于个人效率工具（写文档、查资料）' },
      { key: 'C', score: 3, text: '已进入营销/客服/HR等支持职能' },
      { key: 'D', score: 4, text: '已进入研发/销售/产品等核心业务' },
      { key: 'E', score: 5, text: '公司端到端业务流程都有AI参与' },
    ],
  },
  {
    id: 8, stage: 'L3', stageName: '流程嵌入期',
    title: '公司员工的AI使用普及度？',
    options: [
      { key: 'A', score: 1, text: '不到20%员工日常用AI' },
      { key: 'B', score: 2, text: '20-40%员工偶尔用AI' },
      { key: 'C', score: 3, text: '40-60%员工日常用AI' },
      { key: 'D', score: 4, text: '60-80%员工深度使用AI' },
      { key: 'E', score: 5, text: '80%以上员工把AI作为工作必备工具' },
    ],
  },
  {
    id: 9, stage: 'L3', stageName: '流程嵌入期',
    title: '公司有没有AI使用的统一规范和方法？',
    options: [
      { key: 'A', score: 1, text: '完全没有，员工各自摸索' },
      { key: 'B', score: 2, text: '个别部门有内部规范' },
      { key: 'C', score: 3, text: '有公司级AI使用指南' },
      { key: 'D', score: 4, text: '有完整的AI协作方法论文档' },
      { key: 'E', score: 5, text: 'AI使用规范已纳入员工培训和考核' },
    ],
  },
  // ===== L4 规模扩展期 · 自检 =====
  {
    id: 10, stage: 'L4', stageName: '规模扩展期',
    title: '公司有没有统一的AI能力平台或工具体系？',
    options: [
      { key: 'A', score: 1, text: '没有，各部门自己用各自工具' },
      { key: 'B', score: 2, text: '有零散工具，没有整合' },
      { key: 'C', score: 3, text: '主要业务部门用同一套AI工具' },
      { key: 'D', score: 4, text: '有公司级AI能力平台，跨部门复用' },
      { key: 'E', score: 5, text: '有完整AI工程体系（含模型管理、工作流编排等）' },
    ],
  },
  {
    id: 11, stage: 'L4', stageName: '规模扩展期',
    title: 'AI项目从"跑通1个"到"复制10个"需要多久？',
    options: [
      { key: 'A', score: 1, text: '第1个还没跑通' },
      { key: 'B', score: 2, text: '第1个跑通了，复制不动' },
      { key: 'C', score: 3, text: '能复制，但需要1-2年' },
      { key: 'D', score: 4, text: '能在3-6个月内复制到新部门' },
      { key: 'E', score: 5, text: '已有标准化复制机制，新场景快速上线' },
    ],
  },
  {
    id: 12, stage: 'L4', stageName: '规模扩展期',
    title: '公司每年在AI转型上的投入（人力+资金）？',
    options: [
      { key: 'A', score: 1, text: '没有专项投入' },
      { key: 'B', score: 2, text: '50万以下' },
      { key: 'C', score: 3, text: '50-300万' },
      { key: 'D', score: 4, text: '300-1000万' },
      { key: 'E', score: 5, text: '1000万以上，且有持续追加预算' },
    ],
  },
  // ===== L5 业务重塑期 · 自检 =====
  {
    id: 13, stage: 'L5', stageName: '业务重塑期',
    title: 'AI是否已为公司带来新的业务模式或收入来源？',
    options: [
      { key: 'A', score: 1, text: '还看不到' },
      { key: 'B', score: 2, text: '在内部提效有体现，对外没有' },
      { key: 'C', score: 3, text: '部分客户能感知到AI能力' },
      { key: 'D', score: 4, text: 'AI能力已是对外卖点' },
      { key: 'E', score: 5, text: '已有AI原生产品/服务，产生独立收入' },
    ],
  },
  {
    id: 14, stage: 'L5', stageName: '业务重塑期',
    title: 'AI是否成为公司的核心竞争力？',
    options: [
      { key: 'A', score: 1, text: '还没到这个层面' },
      { key: 'B', score: 2, text: 'AI是辅助工具，不是核心' },
      { key: 'C', score: 3, text: 'AI在某些业务环节是关键能力' },
      { key: 'D', score: 4, text: 'AI是公司主要差异化竞争力之一' },
      { key: 'E', score: 5, text: 'AI是公司护城河，难以被竞争对手复制' },
    ],
  },
  {
    id: 15, stage: 'L5', stageName: '业务重塑期',
    title: '公司是否在向行业输出AI转型经验？',
    options: [
      { key: 'A', score: 1, text: '自己还在摸索' },
      { key: 'B', score: 2, text: '内部刚开始沉淀' },
      { key: 'C', score: 3, text: '有内部方法论文档' },
      { key: 'D', score: 4, text: '已对外做过分享/案例发布' },
      { key: 'E', score: 5, text: 'AI转型经验已成为对外服务/培训产品' },
    ],
  },
];

// 维度对应的阶段颜色
export const DIMENSION_COLORS: Record<string, string> = {
  '战略': '#1A56DB',
  '场景': '#047857',
  '能力': '#7C3AED',
  '平台': '#D97706',
  '业务': '#DC2626',
};

// 计算阶段
export function getStage(totalScore: number): StageInfo {
  return STAGES.find(s => totalScore >= s.minScore && totalScore <= s.maxScore) || STAGES[0];
}

// 计算维度得分
export function getDimensionScores(answers: Record<number, number>): { dim: Dimension; score: number }[] {
  return DIMENSIONS.map(dim => {
    const score = dim.questionIds.reduce((sum, qid) => sum + (answers[qid] || 0), 0);
    return { dim, score };
  });
}

// 维度等级（基于该维度满分15分的占比）
export function getDimensionLevel(score: number): { label: string; color: string } {
  const pct = score / 15;
  if (pct >= 0.9) return { label: '行业标杆', color: '#059669' };
  if (pct >= 0.7) return { label: '优势', color: '#047857' };
  if (pct >= 0.5) return { label: '中等', color: '#D97706' };
  if (pct >= 0.3) return { label: '待提升', color: '#F59E0B' };
  return { label: '短板', color: '#DC2626' };
}
