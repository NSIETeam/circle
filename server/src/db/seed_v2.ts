#!/usr/bin/env tsx
/**
 * 种子数据脚本 V2 - 生成大量多样化的厂区样本
 * 覆盖10大产业类别，50+套房源
 */
import { pool } from './index';
import bcrypt from 'bcryptjs';

// 10大产业类别
const INDUSTRIES = [
  'AI', '生物医药', '智能制造', '新能源', '集成电路',
  '新材料', '航空航天', '电子信息', '医疗器械', '食品加工'
];

// 园区模板 - 覆盖不同规模和特色
const PARK_TEMPLATES = [
  // 北京昌平
  { name: '宏创AI产业园', region: '昌平区', city: '北京', industries: ['AI', '电子信息'], is_operator: true, rating: 4.8, tenant_count: 120 },
  { name: '中关村生命科学园', region: '昌平区', city: '北京', industries: ['生物医药', '医疗器械'], is_operator: false, rating: 4.9, tenant_count: 95 },
  { name: '未来科学城创新基地', region: '昌平区', city: '北京', industries: ['新能源', '新材料'], is_operator: false, rating: 4.5, tenant_count: 75 },

  // 北京大兴
  { name: '宏创生物医药园', region: '大兴区', city: '北京', industries: ['生物医药', '医疗器械'], is_operator: true, rating: 4.7, tenant_count: 85 },
  { name: '大兴临空经济区', region: '大兴区', city: '北京', industries: ['航空航天', '电子信息'], is_operator: false, rating: 4.6, tenant_count: 110 },
  { name: '京南智能制造基地', region: '大兴区', city: '北京', industries: ['智能制造', '集成电路'], is_operator: false, rating: 4.4, tenant_count: 68 },

  // 北京亦庄
  { name: '亦庄经济技术开发区', region: '大兴区', city: '北京', industries: ['集成电路', '智能制造'], is_operator: false, rating: 4.8, tenant_count: 200 },
  { name: '亦庄生物医药产业园', region: '大兴区', city: '北京', industries: ['生物医药', '新材料'], is_operator: false, rating: 4.6, tenant_count: 90 },

  // 上海浦东
  { name: '张江高科技园区', region: '浦东新区', city: '上海', industries: ['AI', '集成电路', '生物医药'], is_operator: false, rating: 4.9, tenant_count: 350 },
  { name: '临港智能制造基地', region: '浦东新区', city: '上海', industries: ['智能制造', '新能源'], is_operator: false, rating: 4.7, tenant_count: 180 },
  { name: '上海航空航天产业园', region: '浦东新区', city: '上海', industries: ['航空航天', '新材料'], is_operator: false, rating: 4.8, tenant_count: 120 },

  // 上海松江
  { name: 'G60科创走廊', region: '松江区', city: '上海', industries: ['智能制造', '电子信息'], is_operator: false, rating: 4.6, tenant_count: 220 },

  // 苏州
  { name: '苏州工业园区', region: '工业园区', city: '苏州', industries: ['电子信息', '智能制造', '生物医药'], is_operator: false, rating: 4.9, tenant_count: 400 },
  { name: '苏州生物医药产业园', region: '工业园区', city: '苏州', industries: ['生物医药', '医疗器械'], is_operator: false, rating: 4.8, tenant_count: 150 },
  { name: '昆山电子科技城', region: '昆山市', city: '苏州', industries: ['电子信息', '集成电路'], is_operator: false, rating: 4.5, tenant_count: 180 },

  // 深圳
  { name: '南山科技园', region: '南山区', city: '深圳', industries: ['AI', '电子信息'], is_operator: false, rating: 4.9, tenant_count: 280 },
  { name: '光明科学城', region: '光明区', city: '深圳', industries: ['新材料', '生物医药'], is_operator: false, rating: 4.7, tenant_count: 130 },
  { name: '坪山新能源基地', region: '坪山区', city: '深圳', industries: ['新能源', '智能制造'], is_operator: false, rating: 4.6, tenant_count: 95 },

  // 广州
  { name: '广州科学城', region: '黄埔区', city: '广州', industries: ['电子信息', '智能制造'], is_operator: false, rating: 4.7, tenant_count: 240 },
  { name: '南沙生物医药产业园', region: '南沙区', city: '广州', industries: ['生物医药', '医疗器械'], is_operator: false, rating: 4.5, tenant_count: 110 },

  // 杭州
  { name: '杭州未来科技城', region: '余杭区', city: '杭州', industries: ['AI', '电子信息'], is_operator: false, rating: 4.8, tenant_count: 200 },
  { name: '杭州生物医药小镇', region: '西湖区', city: '杭州', industries: ['生物医药', '新材料'], is_operator: false, rating: 4.6, tenant_count: 85 },
];

