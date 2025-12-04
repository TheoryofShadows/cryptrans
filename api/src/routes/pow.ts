import express, { Request, Response } from 'express';
import { optionalAuthMiddleware } from '../middleware/auth';
import { powService } from '../services/powService';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';

const router = express.Router();

// POST /api/v1/pow/validate
router.post('/validate', optionalAuthMiddleware, (req: Request, res: Response) => {
  try {
    const { message, hash, difficulty } = req.body;

    if (!message || !hash || difficulty === undefined) {
      throw new ApiError(400, 'Missing required fields: message, hash, difficulty');
    }

    if (!Number.isInteger(difficulty) || difficulty < 0) {
      throw new ApiError(400, 'Difficulty must be a non-negative integer');
    }

    const isValid = powService.validateProofOfWork(message, hash, difficulty);

    res.json({
      valid: isValid,
      difficulty,
      message: isValid ? 'Valid proof of work' : 'Invalid proof of work'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    logger.error('Error validating PoW', error);
    res.status(500).json({ error: 'Failed to validate proof of work' });
  }
});

// POST /api/v1/pow/generate
router.post('/generate', optionalAuthMiddleware, (req: Request, res: Response) => {
  try {
    const { message, difficulty } = req.body;

    if (!message) {
      throw new ApiError(400, 'Missing required field: message');
    }

    const diff = difficulty || 2;

    if (!Number.isInteger(diff) || diff < 0 || diff > 10) {
      throw new ApiError(400, 'Difficulty must be between 0 and 10');
    }

    logger.info(`Generating PoW with difficulty ${diff}`);

    // Note: This is computationally intensive and should have rate limiting
    const { nonce, hash } = powService.generateProofOfWork(message, diff);

    res.json({
      message,
      difficulty: diff,
      nonce,
      hash,
      estimatedTimeMs: powService.getEstimatedWorkTime(diff)
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    logger.error('Error generating PoW', error);
    res.status(500).json({ error: 'Failed to generate proof of work' });
  }
});

// GET /api/v1/pow/difficulty
router.get('/difficulty', (req: Request, res: Response) => {
  try {
    const difficulty = 2;
    const estimatedTime = powService.getEstimatedWorkTime(difficulty);

    res.json({
      defaultDifficulty: difficulty,
      estimatedTimeMs: estimatedTime,
      estimatedTimeSeconds: Math.round(estimatedTime / 1000),
      description: 'Default proof of work difficulty for proposal creation'
    });
  } catch (error) {
    logger.error('Error getting difficulty info', error);
    res.status(500).json({ error: 'Failed to get difficulty info' });
  }
});

export default router;
