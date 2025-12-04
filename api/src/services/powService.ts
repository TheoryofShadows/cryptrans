import * as crypto from 'crypto';
import { logger } from '../utils/logger';

export class PowService {
  validateProofOfWork(
    message: string,
    hash: string,
    difficulty: number
  ): boolean {
    try {
      const computed = crypto.createHash('sha256').update(message).digest('hex');
      const isValid = computed === hash && hash.startsWith('0'.repeat(difficulty));

      if (isValid) {
        logger.info(`Valid PoW verified for difficulty ${difficulty}`);
      } else {
        logger.warn(`Invalid PoW: computed=${computed}, provided=${hash}`);
      }

      return isValid;
    } catch (error) {
      logger.error('Error validating PoW', error);
      throw new Error('Failed to validate proof of work');
    }
  }

  generateProofOfWork(message: string, difficulty: number): { nonce: string; hash: string } {
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
      logger.info(`Generated PoW (difficulty ${difficulty}) in ${elapsed}ms after ${nonce} iterations`);

      return { nonce: nonce.toString(), hash };
    } catch (error) {
      logger.error('Error generating PoW', error);
      throw new Error('Failed to generate proof of work');
    }
  }

  getEstimatedWorkTime(difficulty: number): number {
    // Rough estimate: each level of difficulty increases work by ~2^32
    // On modern hardware, sha256 does ~10M hashes/second
    const hashes_per_second = 10_000_000;
    const expected_iterations = Math.pow(2, difficulty * 4); // Each digit = 4 bits
    return (expected_iterations / hashes_per_second) * 1000; // milliseconds
  }
}

export const powService = new PowService();
