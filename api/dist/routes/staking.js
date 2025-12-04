"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const stakingService_1 = require("../services/stakingService");
const validation_1 = require("../utils/validation");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
// GET /api/v1/staking/balance
router.get('/balance', auth_1.authMiddleware, async (req, res) => {
    try {
        const stakeInfo = await stakingService_1.stakingService.getStakeInfo(req.user.address);
        if (!stakeInfo) {
            return res.json({
                address: req.user.address,
                amount: 0,
                lastDemurrage: 0,
                status: 'not_initialized'
            });
        }
        res.json(stakeInfo);
    }
    catch (error) {
        logger_1.logger.error('Error getting stake balance', error);
        res.status(500).json({ error: 'Failed to get stake balance' });
    }
});
// POST /api/v1/staking/initialize
router.post('/initialize', auth_1.authMiddleware, async (req, res) => {
    try {
        const stakePda = await stakingService_1.stakingService.initializeStake(req.user.address);
        logger_1.logger.info(`Stake initialized for ${req.user.address}`);
        res.json({
            stakePda,
            message: 'Stake account initialization submitted'
        });
    }
    catch (error) {
        logger_1.logger.error('Error initializing stake', error);
        res.status(500).json({ error: 'Failed to initialize stake' });
    }
});
// POST /api/v1/staking/deposit
router.post('/deposit', auth_1.authMiddleware, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount) {
            throw new errorHandler_1.ApiError(400, 'Missing required field: amount');
        }
        if (!validation_1.validation.isValidAmount(amount)) {
            throw new errorHandler_1.ApiError(400, 'Amount must be a positive integer');
        }
        const txSignature = await stakingService_1.stakingService.stakeTokens(req.user.address, amount);
        logger_1.logger.info(`Staked ${amount} tokens for ${req.user.address}`);
        res.json({
            transactionSignature: txSignature,
            amount,
            message: 'Staking transaction submitted'
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ApiError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        logger_1.logger.error('Error staking tokens', error);
        res.status(500).json({ error: 'Failed to stake tokens' });
    }
});
// POST /api/v1/staking/demurrage
router.post('/demurrage', auth_1.authMiddleware, async (req, res) => {
    try {
        const { demurrageRate } = req.body;
        if (demurrageRate === undefined) {
            throw new errorHandler_1.ApiError(400, 'Missing required field: demurrageRate');
        }
        if (!Number.isInteger(demurrageRate) || demurrageRate < 0) {
            throw new errorHandler_1.ApiError(400, 'Demurrage rate must be a non-negative integer');
        }
        const txSignature = await stakingService_1.stakingService.applyDemurrage(req.user.address, demurrageRate);
        logger_1.logger.info(`Applied demurrage for ${req.user.address}`);
        res.json({
            transactionSignature: txSignature,
            demurrageRate,
            message: 'Demurrage application submitted'
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ApiError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        logger_1.logger.error('Error applying demurrage', error);
        res.status(500).json({ error: 'Failed to apply demurrage' });
    }
});
exports.default = router;
//# sourceMappingURL=staking.js.map