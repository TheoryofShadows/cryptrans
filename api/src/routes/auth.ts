import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { validation } from '../utils/validation';
import { crypto } from '../utils/crypto';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';

const router = express.Router();

interface LoginRequest extends Request {
  body: {
    address: string;
    message: string;
    signature: string;
  };
}

// POST /api/v1/auth/login
router.post('/login', (req: LoginRequest, res: Response) => {
  try {
    const { address, message, signature } = req.body;

    if (!address || !message || !signature) {
      throw new ApiError(400, 'Missing required fields: address, message, signature');
    }

    if (!validation.isValidPublicKey(address)) {
      throw new ApiError(400, 'Invalid Solana address');
    }

    // Verify the signature
    const isValid = crypto.verifySignature(message, signature, address);

    if (!isValid) {
      throw new ApiError(401, 'Invalid signature');
    }

    // Generate JWT token
    const token = jwt.sign({ address }, config.jwtSecret, {
      expiresIn: '24h'
    });

    logger.info(`User ${address} authenticated successfully`);

    res.json({
      token,
      address,
      expiresIn: config.jwtExpiry
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    logger.error('Login error', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// GET /api/v1/auth/nonce
router.get('/nonce', (req: Request, res: Response) => {
  try {
    const nonce = Math.random().toString(36).substring(2, 15);
    const message = `Sign this message to authenticate: ${nonce}`;

    res.json({
      nonce,
      message,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Nonce generation error', error);
    res.status(500).json({ error: 'Failed to generate nonce' });
  }
});

export default router;
