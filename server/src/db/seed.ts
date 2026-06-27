/**
 * 种子数据脚本 - 初始化测试数据
 */
import { pool } from './index';
import bcrypt from 'bcryptjs';

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. 创建测试用户
    const passwordHash = await bcrypt.hash('123456', 10);

    const users = [
      { phone: '13800000001', name: '张经纪人', role: 'broker', broker_level: 'silver' },
      { phone: '13800000002', name: '李经纪人', role: 'broker', broker_level: 'verified' },
      { phone: '13900000001', name: '宏创产业园', role: 'park' },
      { phone: '13900000002', name: '王园区', role: 'park' },
    ];

    for (const u of users) {
      await client.query(
        `INSERT INTO users (phone, password_hash, name, role, broker_level)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (phone) DO NOTHING`,
        [u.phone, passwordHash, u.name, u.role, u.broker_level || 'registered']
      );
    }
    console.log('✓ Users seeded');

    // 2. 创建园区
    const parks = [
      { name: '宏创AI产业园', region: '昌平区', city: '北京', district: '昌平区', is_operator: true, rating: 4.5, tenant_count: 120 },
      { name: '宏创生物医药园', region: '大兴区', city: '北京', district: '大兴区', is_operator: true, rating: 4.8, tenant_count: 85 },
      { name: '智造科技产业园', region: '浦东新区', city: '上海', district: '浦东新区', is_operator: false, rating: 4.2, tenant_count: 60 },
      { name: '苏州工业园', region: '工业园区', city: '苏州', district: '工业园区', is_operator: false, rating: 4.6, tenant_count: 200 },
    ];

    const parkIds: string[] = [];
    for (const p of parks) {
      const res = await client.query(
        `INSERT INTO parks (name, region, district, city, province, rating, tenant_count, is_operator)
         VALUES ($1, $2, $3, $4, '北京市', $5, $6, $7)
         RETURNING id`,
        [p.name, p.region, p.district, p.city, p.rating, p.tenant_count, p.is_operator]
      );
      parkIds.push(res.rows[0].id);
    }
    console.log('✓ Parks seeded');

    // 3. 创建房源
    const buildings = [
      { park_idx: 0, name: '宏创AI产业园A栋', area: 5000, height: 6, load: 5, power: 2000, rent_min: 3.5, rent_max: 5.0,
        tags: ['AI', '智能制造'], amenities: ['食堂', '班车', '宿舍', '便利店'], featured: true },
      { park_idx: 0, name: '宏创AI产业园B栋', area: 3000, height: 5.5, load: 3, power: 1600, rent_min: 3.0, rent_max: 4.5,
        tags: ['AI', '软件'], amenities: ['食堂', '班车'], featured: true },
      { park_idx: 1, name: '宏创生物医药园1号楼', area: 2000, height: 4.5, load: 3, power: 3000, rent_min: 4.5, rent_max: 6.5,
        tags: ['生物医药', '医疗器械'], amenities: ['食堂', '宿舍', '污水处理'], featured: true },
      { park_idx: 1, name: '宏创生物医药园2号楼', area: 1500, height: 4, load: 2.5, power: 2000, rent_min: 4.0, rent_max: 5.5,
        tags: ['生物医药', '实验室'], amenities: ['食堂', '污水处理'], featured: false },
      { park_idx: 2, name: '智造产业园C区', area: 8000, height: 8, load: 8, power: 5000, rent_min: 2.8, rent_max: 3.5,
        tags: ['智能制造', 'AI'], amenities: ['食堂', '班车', '宿舍', '卸货平台'], featured: false },
      { park_idx: 2, name: '智造产业园D栋', area: 4000, height: 7, load: 6, power: 3500, rent_min: 3.0, rent_max: 3.8,
        tags: ['智能制造'], amenities: ['食堂', '卸货平台'], featured: false },
      { park_idx: 3, name: '苏州工业园综合楼', area: 6000, height: 6, load: 4, power: 2500, rent_min: 2.5, rent_max: 3.5,
        tags: ['智能制造', 'AI', '生物医药'], amenities: ['食堂', '班车', '宿舍', '商业配套'], featured: false },
    ];

    for (const b of buildings) {
      await client.query(
        `INSERT INTO buildings (park_id, name, region, district, city, total_area, floor_height, floor_load,
         power_capacity, rent_min, rent_max, industry_tags, amenities, is_featured, park_name, park_rating, tenant_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [parkIds[b.park_idx], b.name, parks[b.park_idx].region, parks[b.park_idx].district, parks[b.park_idx].city,
         b.area, b.height, b.load, b.power, b.rent_min, b.rent_max, b.tags, b.amenities, b.featured,
         parks[b.park_idx].name, parks[b.park_idx].rating, parks[b.park_idx].tenant_count]
      );
    }
    console.log('✓ Buildings seeded');

    await client.query('COMMIT');
    console.log('\n✓ Seed completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
