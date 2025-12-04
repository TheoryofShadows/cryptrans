import express, { Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { stakingService } from '../services/stakingService';
import { validation } from '../utils/validation';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';

const router = express.Router();

// GET /api/v1/staking/balance
router.get('/balance', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const stakeInfo = await stakingService.getStakeInfo(req.user!.address);

    if (!stakeInfo) {
      return res.json({
        address: req.user!.address,
        amount: 0,
        lastDemurrage: 0,
        status: 'not_initialized'
      });
    }

    res.json(stakeInfo);
  } catch (error) {
    logger.error('Error getting stake balance', error);
    res.status(500).json({ error: 'Failed to get stake balance' });
  }
});

// POST /api/v1/staking/initialize
router.post('/initialize', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const stakePda = await stakingService.initializeStake(req.user!.address);

    logger.info(`Stake initialized for ${req.user!.address}`);

    res.json({
      stakePda,
      message: 'Stake account initialization submitted'
    });
  } catch (error) {
    logger.error('Error initializing stake', error);
    res.status(500).json({ error: 'Failed to initialize stake' });
  }
});

// POST /api/v1/staking/deposit
router.post('/deposit', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      throw new ApiError(400, 'Missing required field: amount');
    }

    if (!validation.isValidAmount(amount)) {
      throw new ApiError(400, 'Amount must be a positive integer');
    }

    const txSignature = await stakingService.stakeTokens(req.user!.address, amount);

    logger.info(`Staked ${amount} tokens for ${req.user!.address}`);

    res.json({
      transactionSignature: txSignature,
      amount,
      message: 'Staking transaction submitted'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    logger.error('Error staking tokens', error);
    res.status(500).json({ error: 'Failed to stake tokens' });
  }
});

// POST /api/v1/staking/demurrage
router.post('/demurrage', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { demurrageRate } = req.body;

    if (demurrageRate === undefined) {
      throw new ApiError(400, 'Missing required field: demurrageRate');
    }

    if (!Number.isInteger(demurrageRate) || demurrageRate < 0) {
      throw new ApiError(400, 'Demurrage rate must be a non-negative integer');
    }

    const txSignature = await stakingService.applyDemurrage(req.user!.address, demurrageRate);

    logger.info(`Applied demurrage for ${req.user!.address}`);

    res.json({
      transactionSignature: txSignature,
      demurrageRate,
      message: 'Demurrage application submitted'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    logger.error('Error applying demurrage', error);
    res.status(500).json({ error: 'Failed to apply demurrage' });
  }
});

export default router;
