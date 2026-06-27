import { Request, Response, NextFunction } from 'express';
import { config } from '../utils/config';
import { query, redis } from '../db';

/**
 * 防飞单风险控制中间件
 * IM消息发送前检查风险关键词
 */

// 飞单风险关键词
const RISK_KEYWORDS = config.risk.warningKeywords;

export interface RiskCheckResult {
  allow_send: boolean;
  reason?: string;
  action: 'pass' | 'warn' | 'block';
  suggested_reply?: string;
}

export async function checkRiskContent(
  content: string,
  fromUserId: string
): Promise<RiskCheckResult> {
  // 检查是否包含风险关键词
  const matchedKeyword = RISK_KEYWORDS.find(kw => content.includes(kw));

  if (!matchedKeyword) {
    return { allow_send: true, action: 'pass' };
  }

  // 查询用户当前警告次数
  const userResult = await query(
    'SELECT risk_warnings, is_frozen FROM users WHERE id = $1',
    [fromUserId]
  );

  if (userResult.rows.length === 0) {
    return { allow_send: false, reason: '用户不存在', action: 'block' };
  }

  const user = userResult.rows[0];

  if (user.is_frozen) {
    return {
      allow_send: false,
      reason: '账号已被冻结',
      action: 'block',
      suggested_reply: '您的账号已被冻结，请联系平台运营解封。'
    };
  }

  // 首次警告
  if (user.risk_warnings < config.risk.maxWarnings) {
    await query(
      'UPDATE users SET risk_warnings = risk_warnings + 1 WHERE id = $1',
      [fromUserId]
    );

    return {
      allow_send: false,
      reason: `检测到飞单风险关键词: "${matchedKeyword}"`,
      action: 'warn',
      suggested_reply: '平台保障您的带看记录和佣金安全，请勿私下联系。请通过平台完成沟通。'
    };
  }

  // 超过警告次数，冻结对话
  await query(
    'UPDATE users SET is_frozen = true WHERE id = $1',
    [fromUserId]
  );

  return {
    allow_send: false,
    reason: '多次飞单警告，对话已冻结',
    action: 'block',
    suggested_reply: '您的账号因多次违规已被冻结，请联系平台运营处理。'
  };
}

// Express 中间件 - IM 消息风险检查
export async function riskCheckMiddleware(req: Request, res: Response, next: NextFunction) {
  const { content } = req.body;
  const fromUserId = req.user?.user_id;

  if (!fromUserId) {
    return res.status(401).json({ success: false, error: '未认证' });
  }

  const result = await checkRiskContent(content, fromUserId);

  if (!result.allow_send) {
    // 记录违规日志
    await query(
      `INSERT INTO activity_logs (user_id, action, target_type, detail)
       VALUES ($1, 'risk_violation', 'im_message', $2::jsonb)`,
      [fromUserId, JSON.stringify({ content: content.substring(0, 100), reason: result.reason })]
    );

    return res.status(403).json({
      success: false,
      error: result.reason,
      risk_action: result.action,
      suggested_reply: result.suggested_reply
    });
  }

  next();
}

// 限流中间件
export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.user_id || req.ip;
  const key = `rate_limit:${userId}`;

  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, 60); // 60秒窗口
  }

  if (current > 60) { // 每分钟最多60次请求
    return res.status(429).json({
      success: false,
      error: '请求过于频繁，请稍后再试'
    });
  }

  next();
}
