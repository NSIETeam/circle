import { Pool } from 'pg';
import Redis from 'ioredis';
import { config } from '../utils/config';

// PostgreSQL 连接池
export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

// Redis 连接
export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

// 数据库查询辅助函数
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
  }
  return result;
}

// 初始化数据库
export async function initDatabase() {
  const fs = await import('fs');
  const path = await import('path');
  const schemaPath = path.join(__dirname, 'schema.sql');

  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await pool.query(schema);
    console.log('Database schema initialized');
  }
}

export default { pool, redis, query, initDatabase };
