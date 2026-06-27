import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { query } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/share - 生成分享链接
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { building_id, source = 'wechat' } = req.body;
    const brokerId = req.user!.user_id;

    if (!building_id) {
      return res.status(400).json({ success: false, error: '缺少房源ID' });
    }

    // 生成短码
    const shortCode = nanoid(10);

    const result = await query(
      `INSERT INTO share_links (building_id, broker_id, short_code, source)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [building_id, brokerId, shortCode, source]
    );

    const shareLink = result.rows[0];

    // 生成分享URL
    const shareUrl = `/share/${shortCode}?ref=${brokerId}&source=${source}`;

    res.status(201).json({
      success: true,
      data: {
        ...shareLink,
        share_url: shareUrl,
        // 生成海报所需信息
        poster_info: {
          building_id,
          broker_id: brokerId,
          share_code: shortCode,
        }
      },
      message: '分享链接已生成'
    });
  } catch (err) {
    console.error('Create share link error:', err);
    res.status(500).json({ success: false, error: '生成分享链接失败' });
  }
});

// GET /api/share/:shortCode - 访问分享链接（追踪点击）
router.get('/:shortCode', async (req: Request, res: Response) => {
  try {
    const { shortCode } = req.params;
    const { ref } = req.query;

    // 查询分享链接
    const result = await query(
      `SELECT * FROM share_links WHERE short_code = $1`,
      [shortCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '链接无效' });
    }

    const share = result.rows[0];

    // 记录点击事件
    await query(
      `INSERT INTO share_click_events (share_id, visitor_id, action, ip, user_agent, referrer)
       VALUES ($1, $2, 'view', $3, $4, $5)`,
      [share.id, ref || null, req.ip, req.headers['user-agent'] || null, req.headers['referer'] || null]
    );

    // 更新点击计数
    await query(
      `UPDATE share_links SET clicks = clicks + 1 WHERE id = $1`,
      [share.id]
    );

    // 重定向或返回房源信息
    res.json({
      success: true,
      data: {
        share_id: share.id,
        building_id: share.building_id,
        broker_id: share.broker_id,
        ref: ref || share.broker_id,
      },
      redirect: `/buildings/${share.building_id}?ref=${ref || share.broker_id}`
    });
  } catch (err) {
    console.error('Share redirect error:', err);
    res.status(500).json({ success: false, error: '访问失败' });
  }
});

// GET /api/share/stats/:buildingId - 分享统计（经纪人查看）
router.get('/stats/:buildingId', authenticate, async (req: Request, res: Response) => {
  try {
    const { buildingId } = req.params;
    const userId = req.user!.user_id;

    const result = await query(
      `SELECT sl.*,
              (SELECT COUNT(*) FROM share_click_events sce WHERE sce.share_id = sl.id) as total_clicks,
              (SELECT COUNT(DISTINCT visitor_id) FROM share_click_events sce WHERE sce.share_id = sl.id) as unique_visitors
       FROM share_links sl
       WHERE sl.building_id = $1 AND sl.broker_id = $2
       ORDER BY sl.created_at DESC`,
      [buildingId, userId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: '获取统计失败' });
  }
});

export default router;
