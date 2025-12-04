"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
const validation_1 = require("./middleware/validation");
// Routes
const auth_1 = __importDefault(require("./routes/auth"));
const proposals_1 = __importDefault(require("./routes/proposals"));
const staking_1 = __importDefault(require("./routes/staking"));
const treasury_1 = __importDefault(require("./routes/treasury"));
const governance_1 = __importDefault(require("./routes/governance"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const pow_1 = __importDefault(require("./routes/pow"));
const app = (0, express_1.default)();
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: config_1.config.corsOrigins,
    credentials: true,
}));
app.use(express_1.default.json());
app.use(validation_1.validateJson);
app.use(rateLimiter_1.rateLimiter);
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: Date.now(),
        version: '1.0.0',
        network: config_1.config.solanaNetwork,
    });
});
// API routes
app.use('/api/v1/auth', auth_1.default);
app.use('/api/v1/proposals', proposals_1.default);
app.use('/api/v1/staking', staking_1.default);
app.use('/api/v1/treasury', treasury_1.default);
app.use('/api/v1/governance', governance_1.default);
app.use('/api/v1/analytics', analytics_1.default);
app.use('/api/v1/pow', pow_1.default);
// Error handling
app.use(errorHandler_1.errorHandler);
// Start server
const PORT = config_1.config.port;
app.listen(PORT, () => {
    logger_1.logger.info(`CrypTrans API server running on port ${PORT}`);
    logger_1.logger.info(`Network: ${config_1.config.solanaNetwork}`);
    logger_1.logger.info(`Program ID: ${config_1.config.programId}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map