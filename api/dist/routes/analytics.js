"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const analyticsService_1 = require("../services/analyticsService");
const validation_1 = require("../utils/validation");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
// GET /api/v1/analytics/dao
router.get('/dao', auth_1.optionalAuthMiddleware, async (req, res) => {
    try {
        const stats = await analyticsService_1.analyticsService.getDaoStats();
        res.json({
            timestamp: Date.now(),
            data: stats
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting DAO stats', error);
        res.status(500).json({ error: 'Failed to get DAO stats' });
    }
});
// GET /api/v1/analytics/proposals
router.get('/proposals', auth_1.optionalAuthMiddleware, async (req, res) => {
    try {
        const stats = await analyticsService_1.analyticsService.getProposalStats();
        res.json({
            timestamp: Date.now(),
            data: stats
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting proposal stats', error);
        res.status(500).json({ error: 'Failed to get proposal stats' });
    }
});
// GET /api/v1/analytics/voting/:proposalId
router.get('/voting/:proposalId', auth_1.optionalAuthMiddleware, async (req, res) => {
    try {
        const proposalId = parseInt(req.params.proposalId);
        if (!validation_1.validation.isValidProposalId(proposalId)) {
            throw new errorHandler_1.ApiError(400, 'Invalid proposal ID');
        }
        const stats = await analyticsService_1.analyticsService.getVotingStats(proposalId);
        res.json({
            proposalId,
            timestamp: Date.now(),
            data: stats
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ApiError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        logger_1.logger.error('Error getting voting stats', error);
        res.status(500).json({ error: 'Failed to get voting stats' });
    }
});
// GET /api/v1/analytics/voting/:proposalId/timeseries
router.get('/voting/:proposalId/timeseries', auth_1.optionalAuthMiddleware, async (req, res) => {
    try {
        const proposalId = parseInt(req.params.proposalId);
        const bucketSize = parseInt(req.query.bucketSize) || 3600;
        if (!validation_1.validation.isValidProposalId(proposalId)) {
            throw new errorHandler_1.ApiError(400, 'Invalid proposal ID');
        }
        if (!Number.isInteger(bucketSize) || bucketSize < 60) {
            throw new errorHandler_1.ApiError(400, 'Bucket size must be at least 60 seconds');
        }
        const timeseries = await analyticsService_1.analyticsService.getVotingTimeSeries(proposalId, bucketSize);
        res.json({
            proposalId,
            bucketSize,
            data: timeseries
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ApiError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        logger_1.logger.error('Error getting voting timeseries', error);
        res.status(500).json({ error: 'Failed to get voting timeseries' });
    }
});
exports.default = router;
//# sourceMappingURL=analytics.js.map