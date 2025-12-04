import { PublicKey } from '@solana/web3.js';

export const validation = {
  isValidPublicKey: (key: string): boolean => {
    try {
      new PublicKey(key);
      return true;
    } catch {
      return false;
    }
  },

  isValidProposalId: (id: any): boolean => {
    return Number.isInteger(id) && id > 0 && id < Number.MAX_SAFE_INTEGER;
  },

  isValidAmount: (amount: any): boolean => {
    return Number.isInteger(amount) && amount > 0;
  },

  isValidDescription: (desc: string): boolean => {
    return typeof desc === 'string' && desc.length > 0 && desc.length <= 200;
  },

  isValidPowNonce: (nonce: string): boolean => {
    return typeof nonce === 'string' && nonce.length > 0 && nonce.length <= 1000;
  },

  isValidNullifier: (nullifier: any): boolean => {
    if (!Array.isArray(nullifier) && typeof nullifier !== 'string') return false;
    const bytes = typeof nullifier === 'string' ? Buffer.from(nullifier, 'hex') : Buffer.from(nullifier);
    return bytes.length === 32;
  },

  isValidCommitment: (commitment: any): boolean => {
    if (!Array.isArray(commitment) && typeof commitment !== 'string') return false;
    const bytes = typeof commitment === 'string' ? Buffer.from(commitment, 'hex') : Buffer.from(commitment);
    return bytes.length === 32;
  },
};
