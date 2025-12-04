"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = void 0;
const config_1 = require("../config");
const store = {};
const rateLimiter = (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    if (!store[key]) {
        store[key] = { count: 0, resetTime: now + config_1.config.rateLimitWindow };
    }
    const record = store[key];
    if (now > record.resetTime) {
        record.count = 0;
        record.resetTime = now + config_1.config.rateLimitWindow;
    }
    record.count++;
    res.set('X-RateLimit-Limit', config_1.config.rateLimitMax.toString());
    res.set('X-RateLimit-Remaining', Math.max(0, config_1.config.rateLimitMax - record.count).toString());
    res.set('X-RateLimit-Reset', record.resetTime.toString());
    if (record.count > config_1.config.rateLimitMax) {
        return res.status(429).json({
            error: 'Too many requests',
            retryAfter: Math.ceil((record.resetTime - now) / 1000)
        });
    }
    next();
};
exports.rateLimiter = rateLimiter;
//# sourceMappingURL=rateLimiter.js.map