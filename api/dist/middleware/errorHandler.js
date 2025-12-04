"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.ApiError = void 0;
const logger_1 = require("../utils/logger");
class ApiError extends Error {
    constructor(statusCode, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.details = details;
        this.name = 'ApiError';
    }
}
exports.ApiError = ApiError;
const errorHandler = (err, req, res, next) => {
    if (err instanceof ApiError) {
        logger_1.logger.error(`API Error: ${err.message}`, err.details);
        return res.status(err.statusCode).json({
            error: err.message,
            ...(err.details && { details: err.details })
        });
    }
    logger_1.logger.error('Unhandled error', err);
    return res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map