"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const votingService_1 = require("../services/votingService");
const validation_1 = require("../utils/validation");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
// GET /api/v1/governance/vote/:proposalId
router.get('/vote/:proposalId', auth_1.optionalAuthMiddleware, async (req, res) => {
    try {
        const proposalId = parseInt(req.params.proposalId);
        if (!validation_1.validation.isValidProposalId(proposalId)) {
            throw new errorHandler_1.ApiError(400, 'Invalid proposal ID');
        }
        if (!req.user) {
            return res.json({
                proposalId,
                voter: null,
                voteInfo: null,
                message: 'Authentication required to view personal vote'
            });
        }
        const voteInfo = await votingService_1.votingService.getVote(proposalId, req.user.address);
        res.json({
            proposalId,
            voter: req.user.address,
            voteInfo,
            hasVoted: !!voteInfo
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ApiError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        logger_1.logger.error('Error getting vote info', error);
        res.status(500).json({ error: 'Failed to get vote info' });
    }
});
// POST /api/v1/governance/vote/zk
router.post('/vote/zk', auth_1.authMiddleware, async (req, res) => {
    try {
        const { proposalId, nullifier, commitment, proof } = req.body;
        if (!proposalId || !nullifier || !commitment || !proof) {
            throw new errorHandler_1.ApiError(400, 'Missing required fields: proposalId, nullifier, commitment, proof');
        }
        if (!validation_1.validation.isValidProposalId(proposalId)) {
            throw new errorHandler_1.ApiError(400, 'Invalid proposal ID');
        }
        if (!validation_1.validation.isValidNullifier(nullifier)) {
            throw new errorHandler_1.ApiError(400, 'Invalid nullifier');
        }
        if (!validation_1.validation.isValidCommitment(commitment)) {
            throw new errorHandler_1.ApiError(400, 'Invalid commitment');
        }
        logger_1.logger.warn('Deprecated Groth16 voting requested - using quantum-vulnerable method');
        const txSignature = await votingService_1.votingService.voteWithZK(proposalId, req.user.address, nullifier, commitment, proof);
        logger_1.logger.info(`Vote submitted for proposal ${proposalId} by ${req.user.address}`);
        res.json({
            transactionSignature: txSignature,
            proposalId,
            message: 'Vote submitted (deprecated Groth16 - consider using STARK)',
            deprecated: true
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ApiError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        logger_1.logger.error('Error voting', error);
        res.status(500).json({ error: 'Failed to submit vote' });
    }
});
// POST /api/v1/governance/vote/stark
router.post('/vote/stark', auth_1.authMiddleware, async (req, res) => {
    try {
        const { proposalId, imageId } = req.body;
        if (!proposalId || !imageId) {
            throw new errorHandler_1.ApiError(400, 'Missing required fields: proposalId, imageId');
        }
        if (!validation_1.validation.isValidProposalId(proposalId)) {
            throw new errorHandler_1.ApiError(400, 'Invalid proposal ID');
        }
        const txSignature = await votingService_1.votingService.voteWithSTARK(proposalId, req.user.address, imageId);
        logger_1.logger.info(`Quantum-safe STARK vote submitted for proposal ${proposalId}`);
        res.json({
            transactionSignature: txSignature,
            proposalId,
            quantum_safe: true,
            message: 'Quantum-safe vote submitted via STARK proof'
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ApiError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        logger_1.logger.error('Error submitting STARK vote', error);
        res.status(500).json({ error: 'Failed to submit quantum-safe vote' });
    }
});
// POST /api/v1/governance/commitment/register
router.post('/commitment/register', auth_1.authMiddleware, async (req, res) => {
    try {
        const { commitment } = req.body;
        if (!commitment) {
            throw new errorHandler_1.ApiError(400, 'Missing required field: commitment');
        }
        if (!validation_1.validation.isValidCommitment(commitment)) {
            throw new errorHandler_1.ApiError(400, 'Invalid commitment format');
        }
        const txSignature = await votingService_1.votingService.registerCommitment(req.user.address, commitment);
        logger_1.logger.info(`Commitment registered for ${req.user.address}`);
        res.json({
            transactionSignature: txSignature,
            message: 'Commitment registration submitted'
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ApiError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        logger_1.logger.error('Error registering commitment', error);
        res.status(500).json({ error: 'Failed to register commitment' });
    }
});
exports.default = router;
//# sourceMappingURL=governance.js.map