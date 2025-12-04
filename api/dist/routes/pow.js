"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const powService_1 = require("../services/powService");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
// POST /api/v1/pow/validate
router.post('/validate', auth_1.optionalAuthMiddleware, (req, res) => {
    try {
        const { message, hash, difficulty } = req.body;
        if (!message || !hash || difficulty === undefined) {
            throw new errorHandler_1.ApiError(400, 'Missing required fields: message, hash, difficulty');
        }
        if (!Number.isInteger(difficulty) || difficulty < 0) {
            throw new errorHandler_1.ApiError(400, 'Difficulty must be a non-negative integer');
        }
        const isValid = powService_1.powService.validateProofOfWork(message, hash, difficulty);
        res.json({
            valid: isValid,
            difficulty,
            message: isValid ? 'Valid proof of work' : 'Invalid proof of work'
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ApiError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        logger_1.logger.error('Error validating PoW', error);
        res.status(500).json({ error: 'Failed to validate proof of work' });
    }
});
// POST /api/v1/pow/generate
router.post('/generate', auth_1.optionalAuthMiddleware, (req, res) => {
    try {
        const { message, difficulty } = req.body;
        if (!message) {
            throw new errorHandler_1.ApiError(400, 'Missing required field: message');
        }
        const diff = difficulty || 2;
        if (!Number.isInteger(diff) || diff < 0 || diff > 10) {
            throw new errorHandler_1.ApiError(400, 'Difficulty must be between 0 and 10');
        }
        logger_1.logger.info(`Generating PoW with difficulty ${diff}`);
        // Note: This is computationally intensive and should have rate limiting
        const { nonce, hash } = powService_1.powService.generateProofOfWork(message, diff);
        res.json({
            message,
            difficulty: diff,
            nonce,
            hash,
            estimatedTimeMs: powService_1.powService.getEstimatedWorkTime(diff)
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ApiError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        logger_1.logger.error('Error generating PoW', error);
        res.status(500).json({ error: 'Failed to generate proof of work' });
    }
});
// GET /api/v1/pow/difficulty
router.get('/difficulty', (req, res) => {
    try {
        const difficulty = 2;
        const estimatedTime = powService_1.powService.getEstimatedWorkTime(difficulty);
        res.json({
            defaultDifficulty: difficulty,
            estimatedTimeMs: estimatedTime,
            estimatedTimeSeconds: Math.round(estimatedTime / 1000),
            description: 'Default proof of work difficulty for proposal creation'
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting difficulty info', error);
        res.status(500).json({ error: 'Failed to get difficulty info' });
    }
});
exports.default = router;
//# sourceMappingURL=pow.js.map