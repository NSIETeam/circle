import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { query } from '../db';
import { authenticate } from '../middleware/auth';
import { VisitStatus } from '../types';

const router = Router();

// POST /api/visits - 创建带看预约
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { building_id, visit_time, notes } = req.body;
    const brokerId = req.user!.user_id;

    if (!building_id || !visit_time) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 获取房源所属园区
    const building = await query(
      'SELECT park_id, contact_name, contact_phone FROM buildings WHERE id = $1',
      [building_id]
    );
    if (building.rows.length === 0) {
      return res.status(404).json({ success: false, error: '房源不存在' });
    }

    const parkId = building.rows[0].park_id;
    const confirmCode = nanoid(8).toUpperCase();

    const result = await query(
      `INSERT INTO visit_bookings (building_id, broker_id, park_id, visit_time, confirm_code, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [building_id, brokerId, parkId, visit_time, confirmCode, notes || null]
    );

    // 创建线索
    await query(
      `INSERT INTO leads (building_id, park_id, broker_id, source, status)
       VALUES ($1, $2, $3, 'booking', 'new')`,
      [building_id, parkId, brokerId]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '预约成功，请等待园区确认'
    });
  } catch (err) {
    console.error('Create visit error:', err);
    res.status(500).json({ success: false, error: '预约失败' });
  }
});

// GET /api/visits/my - 我的预约列表
router.get('/my', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.user_id;
    const role = req.user!.role;

    let result;
    if (role === 'broker') {
      result = await query(
        `SELECT vb.*, b.name as building_name, b.images, p.name as park_name
         FROM visit_bookings vb
         JOIN buildings b ON vb.building_id = b.id
         JOIN parks p ON vb.park_id = p.id
         WHERE vb.broker_id = $1
         ORDER BY vb.visit_time DESC`,
        [userId]
      );
    } else {
      result = await query(
        `SELECT vb.*, b.name as building_name, u.name as broker_name, u.phone as broker_phone
         FROM visit_bookings vb
         JOIN buildings b ON vb.building_id = b.id
         JOIN users u ON vb.broker_id = u.id
         WHERE vb.park_id = (SELECT park_id FROM users WHERE id = $1)
         ORDER BY vb.visit_time DESC`,
        [userId]
      );
    }

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: '获取预约列表失败' });
  }
});

// PATCH /api/visits/:id/confirm - 确认带看
router.patch('/:id/confirm', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE visit_bookings
       SET status = 'confirmed', confirmed_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '预约不存在或已确认' });
    }

    res.json({ success: true, data: result.rows[0], message: '已确认带看' });
  } catch (err) {
    res.status(500).json({ success: false, error: '确认失败' });
  }
});

// PATCH /api/visits/:id/complete - 完成带看
router.patch('/:id/complete', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE visit_bookings
       SET status = 'completed', completed_at = NOW()
       WHERE id = $1 AND status = 'confirmed'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '预约不存在或未确认' });
    }

    // 更新经纪人带看次数
    await query(
      `UPDATE users SET total_visits = total_visits + 1
       WHERE id = (SELECT broker_id FROM visit_bookings WHERE id = $1)`,
      [id]
    );

    // 检查是否升级
    await checkBrokerLevelUpgrade(result.rows[0].broker_id);

    res.json({ success: true, data: result.rows[0], message: '带看已完成' });
  } catch (err) {
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

async function checkBrokerLevelUpgrade(userId: string) {
  const user = await query(
    'SELECT total_visits, total_deals FROM users WHERE id = $1',
    [userId]
  );

  if (user.rows.length === 0) return;

  const { total_visits, total_deals } = user.rows[0];

  let newLevel = 'registered';
  if (total_deals >= 10) newLevel = 'diamond';
  else if (total_deals >= 2 && total_visits >= 10) newLevel = 'gold';
  else if (total_visits >= 5) newLevel = 'silver';
  else if (total_deals > 0 || total_visits > 0) newLevel = 'verified';

  await query('UPDATE users SET broker_level = $1 WHERE id = $2', [newLevel, userId]);
}

export default router;
