"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crypto = void 0;
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const web3_js_1 = require("@solana/web3.js");
exports.crypto = {
    verifySignature: (message, signature, publicKey) => {
        try {
            const pubKeyBuffer = new web3_js_1.PublicKey(publicKey).toBuffer();
            const messageBuffer = Buffer.from(message);
            const signatureBuffer = typeof signature === 'string'
                ? Buffer.from(signature, 'hex')
                : Buffer.from(signature);
            // Solana uses Ed25519 signatures
            return tweetnacl_1.default.sign.detached.verify(messageBuffer, signatureBuffer, pubKeyBuffer);
        }
        catch (error) {
            return false;
        }
    },
    hashMessage: (message) => {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(message).digest('hex');
    },
    verifyProofOfWork: (message, hash, difficulty) => {
        const crypto = require('crypto');
        const computed = crypto.createHash('sha256').update(message).digest('hex');
        return computed === hash && hash.startsWith('0'.repeat(difficulty));
    },
};
//# sourceMappingURL=crypto.js.map