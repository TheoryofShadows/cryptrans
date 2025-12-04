import express, { Request, Response } from 'express';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth';
import { proposalService } from '../services/proposalService';
import { powService } from '../services/powService';
import { validation } from '../utils/validation';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';

const router = express.Router();

// GET /api/v1/proposals
router.get('/', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const proposals = await proposalService.getProposals(limit);

    res.json({
      data: proposals,
      count: proposals.length
    });
  } catch (error) {
    logger.error('Error fetching proposals', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

// GET /api/v1/proposals/:id
router.get('/:id', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const proposalId = parseInt(req.params.id);

    if (!validation.isValidProposalId(proposalId)) {
      throw new ApiError(400, 'Invalid proposal ID');
    }

    const proposal = await proposalService.getProposal(proposalId);

    if (!proposal) {
      throw new ApiError(404, 'Proposal not found');
    }

    res.json(proposal);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    logger.error('Error fetching proposal', error);
    res.status(500).json({ error: 'Failed to fetch proposal' });
  }
});

// POST /api/v1/proposals
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { description, fundingNeeded, difficulty } = req.body;

    if (!description || !fundingNeeded) {
      throw new ApiError(400, 'Missing required fields: description, fundingNeeded');
    }

    if (!validation.isValidDescription(description)) {
      throw new ApiError(400, 'Description must be 1-200 characters');
    }

    if (!validation.isValidAmount(fundingNeeded)) {
      throw new ApiError(400, 'Funding amount must be a positive integer');
    }

    // Generate PoW for the proposal
    const pow = proposalService.generateProofOfWork(description, difficulty || 2);

    // Create the proposal
    const txSignature = await proposalService.createProposal(
      req.user!.address,
      description,
      fundingNeeded,
      difficulty || 2
    );

    logger.info(`Proposal created by ${req.user!.address}`);

    res.json({
      transactionSignature: txSignature,
      proofOfWork: pow,
      message: 'Proposal creation submitted. Wait for confirmation.'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    logger.error('Error creating proposal', error);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

// GET /api/v1/proposals/:id/pow-difficulty
router.get('/:id/pow-difficulty', (req: Request, res: Response) => {
  try {
    const difficulty = 2; // Default difficulty

    const estimatedTime = powService.getEstimatedWorkTime(difficulty);

    res.json({
      difficulty,
      estimatedTimeMs: estimatedTime,
      estimatedTimeSeconds: Math.round(estimatedTime / 1000)
    });
  } catch (error) {
    logger.error('Error getting PoW difficulty', error);
    res.status(500).json({ error: 'Failed to get PoW difficulty' });
  }
});

export default router;
