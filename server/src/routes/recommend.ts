import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authenticate } from '../middleware/auth';
import { recommend, ClientRequirement } from '../services/recommendation';

const router = Router();

/**
 * POST /api/recommend/match
 * 根据客户需求返回AI匹配房源（开放接口，无需登录）
 */
router.post('/match', async (req: Request, res: Response) => {
  try {
    const reqBody = req.body as ClientRequirement;
    const rawText = (req.body as any).keyword || (req.body as any).raw_text || '';

    const { results, total, cached } = await recommend(reqBody, 10, rawText);

    // 异步记录搜索行为（不阻塞响应）
    query(
      `INSERT INTO activity_logs (action, target_type, detail)
       VALUES ('recommend_search', 'system', $1::jsonb)`,
      [JSON.stringify(reqBody)],
    ).catch(() => {});

    res.json({
      success: true,
      data: results.map(r => ({
        building: {
          id: r.building.id,
          name: r.building.name,
          park_name: r.building.park_name || '',
          total_area: r.building.total_area,
          floor_height: r.building.floor_height,
          floor_load: r.building.floor_load,
          power_capacity: r.building.power_capacity,
          rent_min: r.building.rent_min,
          rent_max: r.building.rent_max,
          industry_tags: r.building.industry_tags,
          region: r.building.region,
          is_featured: r.building.is_featured,
          park_rating: r.building.park_rating,
          tenant_count: r.building.tenant_count,
          amenities: r.building.amenities || [],
        },
        score: r.score,
        match_details: r.details,
        reasons: r.reasons,
      })),
      total,
      cached,
      query: reqBody,
    });
  } catch (err) {
    console.error('Recommendation error:', err);
    res.status(500).json({ success: false, error: '推荐失败' });
  }
});

/**
 * POST /api/recommend/client/:clientId
 * 根据已保存的客户需求匹配
 */
router.post('/client/:clientId', authenticate, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const userId = req.user!.user_id;

    const clientResult = await query(
      `SELECT requirements FROM broker_clients WHERE id = $1 AND broker_id = $2`,
      [clientId, userId],
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '客户不存在' });
    }

    const requirements = clientResult.rows[0].requirements as ClientRequirement;
    const { results, total } = await recommend(requirements, 10);

    res.json({
      success: true,
      data: results.map(r => ({
        building: r.building,
        score: r.score,
        match_details: r.details,
        reasons: r.reasons,
      })),
      total,
      client_id: clientId,
    });
  } catch (err) {
    console.error('Client recommendation error:', err);
    res.status(500).json({ success: false, error: '推荐失败' });
  }
});

export default router;
