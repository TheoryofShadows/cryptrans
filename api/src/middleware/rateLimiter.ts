import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  if (!store[key]) {
    store[key] = { count: 0, resetTime: now + config.rateLimitWindow };
  }

  const record = store[key];

  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + config.rateLimitWindow;
  }

  record.count++;

  res.set('X-RateLimit-Limit', config.rateLimitMax.toString());
  res.set('X-RateLimit-Remaining', Math.max(0, config.rateLimitMax - record.count).toString());
  res.set('X-RateLimit-Reset', record.resetTime.toString());

  if (record.count > config.rateLimitMax) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((record.resetTime - now) / 1000)
    });
  }

  next();
};
