import express, { Response } from 'express';
import { optionalAuthMiddleware, AuthRequest } from '../middleware/auth';
import { analyticsService } from '../services/analyticsService';
import { validation } from '../utils/validation';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';

const router = express.Router();

// GET /api/v1/analytics/dao
router.get('/dao', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await analyticsService.getDaoStats();

    res.json({
      timestamp: Date.now(),
      data: stats
    });
  } catch (error) {
    logger.error('Error getting DAO stats', error);
    res.status(500).json({ error: 'Failed to get DAO stats' });
  }
});

// GET /api/v1/analytics/proposals
router.get('/proposals', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await analyticsService.getProposalStats();

    res.json({
      timestamp: Date.now(),
      data: stats
    });
  } catch (error) {
    logger.error('Error getting proposal stats', error);
    res.status(500).json({ error: 'Failed to get proposal stats' });
  }
});

// GET /api/v1/analytics/voting/:proposalId
router.get('/voting/:proposalId', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const proposalId = parseInt(req.params.proposalId);

    if (!validation.isValidProposalId(proposalId)) {
      throw new ApiError(400, 'Invalid proposal ID');
    }

    const stats = await analyticsService.getVotingStats(proposalId);

    res.json({
      proposalId,
      timestamp: Date.now(),
      data: stats
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    logger.error('Error getting voting stats', error);
    res.status(500).json({ error: 'Failed to get voting stats' });
  }
});

// GET /api/v1/analytics/voting/:proposalId/timeseries
router.get('/voting/:proposalId/timeseries', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const proposalId = parseInt(req.params.proposalId);
    const bucketSize = parseInt(req.query.bucketSize as string) || 3600;

    if (!validation.isValidProposalId(proposalId)) {
      throw new ApiError(400, 'Invalid proposal ID');
    }

    if (!Number.isInteger(bucketSize) || bucketSize < 60) {
      throw new ApiError(400, 'Bucket size must be at least 60 seconds');
    }

    const timeseries = await analyticsService.getVotingTimeSeries(proposalId, bucketSize);

    res.json({
      proposalId,
      bucketSize,
      data: timeseries
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    logger.error('Error getting voting timeseries', error);
    res.status(500).json({ error: 'Failed to get voting timeseries' });
  }
});

export default router;
