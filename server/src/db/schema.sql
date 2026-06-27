-- ===== 园圈平台 数据库 Schema V1.0 =====
-- PostgreSQL 15+

-- 启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== 用户表 =====
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  avatar VARCHAR(500),
  role VARCHAR(20) NOT NULL CHECK (role IN ('broker', 'park', 'operator', 'admin')),

  -- 经纪人字段
  broker_level VARCHAR(20) DEFAULT 'registered' CHECK (broker_level IN ('registered', 'verified', 'silver', 'gold', 'diamond')),
  broker_cert VARCHAR(500),
  total_visits INT DEFAULT 0,
  total_deals INT DEFAULT 0,

  -- 园区方字段
  park_id UUID,

  -- 状态
  is_active BOOLEAN DEFAULT true,
  risk_warnings INT DEFAULT 0,
  is_frozen BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_broker_level ON users(broker_level);

-- ===== 园区表 =====
CREATE TABLE IF NOT EXISTS parks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  region VARCHAR(100) NOT NULL,
  district VARCHAR(100),
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  address VARCHAR(500),

  -- 评级
  rating DECIMAL(2,1) DEFAULT 0,
  tenant_count INT DEFAULT 0,

  -- 图片
  logo VARCHAR(500),
  images TEXT[],

  -- 联系信息
  contact_name VARCHAR(100),
  contact_phone VARCHAR(20),

  -- 是否宏创房源
  is_operator BOOLEAN DEFAULT false,

  -- 状态
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parks_region ON parks(region);
CREATE INDEX idx_parks_city ON parks(city);
CREATE INDEX idx_parks_operator ON parks(is_operator);

-- ===== 房源/楼栋表 =====
CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  park_id UUID NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,

  -- 位置
  region VARCHAR(100) NOT NULL,
  district VARCHAR(100),
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100),
  address VARCHAR(500),

  -- 核心参数
  total_area DECIMAL(12,2) NOT NULL,
  floor_height DECIMAL(5,2),
  floor_load DECIMAL(6,2),
  power_capacity INT,
  power_detail VARCHAR(500),

  -- 租金
  rent_min DECIMAL(10,2),
  rent_max DECIMAL(10,2),
  rent_unit VARCHAR(20) DEFAULT '元/㎡/天',

  -- 产业标签
  industry_tags TEXT[],
  amenities TEXT[],

  -- 图片和附件
  images TEXT[],
  floor_plan VARCHAR(500),

  -- 环评
  env_assessment VARCHAR(100),

  -- 园区信息（冗余便于搜索）
  park_name VARCHAR(200),
  park_rating DECIMAL(2,1) DEFAULT 0,
  tenant_count INT DEFAULT 0,

  -- 联系人（敏感）
  contact_name VARCHAR(100),
  contact_phone VARCHAR(20),

  -- 状态
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'rented', 'pending')),
  is_featured BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_buildings_region ON buildings(region);
CREATE INDEX idx_buildings_city ON buildings(city);
CREATE INDEX idx_buildings_status ON buildings(status);
CREATE INDEX idx_buildings_featured ON buildings(is_featured);
CREATE INDEX idx_buildings_industry_tags ON buildings USING GIN(industry_tags);
CREATE INDEX idx_buildings_park_id ON buildings(park_id);
CREATE INDEX idx_buildings_rent ON buildings(rent_min, rent_max);

-- ===== 收藏表 =====
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, building_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);

-- ===== IM消息表 =====
CREATE TABLE IF NOT EXISTS im_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL REFERENCES users(id),
  to_user_id UUID NOT NULL REFERENCES users(id),
  building_id UUID REFERENCES buildings(id),
  content TEXT NOT NULL,
  msg_type VARCHAR(20) DEFAULT 'text' CHECK (msg_type IN ('text', 'image', 'system')),
  risk_status VARCHAR(20) DEFAULT 'safe' CHECK (risk_status IN ('safe', 'warned', 'blocked', 'frozen')),
  risk_reason VARCHAR(500),

  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_im_messages_from ON im_messages(from_user_id);
CREATE INDEX idx_im_messages_to ON im_messages(to_user_id);
CREATE INDEX idx_im_messages_building ON im_messages(building_id);
CREATE INDEX idx_im_messages_risk ON im_messages(risk_status);

-- ===== 带看预约表 =====
CREATE TABLE IF NOT EXISTS visit_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES buildings(id),
  broker_id UUID NOT NULL REFERENCES users(id),
  park_id UUID NOT NULL REFERENCES parks(id),
  visit_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  confirm_code VARCHAR(10) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_visits_broker ON visit_bookings(broker_id);
CREATE INDEX idx_visits_park ON visit_bookings(park_id);
CREATE INDEX idx_visits_status ON visit_bookings(status);

-- ===== 分享链接表 =====
CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES buildings(id),
  broker_id UUID NOT NULL REFERENCES users(id),
  short_code VARCHAR(20) UNIQUE NOT NULL,
  source VARCHAR(50) DEFAULT 'wechat',
  clicks INT DEFAULT 0,
  unique_visitors INT DEFAULT 0,
  leads INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_share_links_broker ON share_links(broker_id);
CREATE INDEX idx_share_links_code ON share_links(short_code);

-- ===== 分享点击事件表 =====
CREATE TABLE IF NOT EXISTS share_click_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_id UUID NOT NULL REFERENCES share_links(id) ON DELETE CASCADE,
  visitor_id VARCHAR(100),
  action VARCHAR(20) NOT NULL CHECK (action IN ('view', 'favorite', 'consult', 'book')),
  ip VARCHAR(50),
  user_agent TEXT,
  referrer VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_share_events_share ON share_click_events(share_id);

-- ===== 行为日志表（后期可迁移到ClickHouse） =====
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  target_type VARCHAR(50),
  target_id VARCHAR(100),
  detail JSONB,
  ip VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_action ON activity_logs(action);
CREATE INDEX idx_activity_created ON activity_logs(created_at);

-- ===== 线索表（园区方查看） =====
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES buildings(id),
  park_id UUID NOT NULL REFERENCES parks(id),
  broker_id UUID NOT NULL REFERENCES users(id),
  source VARCHAR(50) NOT NULL,  -- 'share', 'search', 'recommendation'
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'visited', 'negotiating', 'closed', 'lost')),
  first_contact_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_park ON leads(park_id);
CREATE INDEX idx_leads_broker ON leads(broker_id);
CREATE INDEX idx_leads_status ON leads(status);

-- ===== 客户CRM表（经纪人端） =====
CREATE TABLE IF NOT EXISTS broker_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  company VARCHAR(200),
  industry VARCHAR(100),
  requirements JSONB,  -- { min_area, max_rent, industry_tags, ... }
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_broker ON broker_clients(broker_id);

-- ===== 更新触发器 =====
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_buildings_updated_at
  BEFORE UPDATE ON buildings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_parks_updated_at
  BEFORE UPDATE ON parks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_broker_clients_updated_at
  BEFORE UPDATE ON broker_clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
