"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const validation_1 = require("../utils/validation");
const crypto_1 = require("../utils/crypto");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
// POST /api/v1/auth/login
router.post('/login', (req, res) => {
    try {
        const { address, message, signature } = req.body;
        if (!address || !message || !signature) {
            throw new errorHandler_1.ApiError(400, 'Missing required fields: address, message, signature');
        }
        if (!validation_1.validation.isValidPublicKey(address)) {
            throw new errorHandler_1.ApiError(400, 'Invalid Solana address');
        }
        // Verify the signature
        const isValid = crypto_1.crypto.verifySignature(message, signature, address);
        if (!isValid) {
            throw new errorHandler_1.ApiError(401, 'Invalid signature');
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ address }, config_1.config.jwtSecret, {
            expiresIn: '24h'
        });
        logger_1.logger.info(`User ${address} authenticated successfully`);
        res.json({
            token,
            address,
            expiresIn: config_1.config.jwtExpiry
        });
    }
    catch (error) {
        if (error instanceof errorHandler_1.ApiError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        logger_1.logger.error('Login error', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});
// GET /api/v1/auth/nonce
router.get('/nonce', (req, res) => {
    try {
        const nonce = Math.random().toString(36).substring(2, 15);
        const message = `Sign this message to authenticate: ${nonce}`;
        res.json({
            nonce,
            message,
            timestamp: Date.now()
        });
    }
    catch (error) {
        logger_1.logger.error('Nonce generation error', error);
        res.status(500).json({ error: 'Failed to generate nonce' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map