// 内容审核Agent — 第一层自动审核
// 敏感词/联系方式/广告/虚假信息检测

// 敏感词库
const SENSITIVE_WORDS = [
  // 政治
  '法轮功', '六四', '天安门事件', '达赖', '台独', '藏独', '疆独', '反华', '颠覆', '动乱',
  // 色情
  '色情', '黄片', '裸体', '性服务', '一夜情', '约炮', '找小姐', '成人视频', '援交', '裸聊',
  // 暴力
  '杀人', '自杀方法', '制毒', '贩毒', '买枪', '卖枪', '炸弹制作', '砍人', '下毒', '绑架',
  // 赌博
  '赌博网站', '博彩平台', '六合彩', '外围赌球', '资金盘', '网络赌场', '赌资', '下注', '庄家', '抽水',
  // 诈骗
  '免费领', '中奖了', '刷单', '网贷免还', '代开发票', '传销', '庞氏', '杀猪盘', '电信诈骗', '洗钱',
];

// 广告话术
const AD_KEYWORDS = ['加我微信', '加我V信', '加我vx', '私聊', '扫码加群', '免费领取', '点击链接', '日入过万', '零投资', '招代理', '月赚', '稳赚不赔', '内部渠道'];

// 手机号正则
const PHONE_RE = /1[3-9]\d{9}/g;
// 微信号正则
const WECHAT_RE = /(微信|weixin|wx|Wx|WX)\s*[:：]?\s*[a-zA-Z0-9_-]{4,}/g;
// QQ号正则
const QQ_RE = /QQ\s*[:：]?\s*\d{5,}/g;
// 邮箱正则
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export type ModerationResult = {
  status: 'approved' | 'rejected' | 'manual_review';
  reasons: string[];
  riskLevel: 'low' | 'medium' | 'high';
};

export function moderateContent(content: {
  name?: string;
  description?: string;
  notes?: string;
  rent_min?: number;
  rent_max?: number;
  total_area?: number;
  industry?: string;
  fileName?: string;
}): ModerationResult {
  const reasons: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  const allText = [content.name, content.description, content.notes, content.fileName].filter(Boolean).join(' ');
  const lower = allText.toLowerCase();

  // 1. 敏感词检测 → 直接驳回
  const hitSensitive = SENSITIVE_WORDS.filter(w => lower.includes(w.toLowerCase()));
  if (hitSensitive.length > 0) {
    return { status: 'rejected', reasons: [`检测到敏感词：${hitSensitive.join('、')}`], riskLevel: 'high' };
  }

  // 2. 联系方式检测 → 转人工
  const hasPhone = PHONE_RE.test(allText);
  const hasWechat = WECHAT_RE.test(allText);
  const hasQQ = QQ_RE.test(allText);
  const hasEmail = EMAIL_RE.test(allText);
  if (hasPhone || hasWechat || hasQQ || hasEmail) {
    reasons.push('检测到联系方式，需人工确认是否合规');
    riskLevel = 'medium';
  }

  // 3. 广告话术检测 → 转人工
  const hitAds = AD_KEYWORDS.filter(w => lower.includes(w.toLowerCase()));
  if (hitAds.length > 0) {
    reasons.push(`检测到广告话术：${hitAds.join('、')}`);
    riskLevel = 'medium';
  }

  // 4. 价格异常 → 驳回
  if (content.rent_min !== undefined) {
    if (content.rent_min <= 0) {
      return { status: 'rejected', reasons: ['租金不能小于等于0'], riskLevel: 'high' };
    }
    if (content.rent_min > 10000) {
      return { status: 'rejected', reasons: ['租金异常偏高，请确认单位是否为元/㎡/天'], riskLevel: 'high' };
    }
  }

  // 5. 面积异常 → 驳回
  if (content.total_area !== undefined) {
    if (content.total_area < 10) {
      return { status: 'rejected', reasons: ['面积异常偏小（<10㎡），请确认'], riskLevel: 'high' };
    }
    if (content.total_area > 1000000) {
      return { status: 'rejected', reasons: ['面积异常偏大（>100万㎡），请确认'], riskLevel: 'high' };
    }
  }

  // 结果判定
  if (reasons.length > 0) {
    return { status: 'manual_review', reasons, riskLevel };
  }

  return { status: 'approved', reasons: ['内容审核通过'], riskLevel: 'low' };
}

// 脱敏函数
export function sanitizeText(text: string): string {
  return text
    .replace(PHONE_RE, '1** **** ***')
    .replace(WECHAT_RE, 'wx ***')
    .replace(QQ_RE, 'QQ ***')
    .replace(EMAIL_RE, '***@***.***');
}
