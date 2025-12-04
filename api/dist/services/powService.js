"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.powService = exports.PowService = void 0;
const crypto = __importStar(require("crypto"));
const logger_1 = require("../utils/logger");
class PowService {
    validateProofOfWork(message, hash, difficulty) {
        try {
            const computed = crypto.createHash('sha256').update(message).digest('hex');
            const isValid = computed === hash && hash.startsWith('0'.repeat(difficulty));
            if (isValid) {
                logger_1.logger.info(`Valid PoW verified for difficulty ${difficulty}`);
            }
            else {
                logger_1.logger.warn(`Invalid PoW: computed=${computed}, provided=${hash}`);
            }
            return isValid;
        }
        catch (error) {
            logger_1.logger.error('Error validating PoW', error);
            throw new Error('Failed to validate proof of work');
        }
    }
    generateProofOfWork(message, difficulty) {
        try {
            let nonce = 0;
            let hash = '';
            const targetPrefix = '0'.repeat(difficulty);
            const startTime = Date.now();
            const maxIterations = 10000000;
            while (!hash.startsWith(targetPrefix)) {
                nonce++;
                const input = `${message}${nonce}`;
                hash = crypto.createHash('sha256').update(input).digest('hex');
                if (nonce > maxIterations) {
                    throw new Error('Could not generate valid PoW within reasonable time');
                }
            }
            const elapsed = Date.now() - startTime;
            logger_1.logger.info(`Generated PoW (difficulty ${difficulty}) in ${elapsed}ms after ${nonce} iterations`);
            return { nonce: nonce.toString(), hash };
        }
        catch (error) {
            logger_1.logger.error('Error generating PoW', error);
            throw new Error('Failed to generate proof of work');
        }
    }
    getEstimatedWorkTime(difficulty) {
        // Rough estimate: each level of difficulty increases work by ~2^32
        // On modern hardware, sha256 does ~10M hashes/second
        const hashes_per_second = 10000000;
        const expected_iterations = Math.pow(2, difficulty * 4); // Each digit = 4 bits
        return (expected_iterations / hashes_per_second) * 1000; // milliseconds
    }
}
exports.PowService = PowService;
exports.powService = new PowService();
//# sourceMappingURL=powService.js.map