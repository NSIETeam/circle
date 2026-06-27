import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/users/me - 获取当前用户信息
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, phone, name, avatar, role, broker_level, total_visits,
              total_deals, is_active, created_at
       FROM users WHERE id = $1`,
      [req.user!.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ success: false, error: '获取用户信息失败' });
  }
});

// GET /api/users/:id - 获取用户公开信息
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT id, name, avatar, role, broker_level, created_at
       FROM users WHERE id = $1 AND is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: '获取用户信息失败' });
  }
});

export default router;
