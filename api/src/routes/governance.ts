import express, { Response } from 'express';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth';
import { votingService } from '../services/votingService';
import { validation } from '../utils/validation';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';

const router = express.Router();

// GET /api/v1/governance/vote/:proposalId
router.get('/vote/:proposalId', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const proposalId = parseInt(req.params.proposalId);

    if (!validation.isValidProposalId(proposalId)) {
      throw new ApiError(400, 'Invalid proposal ID');
    }

    if (!req.user) {
      return res.json({
        proposalId,
        voter: null,
        voteInfo: null,
        message: 'Authentication required to view personal vote'
      });
    }

    const voteInfo = await votingService.getVote(proposalId, req.user.address);

    res.json({
      proposalId,
      voter: req.user.address,
      voteInfo,
      hasVoted: !!voteInfo
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    logger.error('Error getting vote info', error);
    res.status(500).json({ error: 'Failed to get vote info' });
  }
});

// POST /api/v1/governance/vote/zk
router.post('/vote/zk', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { proposalId, nullifier, commitment, proof } = req.body;

    if (!proposalId || !nullifier || !commitment || !proof) {
      throw new ApiError(400, 'Missing required fields: proposalId, nullifier, commitment, proof');
    }

    if (!validation.isValidProposalId(proposalId)) {
      throw new ApiError(400, 'Invalid proposal ID');
    }

    if (!validation.isValidNullifier(nullifier)) {
      throw new ApiError(400, 'Invalid nullifier');
    }

    if (!validation.isValidCommitment(commitment)) {
      throw new ApiError(400, 'Invalid commitment');
    }

    logger.warn('Deprecated Groth16 voting requested - using quantum-vulnerable method');

    const txSignature = await votingService.voteWithZK(
      proposalId,
      req.user!.address,
      nullifier,
      commitment,
      proof
    );

    logger.info(`Vote submitted for proposal ${proposalId} by ${req.user!.address}`);

    res.json({
      transactionSignature: txSignature,
      proposalId,
      message: 'Vote submitted (deprecated Groth16 - consider using STARK)',
      deprecated: true
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    logger.error('Error voting', error);
    res.status(500).json({ error: 'Failed to submit vote' });
  }
});

// POST /api/v1/governance/vote/stark
router.post('/vote/stark', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { proposalId, imageId } = req.body;

    if (!proposalId || !imageId) {
      throw new ApiError(400, 'Missing required fields: proposalId, imageId');
    }

    if (!validation.isValidProposalId(proposalId)) {
      throw new ApiError(400, 'Invalid proposal ID');
    }

    const txSignature = await votingService.voteWithSTARK(
      proposalId,
      req.user!.address,
      imageId
    );

    logger.info(`Quantum-safe STARK vote submitted for proposal ${proposalId}`);

    res.json({
      transactionSignature: txSignature,
      proposalId,
      quantum_safe: true,
      message: 'Quantum-safe vote submitted via STARK proof'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    logger.error('Error submitting STARK vote', error);
    res.status(500).json({ error: 'Failed to submit quantum-safe vote' });
  }
});

// POST /api/v1/governance/commitment/register
router.post('/commitment/register', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { commitment } = req.body;

    if (!commitment) {
      throw new ApiError(400, 'Missing required field: commitment');
    }

    if (!validation.isValidCommitment(commitment)) {
      throw new ApiError(400, 'Invalid commitment format');
    }

    const txSignature = await votingService.registerCommitment(
      req.user!.address,
      commitment
    );

    logger.info(`Commitment registered for ${req.user!.address}`);

    res.json({
      transactionSignature: txSignature,
      message: 'Commitment registration submitted'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    logger.error('Error registering commitment', error);
    res.status(500).json({ error: 'Failed to register commitment' });
  }
});

export default router;
