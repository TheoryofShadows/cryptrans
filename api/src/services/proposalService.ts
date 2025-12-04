import { PublicKey } from '@solana/web3.js';
import * as crypto from 'crypto';
import { solanaService } from './solanaService';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface ProposalInfo {
  id: number;
  creator: string;
  description: string;
  fundingNeeded: number;
  votes: number;
  funded: boolean;
  createdAt: number;
  expiresAt: number;
  powHash: string;
}

export class ProposalService {
  async getProposal(proposalId: number): Promise<ProposalInfo | null> {
    try {
      const connection = solanaService.getConnection();
      const programId = new PublicKey(config.programId);

      // Derive PDA for proposal account
      const [proposalPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('proposal'), Buffer.from([proposalId])],
        programId
      );

      const accountInfo = await connection.getAccountInfo(proposalPda);

      if (!accountInfo) {
        return null;
      }

      // TODO: Parse account data properly using program IDL

      logger.info(`Retrieved proposal ${proposalId}`);
      return null;
    } catch (error) {
      logger.error('Error getting proposal', error);
      throw new Error('Failed to get proposal');
    }
  }

  async getProposals(limit: number = 10): Promise<ProposalInfo[]> {
    try {
      const connection = solanaService.getConnection();
      const programId = new PublicKey(config.programId);

      // TODO: Query all proposal accounts from program
      // This would typically use getProgramAccounts with filters

      logger.info(`Retrieved ${limit} proposals`);
      return [];
    } catch (error) {
      logger.error('Error getting proposals', error);
      throw new Error('Failed to get proposals');
    }
  }

  generateProofOfWork(
    description: string,
    difficulty: number
  ): { nonce: string; hash: string } {
    let nonce = 0;
    let hash = '';

    const targetPrefix = '0'.repeat(difficulty);

    while (!hash.startsWith(targetPrefix)) {
      nonce++;
      const input = `${description}${nonce}`;
      hash = crypto.createHash('sha256').update(input).digest('hex');

      // Timeout after too many iterations
      if (nonce > 1000000) {
        throw new Error('Could not generate valid proof of work within reasonable time');
      }
    }

    return {
      nonce: nonce.toString(),
      hash
    };
  }

  async createProposal(
    creatorAddress: string,
    description: string,
    fundingNeeded: number,
    powDifficulty: number = 2
  ): Promise<string> {
    try {
      if (description.length > 200) {
        throw new Error('Description exceeds 200 character limit');
      }

      if (fundingNeeded > 1_000_000_000_000) {
        throw new Error('Funding amount exceeds maximum limit');
      }

      // Generate proof of work
      const { nonce } = this.generateProofOfWork(description, powDifficulty);

      logger.info(`Created proposal for ${creatorAddress}`);

      // TODO: Create and send create_proposal transaction

      return 'pending'; // Transaction signature
    } catch (error) {
      logger.error('Error creating proposal', error);
      throw new Error('Failed to create proposal');
    }
  }
}

export const proposalService = new ProposalService();
