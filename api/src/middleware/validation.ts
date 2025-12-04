import { Request, Response, NextFunction } from 'express';

export const validateJson = (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    if (!req.is('application/json')) {
      return res.status(400).json({ error: 'Content-Type must be application/json' });
    }
  }
  next();
};

export const validateRequestBody = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const field of requiredFields) {
      if (!(field in req.body)) {
        return res.status(400).json({
          error: `Missing required field: ${field}`
        });
      }
    }
    next();
  };
};
