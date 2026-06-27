import app from './app';
import { config } from './utils/config';
import { initDatabase } from './db';

async function main() {
  // 初始化数据库
  try {
    await initDatabase();
    console.log('✓ Database initialized');
  } catch (err) {
    console.warn('⚠ Database initialization skipped (will retry on first query):', (err as Error).message);
  }

  // 启动服务器
  const server = app.listen(config.port, () => {
    console.log(`\n  ${config.brand.name} API Server`);
    console.log(`  http://localhost:${config.port}`);
    console.log(`  Health: http://localhost:${config.port}/api/health`);
    console.log(`  Environment: ${config.nodeEnv}\n`);
  });

  // 优雅关闭
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(console.error);
