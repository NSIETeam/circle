/**
 * 环境配置
 */
export const config = {
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',

  // 数据库
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'circle',
    user: process.env.DB_USER || 'circle',
    password: process.env.DB_PASSWORD || 'circle_dev',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'circle-dev-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // AI
  ai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
  },

  // 品牌
  brand: {
    name: process.env.BRAND_NAME || '园圈',
    operatorName: process.env.OPERATOR_NAME || '宏创',
  },

  // 成本控制
  cost: {
    monthlyCloudBudget: 5000,
    monthlyAIBudget: 2000,
    aiCostPerActiveUser: 20,
  },

  // 风控
  risk: {
    warningKeywords: ['微信', '电话', '手机号', '加我', '私下', '绕过', '直接找', '手机号码'],
    maxWarnings: 2,
  }
} as const;
