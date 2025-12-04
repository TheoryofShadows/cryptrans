"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const treasuryService_1 = require("../services/treasuryService");
const validation_1 = require("../utils/validation");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
// GET /api/v1/treasury/status
router.get('/status', auth_1.optionalAuthMiddleware, async (req, res) => {
    try {
        const treasuryInfo = await treasuryService_1.treasuryService.getTreasuryInfo();
        res.json(treasuryInfo);
    }
    catch (error) {
        logger_1.logger.error('Error getting treasury info', error);
        res.status(500).json({ error: 'Failed to get treasury info' });
    }
});
// POST /api/v1/treasury/release
router.post('/release', auth_1.authMiddleware, async (req, res) => {
    try {
        const { proposalId, amount, recipient } = req.body;
        if (!proposalId || !amount || !recipient) {
            throw new errorHandler_1.ApiError(400, 'Missing required fields: proposalId, amount, recipient');
        }
        if (!validation_1.validation.isValidProposalId(proposalId)) {
            throw new errorHandler_1.ApiError(400, 'Invalid proposal ID');
        }
        if (!validation_1.validation.isValidAmount(amount)) {
            throw new errorHandler_1.ApiError(400, 'Amount must be a positive integer');
        }
        if (!validation_1.validation.isValidPublicKey(recipient)) {
            throw new errorHandler_1.ApiError(400, 'Invalid recipient address');
        }
        const txSignature = await treasuryService_1.treasuryService.releaseFunds(proposalId, amount, recipient);
        logger_1.logger.info(`Fund release initiated by ${req.user.address} for proposal ${proposalId}`);
        res.json({
            transactionSignature: txSignature,
            proposalId,
            amount,
            recipient,
            message: 'Fund release submitted'
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ApiError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        logger_1.logger.error('Error releasing funds', error);
        res.status(500).json({ error: 'Failed to release funds' });
    }
});
// POST /api/v1/treasury/release-quantum-safe
router.post('/release-quantum-safe', auth_1.authMiddleware, async (req, res) => {
    try {
        const { proposalId, amount, recipient } = req.body;
        if (!proposalId || !amount || !recipient) {
            throw new errorHandler_1.ApiError(400, 'Missing required fields: proposalId, amount, recipient');
        }
        if (!validation_1.validation.isValidProposalId(proposalId)) {
            throw new errorHandler_1.ApiError(400, 'Invalid proposal ID');
        }
        if (!validation_1.validation.isValidAmount(amount)) {
            throw new errorHandler_1.ApiError(400, 'Amount must be a positive integer');
        }
        if (!validation_1.validation.isValidPublicKey(recipient)) {
            throw new errorHandler_1.ApiError(400, 'Invalid recipient address');
        }
        const txSignature = await treasuryService_1.treasuryService.releaseFundsQuantumSafe(proposalId, amount, recipient);
        logger_1.logger.info(`Quantum-safe fund release initiated by ${req.user.address}`);
        res.json({
            transactionSignature: txSignature,
            proposalId,
            amount,
            recipient,
            quantum_safe: true,
            message: 'Quantum-safe fund release submitted'
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ApiError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        logger_1.logger.error('Error releasing quantum-safe funds', error);
        res.status(500).json({ error: 'Failed to release quantum-safe funds' });
    }
});
exports.default = router;
//# sourceMappingURL=treasury.js.map