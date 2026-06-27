import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { authenticate, optionalAuth } from '../middleware/auth';
import { BrokerLevel, InfoLevel } from '../types';

const router = Router();

/**
 * 信息分层配置
 * 根据用户等级/行为决定可见字段
 */
const FIELD_ACCESS: Record<string, { level: InfoLevel; label: string }> = {
  address:        { level: InfoLevel.VERIFIED,   label: '认证后可见' },
  contact_name:   { level: InfoLevel.BOOKED,     label: '预约带看后可见' },
  contact_phone:  { level: InfoLevel.BOOKED,     label: '预约带看后可见' },
  floor_plan:     { level: InfoLevel.FAVORITED,  label: '收藏后解锁' },
  power_detail:   { level: InfoLevel.CONSULTED,  label: '发起咨询后解锁' },
  env_assessment: { level: InfoLevel.VERIFIED,   label: '认证后可见' },
};

// 检查用户是否满足某信息层级
async function checkInfoAccess(userId: string | undefined, level: InfoLevel): Promise<boolean> {
  if (level === InfoLevel.PUBLIC) return true;
  if (!userId) return false;

  const userResult = await query(
    'SELECT broker_level, id FROM users WHERE id = $1',
    [userId]
  );
  if (userResult.rows.length === 0) return false;

  switch (level) {
    case InfoLevel.VERIFIED:
      // 认证经纪人及以上可看
      return [BrokerLevel.VERIFIED, BrokerLevel.SILVER, BrokerLevel.GOLD, BrokerLevel.DIAMOND]
        .includes(userResult.rows[0].broker_level);
    case InfoLevel.FAVORITED: {
      // 收藏了该房源
      const favResult = await query(
        'SELECT 1 FROM favorites WHERE user_id = $1 AND building_id = $2 LIMIT 1',
        [userId, '']  // building_id will be filled per-request
      );
      return false; // handled ad-hoc per building
    }
    case InfoLevel.CONSULTED: {
      // 发起过咨询
      const consultResult = await query(
        'SELECT 1 FROM im_messages WHERE from_user_id = $1 AND building_id = $2 LIMIT 1',
        [userId, '']
      );
      return false; // handled ad-hoc per building
    }
    case InfoLevel.BOOKED: {
      // 有带看预约
      const bookResult = await query(
        `SELECT 1 FROM visit_bookings
         WHERE broker_id = $1 AND building_id = $2 AND status IN ('confirmed', 'completed') LIMIT 1`,
        [userId, '']
      );
      return false; // handled ad-hoc per building
    }
    default:
      return false;
  }
}

// 过滤敏感字段
function filterFields(building: any, accessMap: Record<string, boolean>) {
  const result = { ...building };

  for (const [field, config] of Object.entries(FIELD_ACCESS)) {
    if (!accessMap[field]) {
      // 替换为提示信息而非直接删除
      if (field === 'contact_phone') {
        result[field] = 'PLATFORM_IM';
      } else if (field === 'contact_name') {
        result[field] = '平台转接';
      } else {
        result[field] = null;
      }
      // 添加解锁提示
      result[`_unlock_hint_${field}`] = config.label;
    }
  }

  return result;
}

// GET /api/buildings - 搜索房源（公开）
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const {
      region, city, district,
      industry,              // 产业标签
      min_area, max_area,
      min_rent, max_rent,
      min_height,           // 最小层高
      min_floor_load,       // 最小承重
      keyword,              // 关键词搜索
      page = '1',
      page_size = '20',
      sort = 'created_at',
      order = 'desc',
      featured_only = 'false',
    } = req.query as Record<string, string>;

    const offset = (parseInt(page) - 1) * parseInt(page_size);
    const limit = parseInt(page_size);

    let sql = `SELECT b.*, p.name as park_name, p.rating as park_rating, p.tenant_count
               FROM buildings b
               LEFT JOIN parks p ON b.park_id = p.id
               WHERE b.status = 'active'`;
    const params: any[] = [];
    let paramIndex = 1;

    if (region) { sql += ` AND b.region = $${paramIndex++}`; params.push(region); }
    if (city) { sql += ` AND b.city = $${paramIndex++}`; params.push(city); }
    if (district) { sql += ` AND b.district = $${paramIndex++}`; params.push(district); }
    if (min_area) { sql += ` AND b.total_area >= $${paramIndex++}`; params.push(parseFloat(min_area)); }
    if (max_area) { sql += ` AND b.total_area <= $${paramIndex++}`; params.push(parseFloat(max_area)); }
    if (min_rent) { sql += ` AND b.rent_min >= $${paramIndex++}`; params.push(parseFloat(min_rent)); }
    if (max_rent) { sql += ` AND b.rent_max <= $${paramIndex++}`; params.push(parseFloat(max_rent)); }
    if (min_height) { sql += ` AND b.floor_height >= $${paramIndex++}`; params.push(parseFloat(min_height)); }
    if (min_floor_load) { sql += ` AND b.floor_load >= $${paramIndex++}`; params.push(parseFloat(min_floor_load)); }
    if (industry) { sql += ` AND $${paramIndex++} = ANY(b.industry_tags)`; params.push(industry); }
    if (keyword) { sql += ` AND (b.name ILIKE $${paramIndex} OR b.park_name ILIKE $${paramIndex})`; params.push(`%${keyword}%`); paramIndex++; }
    if (featured_only === 'true') { sql += ` AND b.is_featured = true`; }

    // 排序
    const allowedSorts = ['created_at', 'rent_min', 'total_area', 'floor_height'];
    const sortField = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    // 宏创房源优先
    sql += ` ORDER BY b.is_featured DESC, b.${sortField} ${sortOrder}`;

    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // 获取总数
    let countSql = `SELECT COUNT(*) FROM buildings b WHERE b.status = 'active'`;
    if (region) countSql += ` AND b.region = $1`;
    const countResult = await query(countSql, region ? [region] : []);
    const total = parseInt(countResult.rows[0].count);

    // 过滤敏感字段（未登录用户只能看公开信息）
    const buildings = result.rows.map(b => {
      const accessMap: Record<string, boolean> = {};
      // 未登录用户只有 PUBLIC 级别可见
      for (const field of Object.keys(FIELD_ACCESS)) {
        accessMap[field] = false;
      }
      return filterFields(b, accessMap);
    });

    res.json({
      success: true,
      data: buildings,
      total,
      page: parseInt(page),
      page_size: limit,
      total_pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Search buildings error:', err);
    res.status(500).json({ success: false, error: '搜索房源失败' });
  }
});

