import express, { Response } from 'express';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth';
import { treasuryService } from '../services/treasuryService';
import { validation } from '../utils/validation';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';

const router = express.Router();

// GET /api/v1/treasury/status
router.get('/status', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const treasuryInfo = await treasuryService.getTreasuryInfo();

    res.json(treasuryInfo);
  } catch (error) {
    logger.error('Error getting treasury info', error);
    res.status(500).json({ error: 'Failed to get treasury info' });
  }
});

// POST /api/v1/treasury/release
router.post('/release', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { proposalId, amount, recipient } = req.body;

    if (!proposalId || !amount || !recipient) {
      throw new ApiError(400, 'Missing required fields: proposalId, amount, recipient');
    }

    if (!validation.isValidProposalId(proposalId)) {
      throw new ApiError(400, 'Invalid proposal ID');
    }

    if (!validation.isValidAmount(amount)) {
      throw new ApiError(400, 'Amount must be a positive integer');
    }

    if (!validation.isValidPublicKey(recipient)) {
      throw new ApiError(400, 'Invalid recipient address');
    }

    const txSignature = await treasuryService.releaseFunds(
      proposalId,
      amount,
      recipient
    );

    logger.info(`Fund release initiated by ${req.user!.address} for proposal ${proposalId}`);

    res.json({
      transactionSignature: txSignature,
      proposalId,
      amount,
      recipient,
      message: 'Fund release submitted'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    logger.error('Error releasing funds', error);
    res.status(500).json({ error: 'Failed to release funds' });
  }
});

// POST /api/v1/treasury/release-quantum-safe
router.post('/release-quantum-safe', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { proposalId, amount, recipient } = req.body;

    if (!proposalId || !amount || !recipient) {
      throw new ApiError(400, 'Missing required fields: proposalId, amount, recipient');
    }

    if (!validation.isValidProposalId(proposalId)) {
      throw new ApiError(400, 'Invalid proposal ID');
    }

    if (!validation.isValidAmount(amount)) {
      throw new ApiError(400, 'Amount must be a positive integer');
    }

    if (!validation.isValidPublicKey(recipient)) {
      throw new ApiError(400, 'Invalid recipient address');
    }

    const txSignature = await treasuryService.releaseFundsQuantumSafe(
      proposalId,
      amount,
      recipient
    );

    logger.info(`Quantum-safe fund release initiated by ${req.user!.address}`);

    res.json({
      transactionSignature: txSignature,
      proposalId,
      amount,
      recipient,
      quantum_safe: true,
      message: 'Quantum-safe fund release submitted'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    logger.error('Error releasing quantum-safe funds', error);
    res.status(500).json({ error: 'Failed to release quantum-safe funds' });
  }
});

export default router;
