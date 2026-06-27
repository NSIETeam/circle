import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimitMiddleware } from './middleware/risk';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import buildingRoutes from './routes/buildings';
import imRoutes from './routes/im';
import visitRoutes from './routes/visits';
import shareRoutes from './routes/share';
import recommendRoutes from './routes/recommend';
import clientRoutes from './routes/clients';

const app = express();

// 安全与性能中间件
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan('short'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 全局限流
app.use(rateLimitMiddleware);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      brand: process.env.BRAND_NAME || '园圈',
    }
  });
});

// 公开路由
app.use('/api/auth', authRoutes);

// 用户路由
app.use('/api/users', userRoutes);

// 房源路由（混合：部分公开，部分需要认证）
app.use('/api/buildings', buildingRoutes);

// IM 路由（需要认证-mount with authenticate is handled per-route in im.ts）
app.use('/api/im', imRoutes);

// 带看预约路由
app.use('/api/visits', visitRoutes);

// 分享路由
app.use('/api/share', shareRoutes);

// 智能推荐路由
app.use('/api/recommend', recommendRoutes);

// 经纪人客户CRM路由
app.use('/api/clients', clientRoutes);

// 静态文件（前端构建后）
app.use(express.static('public'));

// 前端 SPA 路由回退
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// 404 处理（API 路由）
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: '接口不存在' });
});

// 全局错误处理
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: '服务器内部错误' });
});

export default app;
