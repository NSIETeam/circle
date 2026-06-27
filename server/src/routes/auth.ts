import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db';
import { generateToken } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

// 注册验证
const registerSchema = z.object({
  phone: z.string().regex(/^1\d{10}$/, '手机号格式不正确'),
  password: z.string().min(6, '密码至少6位'),
  name: z.string().min(1).max(50),
  role: z.nativeEnum(UserRole),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    // 检查手机号是否已注册
    const existing = await query('SELECT id FROM users WHERE phone = $1', [data.phone]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: '该手机号已注册' });
    }

    // 密码加密
    const passwordHash = await bcrypt.hash(data.password, 10);

    // 创建用户
    const result = await query(
      `INSERT INTO users (phone, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, phone, name, role, broker_level, created_at`,
      [data.phone, passwordHash, data.name, data.role]
    );

    const user = result.rows[0];
    const token = generateToken({
      user_id: user.id,
      role: user.role,
      level: user.broker_level,
    });

    // 记录注册日志
    await query(
      `INSERT INTO activity_logs (user_id, action, target_type, detail)
       VALUES ($1, 'register', 'user', $2::jsonb)`,
      [user.id, JSON.stringify({ role: user.role })]
    );

    res.status(201).json({
      success: true,
      data: { user, token },
      message: '注册成功'
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: '注册失败' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, error: '请提供手机号和密码' });
    }

    const result = await query(
      `SELECT id, phone, password_hash, name, role, broker_level, is_frozen
       FROM users WHERE phone = $1`,
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: '手机号或密码错误' });
    }

    const user = result.rows[0];

    if (user.is_frozen) {
      return res.status(403).json({ success: false, error: '账号已被冻结，请联系平台运营' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: '手机号或密码错误' });
    }

    const token = generateToken({
      user_id: user.id,
      role: user.role,
      level: user.broker_level,
    });

    // 记录登录日志
    await query(
      `INSERT INTO activity_logs (user_id, action, target_type)
       VALUES ($1, 'login', 'user')`,
      [user.id]
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          broker_level: user.broker_level,
        },
        token
      },
      message: '登录成功'
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: '登录失败' });
  }
});

export default router;
