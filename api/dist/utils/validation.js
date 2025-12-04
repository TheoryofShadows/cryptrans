"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validation = void 0;
const web3_js_1 = require("@solana/web3.js");
exports.validation = {
    isValidPublicKey: (key) => {
        try {
            new web3_js_1.PublicKey(key);
            return true;
        }
        catch {
            return false;
        }
    },
    isValidProposalId: (id) => {
        return Number.isInteger(id) && id > 0 && id < Number.MAX_SAFE_INTEGER;
    },
    isValidAmount: (amount) => {
        return Number.isInteger(amount) && amount > 0;
    },
    isValidDescription: (desc) => {
        return typeof desc === 'string' && desc.length > 0 && desc.length <= 200;
    },
    isValidPowNonce: (nonce) => {
        return typeof nonce === 'string' && nonce.length > 0 && nonce.length <= 1000;
    },
    isValidNullifier: (nullifier) => {
        if (!Array.isArray(nullifier) && typeof nullifier !== 'string')
            return false;
        const bytes = typeof nullifier === 'string' ? Buffer.from(nullifier, 'hex') : Buffer.from(nullifier);
        return bytes.length === 32;
    },
    isValidCommitment: (commitment) => {
        if (!Array.isArray(commitment) && typeof commitment !== 'string')
            return false;
        const bytes = typeof commitment === 'string' ? Buffer.from(commitment, 'hex') : Buffer.from(commitment);
        return bytes.length === 32;
    },
};
//# sourceMappingURL=validation.js.map