import { PublicKey } from '@solana/web3.js';
import * as crypto from 'crypto';

export class TransactionBuilder {
  static generateProofOfWork(message: string, difficulty: number): { nonce: string; hash: string } {
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

  static verifyProofOfWork(message: string, hash: string, nonce: string): boolean {
    const input = `${message}${nonce}`;
    const computed = crypto.createHash('sha256').update(input).digest('hex');
    return computed === hash;
  }

  static generateSecret(): Uint8Array {
    return crypto.randomBytes(32);
  }

  static hashSecret(secret: Uint8Array): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  static generateNullifier(secret: Uint8Array, proposalId: number): string {
    const input = Buffer.concat([secret, Buffer.from([proposalId])]);
    return crypto.createHash('sha256').update(input).digest('hex');
  }
}
