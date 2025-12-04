"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retry = exports.sleep = exports.logger = void 0;
exports.logger = {
    info: (message, data) => {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data || '');
    },
    error: (message, error) => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error || '');
    },
    warn: (message, data) => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data || '');
    },
    debug: (message, data) => {
        if (process.env.DEBUG) {
            console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, data || '');
        }
    }
};
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
exports.sleep = sleep;
const retry = async (fn, maxRetries = 3, delayMs = 1000) => {
    let lastError = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt < maxRetries - 1) {
                await (0, exports.sleep)(delayMs * Math.pow(2, attempt));
            }
        }
    }
    throw lastError || new Error('Max retries exceeded');
};
exports.retry = retry;
//# sourceMappingURL=utils.js.map