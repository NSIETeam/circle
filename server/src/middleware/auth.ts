import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config';
import { JwtPayload, UserRole } from '../types';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// JWT 认证中间件
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '未提供认证令牌' });
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: '令牌无效或已过期' });
  }
}

// 可选认证（不强制要求登录）
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      req.user = jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch { /* ignore */ }
  }
  next();
}

// 角色权限中间件
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: '未认证' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: '权限不足' });
    }
    next();
  };
}

// 生成 JWT
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: '7d'
  } as jwt.SignOptions);
}
