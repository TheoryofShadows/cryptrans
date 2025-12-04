import tweetnacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';

export const crypto = {
  verifySignature: (
    message: string,
    signature: string | Uint8Array,
    publicKey: string
  ): boolean => {
    try {
      const pubKeyBuffer = new PublicKey(publicKey).toBuffer();
      const messageBuffer = Buffer.from(message);
      const signatureBuffer = typeof signature === 'string'
        ? Buffer.from(signature, 'hex')
        : Buffer.from(signature);

      // Solana uses Ed25519 signatures
      return tweetnacl.sign.detached.verify(
        messageBuffer,
        signatureBuffer,
        pubKeyBuffer
      );
    } catch (error) {
      return false;
    }
  },

  hashMessage: (message: string): string => {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(message).digest('hex');
  },

  verifyProofOfWork: (message: string, hash: string, difficulty: number): boolean => {
    const crypto = require('crypto');
    const computed = crypto.createHash('sha256').update(message).digest('hex');
    return computed === hash && hash.startsWith('0'.repeat(difficulty));
  },
};
