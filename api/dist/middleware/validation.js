"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequestBody = exports.validateJson = void 0;
const validateJson = (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'DELETE') {
        if (!req.is('application/json')) {
            return res.status(400).json({ error: 'Content-Type must be application/json' });
        }
    }
    next();
};
exports.validateJson = validateJson;
const validateRequestBody = (requiredFields) => {
    return (req, res, next) => {
        for (const field of requiredFields) {
            if (!(field in req.body)) {
                return res.status(400).json({
                    error: `Missing required field: ${field}`
                });
            }
        }
        next();
    };
};
exports.validateRequestBody = validateRequestBody;
//# sourceMappingURL=validation.js.map