// 房源模板生成函数
function generateBuilding(park: any, index: number) {
  const industryTag = park.industries[index % park.industries.length];

  // 根据产业类型调整参数范围
  const specs = {
    'AI': { area: [800, 5000], height: [4.5, 6], load: [0.5, 2], power: [1000, 3000], rent: [3.5, 6] },
    '生物医药': { area: [1000, 4000], height: [4, 5.5], load: [2, 5], power: [2000, 5000], rent: [4, 7] },
    '智能制造': { area: [2000, 10000], height: [6, 12], load: [3, 10], power: [2000, 8000], rent: [2.5, 4.5] },
    '新能源': { area: [3000, 15000], height: [8, 15], load: [5, 15], power: [3000, 10000], rent: [2, 4] },
    '集成电路': { area: [500, 3000], height: [4, 6], load: [1, 3], power: [1500, 4000], rent: [4.5, 8] },
    '新材料': { area: [1500, 8000], height: [6, 10], load: [3, 8], power: [2000, 6000], rent: [3, 5.5] },
    '航空航天': { area: [5000, 20000], height: [10, 20], load: [5, 20], power: [4000, 12000], rent: [3.5, 6] },
    '电子信息': { area: [800, 4000], height: [4, 7], load: [0.5, 3], power: [1200, 3500], rent: [3, 5.5] },
    '医疗器械': { area: [600, 3500], height: [4, 6], load: [1.5, 4], power: [1500, 4000], rent: [4, 6.5] },
    '食品加工': { area: [2000, 8000], height: [5, 8], load: [2, 6], power: [1500, 4000], rent: [2.5, 4.5] },
  };

  const spec = specs[industryTag] || specs['智能制造'];

  // 随机生成参数
  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min);
  const randFloat = (min: number, max: number) => Number((Math.random() * (max - min) + min).toFixed(2));

  const area = rand(spec.area[0], spec.area[1]);
  const height = randFloat(spec.height[0], spec.height[1]);
  const load = randFloat(spec.load[0], spec.load[1]);
  const power = rand(spec.power[0], spec.power[1]);
  const rentMin = randFloat(spec.rent[0], spec.rent[1] * 0.8);
  const rentMax = randFloat(rentMin, spec.rent[1]);

  // 楼栋命名
  const buildingNames = ['A栋', 'B栋', 'C栋', '1号楼', '2号楼', '3号楼', '综合楼', '研发中心', '生产车间', '实验楼'];
  const name = `${park.name}${buildingNames[index % buildingNames.length]}`;

  // 配套设施
  const allAmenities = ['食堂', '班车', '宿舍', '便利店', '咖啡厅', '会议室', '卸货平台', '污水处理', '中央空调', '安保系统'];
  const numAmenities = rand(3, 7);
  const amenities = allAmenities.sort(() => Math.random() - 0.5).slice(0, numAmenities);

  // 产业标签（主产业+可能附加1-2个）
  const tags = [industryTag];
  if (Math.random() > 0.6) {
    const extra = park.industries[Math.floor(Math.random() * park.industries.length)];
    if (!tags.includes(extra)) tags.push(extra);
  }

  return {
    name,
    area,
    height,
    load,
    power,
    rent_min: rentMin,
    rent_max: rentMax,
    tags,
    amenities,
    featured: Math.random() > 0.7, // 30%概率为推荐房源
  };
}

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('[SEED] 开始生成种子数据...\n');

    // 1. 清空旧数据（保留admin用户）
    console.log('[SEED] 清空旧数据...');
    await client.query('TRUNCATE TABLE buildings, parks, favorites, im_messages, visit_bookings, share_links, share_click_events, activity_logs, leads, broker_clients RESTART IDENTITY CASCADE');
    await client.query('DELETE FROM users WHERE phone != $1', ['admin']);
    console.log('[OK] 旧数据已清空\n');

    // 2. 创建测试用户
    console.log('[SEED] 创建测试用户...');
    const passwordHash = await bcrypt.hash('123456', 10);

    const users = [
      { phone: '13800000001', name: '张经纪人', role: 'broker', broker_level: 'diamond', total_visits: 120, total_deals: 45 },
      { phone: '13800000002', name: '李经纪人', role: 'broker', broker_level: 'gold', total_visits: 85, total_deals: 32 },
      { phone: '13800000003', name: '王经纪人', role: 'broker', broker_level: 'silver', total_visits: 60, total_deals: 20 },
      { phone: '13800000004', name: '赵经纪人', role: 'broker', broker_level: 'verified', total_visits: 35, total_deals: 12 },
      { phone: '13800000005', name: '刘经纪人', role: 'broker', broker_level: 'registered', total_visits: 15, total_deals: 5 },
    ];

    for (const u of users) {
      await client.query(
        `INSERT INTO users (phone, password_hash, name, role, broker_level, total_visits, total_deals)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [u.phone, passwordHash, u.name, u.role, u.broker_level, u.total_visits, u.total_deals]
      );
    }
    console.log(`[OK] 创建了 ${users.length} 个经纪人\n`);

    // 3. 创建园区
    console.log('[SEED] 创建产业园区...');
    const parkIds: string[] = [];

    for (const p of PARK_TEMPLATES) {
      const province = p.city === '北京' ? '北京市' : p.city === '上海' ? '上海市' : p.city;
      const res = await client.query(
        `INSERT INTO parks (name, region, district, city, province, rating, tenant_count, is_operator, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
         RETURNING id`,
        [p.name, p.region, p.region, p.city, province, p.rating, p.tenant_count, p.is_operator]
      );
      parkIds.push(res.rows[0].id);
    }
    console.log(`[OK] 创建了 ${parkIds.length} 个产业园区\n`);

    // 4. 创建房源（每个园区2-4套）
    console.log('[SEED] 创建房源数据...');
    let buildingCount = 0;

    for (let i = 0; i < PARK_TEMPLATES.length; i++) {
      const park = PARK_TEMPLATES[i];
      const numBuildings = Math.floor(Math.random() * 3) + 2; // 2-4套

      for (let j = 0; j < numBuildings; j++) {
        const b = generateBuilding(park, j);

        await client.query(
          `INSERT INTO buildings (
            park_id, name, region, district, city, province, address,
            total_area, floor_height, floor_load, power_capacity,
            rent_min, rent_max, rent_unit,
            industry_tags, amenities,
            is_featured, park_name, park_rating, tenant_count,
            status, contact_name, contact_phone
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11,
            $12, $13, $14,
            $15, $16,
            $17, $18, $19, $20,
            'active', '园区招商部', '13900000000'
          )`,
          [
            parkIds[i], b.name, park.region, park.region, park.city,
            park.city === '北京' ? '北京市' : park.city === '上海' ? '上海市' : park.city,
            `${park.region}科技园路${Math.floor(Math.random() * 100) + 1}号`,
            b.area, b.height, b.load, b.power,
            b.rent_min, b.rent_max, '元/㎡/天',
            b.tags, b.amenities,
            b.featured, park.name, park.rating, park.tenant_count
          ]
        );

        buildingCount++;
      }
    }
    console.log(`[OK] 创建了 ${buildingCount} 套房源\n`);

    // 5. 生成一些行为日志和收藏数据
    console.log('[SEED] 生成模拟行为数据...');
    const brokerRes = await client.query("SELECT id FROM users WHERE role = 'broker'");
    const brokerIds = brokerRes.rows.map(r => r.id);

    const buildingRes = await client.query("SELECT id FROM buildings");
    const buildingIds = buildingRes.rows.map(r => r.id);

    // 生成收藏数据（每个经纪人收藏5-10套）
    let favoriteCount = 0;
    for (const brokerId of brokerIds) {
      const numFavorites = Math.floor(Math.random() * 6) + 5;
      const shuffled = buildingIds.sort(() => Math.random() - 0.5).slice(0, numFavorites);

      for (const buildingId of shuffled) {
        await client.query(
          `INSERT INTO favorites (user_id, building_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [brokerId, buildingId]
        );
        favoriteCount++;
      }
    }
    console.log(`[OK] 生成了 ${favoriteCount} 条收藏记录`);

    // 生成带看预约（每个经纪人3-8个）
    let visitCount = 0;
    const statuses = ['pending', 'confirmed', 'completed', 'completed', 'completed'];

    for (const brokerId of brokerIds) {
      const numVisits = Math.floor(Math.random() * 6) + 3;

      for (let i = 0; i < numVisits; i++) {
        const buildingId = buildingIds[Math.floor(Math.random() * buildingIds.length)];
        const parkRes = await client.query('SELECT park_id FROM buildings WHERE id = $1', [buildingId]);
        const parkId = parkRes.rows[0]?.park_id;

        if (!parkId) continue;

        const visitTime = new Date();
        visitTime.setDate(visitTime.getDate() + Math.floor(Math.random() * 7));
        visitTime.setHours(10 + Math.floor(Math.random() * 8), 0, 0, 0);

        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const confirmCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        await client.query(
          `INSERT INTO visit_bookings (building_id, broker_id, park_id, visit_time, status, confirm_code, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [buildingId, brokerId, parkId, visitTime, status, confirmCode, '希望了解详细信息']
        );
        visitCount++;
      }
    }
    console.log(`[OK] 生成了 ${visitCount} 条带看预约`);

    // 生成IM消息
    let messageCount = 0;
    for (const brokerId of brokerIds) {
      const numMessages = Math.floor(Math.random() * 5) + 3;

      for (let i = 0; i < numMessages; i++) {
        const buildingId = buildingIds[Math.floor(Math.random() * buildingIds.length)];
        const parkRes = await client.query(
          `SELECT p.id FROM parks p JOIN buildings b ON b.park_id = p.id WHERE b.id = $1`,
          [buildingId]
        );

        if (parkRes.rows.length === 0) continue;

        // 找一个park角色的用户作为接收者
        const parkUserRes = await client.query(
          "SELECT id FROM users WHERE role = 'park' LIMIT 1"
        );

        if (parkUserRes.rows.length === 0) {
          // 如果没有park用户，用admin
          const adminRes = await client.query(
            "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
          );
          if (adminRes.rows.length === 0) continue;

          await client.query(
            `INSERT INTO im_messages (from_user_id, to_user_id, building_id, content, msg_type)
             VALUES ($1, $2, $3, $4, 'text')`,
            [brokerId, adminRes.rows[0].id, buildingId, '您好，我想了解这套房源的详细信息']
          );
        } else {
          await client.query(
            `INSERT INTO im_messages (from_user_id, to_user_id, building_id, content, msg_type)
             VALUES ($1, $2, $3, $4, 'text')`,
            [brokerId, parkUserRes.rows[0].id, buildingId, '您好，我想了解这套房源的详细信息']
          );
        }
        messageCount++;
      }
    }
    console.log(`[OK] 生成了 ${messageCount} 条IM消息\n`);

    await client.query('COMMIT');

    console.log('='.repeat(60));
    console.log('[SEED] 种子数据生成完成！');
    console.log('='.repeat(60));
    console.log(`\n[STATS] 数据统计:`);
    console.log(`   - 产业园区: ${parkIds.length} 个`);
    console.log(`   - 房源数量: ${buildingCount} 套`);
    console.log(`   - 经纪人: ${users.length} 个`);
    console.log(`   - 收藏记录: ${favoriteCount} 条`);
    console.log(`   - 带看预约: ${visitCount} 条`);
    console.log(`   - IM消息: ${messageCount} 条`);
    console.log(`\n[STATS] 产业覆盖:`);
    INDUSTRIES.forEach(ind => {
      console.log(`   - ${ind}`);
    });
    console.log(`\n[STATS] 城市覆盖:`);
    const cities = [...new Set(PARK_TEMPLATES.map(p => p.city))];
    cities.forEach(city => {
      console.log(`   - ${city}`);
    });
    console.log(`\n[STATS] 测试账号:`);
    console.log(`   - admin / admin123 (管理员)`);
    console.log(`   - 13800000001 / 123456 (钻石经纪人)`);
    console.log(`   - 13800000002 / 123456 (金牌经纪人)`);
    console.log('='.repeat(60));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ERROR] 种子数据生成失败:', err);
    throw err;
  } finally {
    client.release();
  }
}

seed()
  .then(() => {
    console.log('\n[DONE] 脚本执行完成');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n[ERROR] 脚本执行失败:', err);
    process.exit(1);
  });