// GET /api/buildings/:id - 房源详情（带信息分层）
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.user_id;

    const result = await query(
      `SELECT b.*, p.name as park_name, p.rating as park_rating,
              p.tenant_count, p.logo as park_logo, p.description as park_description
       FROM buildings b
       LEFT JOIN parks p ON b.park_id = p.id
       WHERE b.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '房源不存在' });
    }

    const building = result.rows[0];

    // 计算信息访问权限
    const accessMap: Record<string, boolean> = {};

    if (!userId) {
      // 未登录：只有 PUBLIC
      for (const field of Object.keys(FIELD_ACCESS)) {
        accessMap[field] = false;
      }
    } else {
      for (const field of Object.keys(FIELD_ACCESS)) {
        const config = FIELD_ACCESS[field];

        switch (config.level) {
          case InfoLevel.PUBLIC:
            accessMap[field] = true;
            break;
          case InfoLevel.VERIFIED: {
            const userLevel = await query('SELECT broker_level FROM users WHERE id = $1', [userId]);
            const level = userLevel.rows[0]?.broker_level;
            accessMap[field] = [BrokerLevel.VERIFIED, BrokerLevel.SILVER, BrokerLevel.GOLD, BrokerLevel.DIAMOND].includes(level);
            break;
          }
          case InfoLevel.FAVORITED: {
            const fav = await query('SELECT 1 FROM favorites WHERE user_id = $1 AND building_id = $2', [userId, id]);
            accessMap[field] = fav.rows.length > 0;
            break;
          }
          case InfoLevel.CONSULTED: {
            const consult = await query('SELECT 1 FROM im_messages WHERE from_user_id = $1 AND building_id = $2', [userId, id]);
            accessMap[field] = consult.rows.length > 0;
            break;
          }
          case InfoLevel.BOOKED: {
            const book = await query(
              `SELECT 1 FROM visit_bookings
               WHERE broker_id = $1 AND building_id = $2 AND status IN ('confirmed', 'completed')`,
              [userId, id]
            );
            accessMap[field] = book.rows.length > 0;
            break;
          }
        }
      }
    }

    // 添加解锁状态信息
    const filtered = filterFields(building, accessMap);

    res.json({
      success: true,
      data: {
        ...filtered,
        _access: accessMap,
        _my_level: req.user?.level || 'guest',
      }
    });
  } catch (err) {
    console.error('Get building error:', err);
    res.status(500).json({ success: false, error: '获取房源详情失败' });
  }
});

// POST /api/buildings/:id/favorite - 收藏/取消收藏
router.post('/:id/favorite', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.user_id;

    // 检查是否已收藏
    const existing = await query(
      'SELECT 1 FROM favorites WHERE user_id = $1 AND building_id = $2',
      [userId, id]
    );

    if (existing.rows.length > 0) {
      await query('DELETE FROM favorites WHERE user_id = $1 AND building_id = $2', [userId, id]);
      res.json({ success: true, data: { favorited: false }, message: '已取消收藏' });
    } else {
      await query('INSERT INTO favorites (user_id, building_id) VALUES ($1, $2)', [userId, id]);
      res.json({ success: true, data: { favorited: true }, message: '已收藏' });
    }
  } catch (err) {
    console.error('Favorite error:', err);
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

// GET /api/buildings/:id/favorites - 查看收藏状态
router.get('/:id/favorite', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.user_id;
    const result = await query('SELECT 1 FROM favorites WHERE user_id = $1 AND building_id = $2', [userId, id]);
    res.json({ success: true, data: { favorited: result.rows.length > 0 } });
  } catch (err) {
    res.status(500).json({ success: false, error: '查询失败' });
  }
});

// GET /api/buildings/featured - 获取推荐房源（Agent驱动的前端可调用）
router.get('/featured/list', optionalAuth, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT b.*, p.name as park_name, p.rating as park_rating
       FROM buildings b
       LEFT JOIN parks p ON b.park_id = p.id
       WHERE b.is_featured = true AND b.status = 'active'
       ORDER BY p.rating DESC
       LIMIT 10`
    );

    const buildings = result.rows.map(b => {
      const accessMap: Record<string, boolean> = {};
      for (const field of Object.keys(FIELD_ACCESS)) accessMap[field] = false;
      return filterFields(b, accessMap);
    });

    res.json({ success: true, data: buildings });
  } catch (err) {
    res.status(500).json({ success: false, error: '获取推荐失败' });
  }
});

export default router;
