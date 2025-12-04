"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const proposalService_1 = require("../services/proposalService");
const powService_1 = require("../services/powService");
const validation_1 = require("../utils/validation");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
// GET /api/v1/proposals
router.get('/', auth_1.optionalAuthMiddleware, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 100);
        const proposals = await proposalService_1.proposalService.getProposals(limit);
        res.json({
            data: proposals,
            count: proposals.length
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching proposals', error);
        res.status(500).json({ error: 'Failed to fetch proposals' });
    }
});
// GET /api/v1/proposals/:id
router.get('/:id', auth_1.optionalAuthMiddleware, async (req, res) => {
    try {
        const proposalId = parseInt(req.params.id);
        if (!validation_1.validation.isValidProposalId(proposalId)) {
            throw new errorHandler_1.ApiError(400, 'Invalid proposal ID');
        }
        const proposal = await proposalService_1.proposalService.getProposal(proposalId);
        if (!proposal) {
            throw new errorHandler_1.ApiError(404, 'Proposal not found');
        }
        res.json(proposal);
    }
    catch (error) {
        if (error instanceof errorHandler_1.ApiError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        logger_1.logger.error('Error fetching proposal', error);
        res.status(500).json({ error: 'Failed to fetch proposal' });
    }
});
// POST /api/v1/proposals
router.post('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { description, fundingNeeded, difficulty } = req.body;
        if (!description || !fundingNeeded) {
            throw new errorHandler_1.ApiError(400, 'Missing required fields: description, fundingNeeded');
        }
        if (!validation_1.validation.isValidDescription(description)) {
            throw new errorHandler_1.ApiError(400, 'Description must be 1-200 characters');
        }
        if (!validation_1.validation.isValidAmount(fundingNeeded)) {
            throw new errorHandler_1.ApiError(400, 'Funding amount must be a positive integer');
        }
        // Generate PoW for the proposal
        const pow = proposalService_1.proposalService.generateProofOfWork(description, difficulty || 2);
        // Create the proposal
        const txSignature = await proposalService_1.proposalService.createProposal(req.user.address, description, fundingNeeded, difficulty || 2);
        logger_1.logger.info(`Proposal created by ${req.user.address}`);
        res.json({
            transactionSignature: txSignature,
            proofOfWork: pow,
            message: 'Proposal creation submitted. Wait for confirmation.'
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ApiError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        logger_1.logger.error('Error creating proposal', error);
        res.status(500).json({ error: 'Failed to create proposal' });
    }
});
// GET /api/v1/proposals/:id/pow-difficulty
router.get('/:id/pow-difficulty', (req, res) => {
    try {
        const difficulty = 2; // Default difficulty
        const estimatedTime = powService_1.powService.getEstimatedWorkTime(difficulty);
        res.json({
            difficulty,
            estimatedTimeMs: estimatedTime,
            estimatedTimeSeconds: Math.round(estimatedTime / 1000)
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting PoW difficulty', error);
        res.status(500).json({ error: 'Failed to get PoW difficulty' });
    }
});
exports.default = router;
//# sourceMappingURL=proposals.js.map