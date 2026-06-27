// ===== 用户角色 =====
export enum UserRole {
  BROKER = 'broker',           // 经纪人
  PARK = 'park',               // 园区方
  OPERATOR = 'operator',       // 宏创运营方
  ADMIN = 'admin',             // 超级管理员
}

// ===== 经纪人等级 =====
export enum BrokerLevel {
  REGISTERED = 'registered',       // 注册经纪人
  VERIFIED = 'verified',           // 认证经纪人
  SILVER = 'silver',               // 银牌
  GOLD = 'gold',                   // 金牌
  DIAMOND = 'diamond',             // 钻石
}

export const BrokerLevelConfig = {
  [BrokerLevel.REGISTERED]: { minDeals: 0, minVisits: 0, label: '注册经纪人' },
  [BrokerLevel.VERIFIED]:   { minDeals: 0, minVisits: 0, label: '认证经纪人', requiresCert: true },
  [BrokerLevel.SILVER]:     { minDeals: 0, minVisits: 5, label: '银牌经纪人' },
  [BrokerLevel.GOLD]:       { minDeals: 2, minVisits: 10, label: '金牌经纪人' },
  [BrokerLevel.DIAMOND]:    { minDeals: 10, minVisits: 30, label: '钻石经纪人' },
} as const;

// ===== 房源 =====
export interface Building {
  id: string;
  name: string;
  park_id: string;
  region: string;
  address: string;
  district: string;
  city: string;
  province: string;

  // 核心参数
  total_area: number;        // 总面积 (㎡)
  floor_height: number;      // 层高 (m)
  floor_load: number;        // 承重 (T)
  power_capacity: number;    // 电力容量 (KVA)
  power_detail: string;      // 电力详情
  rent_min: number;          // 最低租金
  rent_max: number;          // 最高租金
  rent_unit: string;         // 租金单位

  // 产业标签
  industry_tags: string[];   // ['AI', '生物医药', '智能制造']

  // 配套
  amenities: string[];       // ['食堂', '班车', '宿舍']

  // 图片
  images: string[];
  floor_plan: string;        // 楼层平面图

  // 状态
  status: BuildingStatus;
  is_featured: boolean;      // 宏创房源优先

  // 园区信息
  park_name: string;
  park_rating: number;
  tenant_count: number;

  // 联系方式 (敏感)
  contact_name: string;
  contact_phone: string;

  // 环评
  env_assessment: string;

  created_at: string;
  updated_at: string;
}

export enum BuildingStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  RENTED = 'rented',
  PENDING = 'pending',
}

// ===== 信息分层配置 =====
export enum InfoLevel {
  PUBLIC = 'public',           // 所有人可见
  VERIFIED = 'verified',       // 认证后可见
  FAVORITED = 'favorited',     // 收藏后解锁
  CONSULTED = 'consulted',     // 咨询后解锁
  BOOKED = 'booked',           // 预约带看后
}

export interface FieldAccessConfig {
  field: string;
  level: InfoLevel;
  label: string;
}

// ===== 用户 =====
export interface User {
  id: string;
  phone: string;
  role: UserRole;
  name: string;
  avatar?: string;

  // 经纪人专用
  broker_level: BrokerLevel;
  broker_cert?: string;       // 从业资格证
  total_visits: number;
  total_deals: number;

  // 园区专用
  park_id?: string;

  created_at: string;
  updated_at: string;
}

// ===== IM 消息 =====
export interface IMMessage {
  id: string;
  from_user_id: string;
  to_user_id: string;
  building_id?: string;
  content: string;
  msg_type: 'text' | 'image' | 'system';
  risk_status: RiskStatus;
  created_at: string;
}

export enum RiskStatus {
  SAFE = 'safe',
  WARNED = 'warned',
  BLOCKED = 'blocked',
  FROZEN = 'frozen',
}

// ===== 带看预约 =====
export interface VisitBooking {
  id: string;
  building_id: string;
  broker_id: string;
  park_id: string;
  visit_time: string;
  status: VisitStatus;
  confirm_code: string;
  notes?: string;
  created_at: string;
  confirmed_at?: string;
}

export enum VisitStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// ===== 分享追踪 =====
export interface ShareLink {
  id: string;
  building_id: string;
  broker_id: string;
  short_code: string;
  source: string;
  clicks: number;
  unique_visitors: number;
  leads: number;
  created_at: string;
}

export interface ShareClickEvent {
  id: string;
  share_id: string;
  visitor_id?: string;
  action: 'view' | 'favorite' | 'consult' | 'book';
  ip?: string;
  user_agent?: string;
  created_at: string;
}

// ===== API 通用 =====
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface JwtPayload {
  user_id: string;
  role: UserRole;
  level?: BrokerLevel;
}
