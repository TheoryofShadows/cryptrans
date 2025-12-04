import { PublicKey } from '@solana/web3.js';
import { solanaService } from './solanaService';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface TreasuryInfo {
  address: string;
  balance: number;
  totalFunded: number;
  totalReleased: number;
  activeProposals: number;
}

export class TreasuryService {
  async getTreasuryInfo(): Promise<TreasuryInfo> {
    try {
      const connection = solanaService.getConnection();
      const programId = new PublicKey(config.programId);

      // Derive treasury PDA
      const [treasuryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('treasury')],
        programId
      );

      const accountInfo = await connection.getAccountInfo(treasuryPda);

      if (!accountInfo) {
        throw new Error('Treasury account not found');
      }

      const balance = await connection.getBalance(treasuryPda);

      logger.info('Retrieved treasury info');

      return {
        address: treasuryPda.toBase58(),
        balance: balance / 1e9,
        totalFunded: 0,
        totalReleased: 0,
        activeProposals: 0
      };
    } catch (error) {
      logger.error('Error getting treasury info', error);
      throw new Error('Failed to get treasury info');
    }
  }

  async releaseFunds(
    proposalId: number,
    amount: number,
    recipient: string
  ): Promise<string> {
    try {
      logger.info(`Releasing ${amount} tokens for proposal ${proposalId}`);

      // TODO: Create and send release_funds transaction

      return 'pending'; // Transaction signature
    } catch (error) {
      logger.error('Error releasing funds', error);
      throw new Error('Failed to release funds');
    }
  }

  async releaseFundsQuantumSafe(
    proposalId: number,
    amount: number,
    recipient: string
  ): Promise<string> {
    try {
      logger.info(`Releasing ${amount} tokens with quantum-safe signatures`);

      // TODO: Create and send release_funds_quantum_safe transaction

      return 'pending'; // Transaction signature
    } catch (error) {
      logger.error('Error releasing funds with quantum-safe signatures', error);
      throw new Error('Failed to release funds');
    }
  }
}

export const treasuryService = new TreasuryService();
