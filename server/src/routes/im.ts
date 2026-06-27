import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authenticate } from '../middleware/auth';
import { checkRiskContent } from '../middleware/risk';

const router = Router();

// POST /api/im/send - 发送消息
router.post('/send', authenticate, async (req: Request, res: Response) => {
  try {
    const { to_user_id, building_id, content, msg_type = 'text' } = req.body;
    const fromUserId = req.user!.user_id;

    if (!to_user_id || !content) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 风控检查
    const riskResult = await checkRiskContent(content, fromUserId);

    if (!riskResult.allow_send) {
      // 记录被拦截的消息
      await query(
        `INSERT INTO im_messages (from_user_id, to_user_id, building_id, content, msg_type, risk_status, risk_reason)
         VALUES ($1, $2, $3, $4, $5, 'blocked', $6)`,
        [fromUserId, to_user_id, building_id || null, content, msg_type, riskResult.reason]
      );

      return res.status(403).json({
        success: false,
        error: riskResult.reason,
        risk_action: riskResult.action,
        suggested_reply: riskResult.suggested_reply
      });
    }

    // 保存消息
    const result = await query(
      `INSERT INTO im_messages (from_user_id, to_user_id, building_id, content, msg_type, risk_status)
       VALUES ($1, $2, $3, $4, $5, 'safe')
       RETURNING *`,
      [fromUserId, to_user_id, building_id || null, content, msg_type]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '发送成功'
    });
  } catch (err) {
    console.error('IM send error:', err);
    res.status(500).json({ success: false, error: '消息发送失败' });
  }
});

// GET /api/im/conversations - 获取会话列表
router.get('/conversations', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.user_id;

    const result = await query(
      `SELECT DISTINCT ON (conversation_partner)
        u.id as partner_id, u.name as partner_name, u.avatar as partner_avatar,
        u.role as partner_role,
        m.content as last_message,
        m.created_at as last_message_time,
        m.is_read as last_message_read
      FROM (
        SELECT
          CASE WHEN from_user_id = $1 THEN to_user_id ELSE from_user_id END as conversation_partner,
          MAX(created_at) as max_time
        FROM im_messages
        WHERE from_user_id = $1 OR to_user_id = $1
        GROUP BY conversation_partner
      ) conv
      JOIN im_messages m ON (
        (m.from_user_id = $1 AND m.to_user_id = conv.conversation_partner) OR
        (m.from_user_id = conv.conversation_partner AND m.to_user_id = $1)
      ) AND m.created_at = conv.max_time
      JOIN users u ON u.id = conv.conversation_partner
      ORDER BY conversation_partner, m.created_at DESC`,
      [userId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ success: false, error: '获取会话列表失败' });
  }
});

// GET /api/im/messages/:partnerId - 获取与某人的聊天记录
router.get('/messages/:partnerId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.user_id;
    const { partnerId } = req.params;
    const { before, limit = '50' } = req.query as Record<string, string>;

    let sql = `SELECT * FROM im_messages
               WHERE (from_user_id = $1 AND to_user_id = $2)
                  OR (from_user_id = $2 AND to_user_id = $1)`;
    const params: any[] = [userId, partnerId];

    if (before) {
      sql += ` AND created_at < $3`;
      params.push(before);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await query(sql, params);

    // 将对方发来的消息标记为已读
    await query(
      `UPDATE im_messages SET is_read = true
       WHERE from_user_id = $1 AND to_user_id = $2 AND is_read = false`,
      [partnerId, userId]
    );

    res.json({ success: true, data: result.rows.reverse() });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ success: false, error: '获取消息失败' });
  }
});

// GET /api/im/unread-count - 未读消息数
router.get('/unread-count', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT COUNT(*) FROM im_messages
       WHERE to_user_id = $1 AND is_read = false AND risk_status = 'safe'`,
      [req.user!.user_id]
    );
    res.json({ success: true, data: { count: parseInt(result.rows[0].count) } });
  } catch (err) {
    res.status(500).json({ success: false, error: '查询失败' });
  }
});

export default router;
