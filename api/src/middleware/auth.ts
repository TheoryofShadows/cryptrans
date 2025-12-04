import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

export type AuthRequest = Request & {
  user?: {
    address: string;
    iat: number;
    exp: number;
  };
};

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('JWT verification failed', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const optionalAuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      req.user = decoded;
    } catch (error) {
      logger.warn('JWT verification failed in optional auth', error);
    }
  }

  next();
};
