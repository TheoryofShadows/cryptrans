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
exports.TransactionBuilder = void 0;
const crypto = __importStar(require("crypto"));
class TransactionBuilder {
    static generateProofOfWork(message, difficulty) {
        let nonce = 0;
        let hash = '';
        const targetPrefix = '0'.repeat(difficulty);
        while (!hash.startsWith(targetPrefix)) {
            nonce++;
            const input = `${message}${nonce}`;
            hash = crypto.createHash('sha256').update(input).digest('hex');
            if (nonce > 10000000) {
                throw new Error('Could not generate valid PoW within reasonable time');
            }
        }
        return { nonce: nonce.toString(), hash };
    }
    static verifyProofOfWork(message, hash, nonce) {
        const input = `${message}${nonce}`;
        const computed = crypto.createHash('sha256').update(input).digest('hex');
        return computed === hash;
    }
    static generateSecret() {
        return crypto.randomBytes(32);
    }
    static hashSecret(secret) {
        return crypto.createHash('sha256').update(secret).digest('hex');
    }
    static generateNullifier(secret, proposalId) {
        const input = Buffer.concat([secret, Buffer.from([proposalId])]);
        return crypto.createHash('sha256').update(input).digest('hex');
    }
}
exports.TransactionBuilder = TransactionBuilder;
//# sourceMappingURL=transactions.js.map