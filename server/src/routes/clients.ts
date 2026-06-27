import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

const requirementSchema = z.object({
  industry: z.string().optional(),
  min_area: z.number().optional(),
  max_area: z.number().optional(),
  max_rent: z.number().optional(),
  min_height: z.number().optional(),
  min_load: z.number().optional(),
  min_power: z.number().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
});

const clientSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().optional(),
  company: z.string().optional(),
  industry: z.string().optional(),
  requirements: requirementSchema.optional(),
  notes: z.string().optional(),
});

// GET /api/clients - 获取我的客户列表
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, name, phone, company, industry, requirements, notes, status, created_at
       FROM broker_clients
       WHERE broker_id = $1
       ORDER BY created_at DESC`,
      [req.user!.user_id],
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get clients error:', err);
    res.status(500).json({ success: false, error: '获取客户列表失败' });
  }
});

// POST /api/clients - 创建客户
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const data = clientSchema.parse(req.body);
    const result = await query(
      `INSERT INTO broker_clients (broker_id, name, phone, company, industry, requirements, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user!.user_id,
        data.name,
        data.phone || null,
        data.company || null,
        data.industry || null,
        data.requirements ? JSON.stringify(data.requirements) : null,
        data.notes || null,
      ],
    );
    res.status(201).json({ success: true, data: result.rows[0], message: '客户已创建' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    console.error('Create client error:', err);
    res.status(500).json({ success: false, error: '创建客户失败' });
  }
});

// PUT /api/clients/:id - 更新客户
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = clientSchema.partial().parse(req.body);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(data)) {
      if (key === 'requirements') {
        fields.push(`requirements = $${idx++}::jsonb`);
        values.push(JSON.stringify(val));
      } else {
        fields.push(`${key} = $${idx++}`);
        values.push(val);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    values.push(id, req.user!.user_id);
    const result = await query(
      `UPDATE broker_clients SET ${fields.join(', ')}
       WHERE id = $${idx++} AND broker_id = $${idx}
       RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '客户不存在' });
    }

    res.json({ success: true, data: result.rows[0], message: '客户已更新' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    console.error('Update client error:', err);
    res.status(500).json({ success: false, error: '更新客户失败' });
  }
});

// DELETE /api/clients/:id - 删除客户
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM broker_clients WHERE id = $1 AND broker_id = $2', [id, req.user!.user_id]);
    res.json({ success: true, message: '客户已删除' });
  } catch (err) {
    res.status(500).json({ success: false, error: '删除客户失败' });
  }
});

export default router;
