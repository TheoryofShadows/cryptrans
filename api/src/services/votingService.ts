import { PublicKey } from '@solana/web3.js';
import { solanaService } from './solanaService';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface VoteInfo {
  proposalId: number;
  voter: string;
  voteWeight: number;
  votedAt: number;
  nullifier: string;
}

export class VotingService {
  async getVote(proposalId: number, voter: string): Promise<VoteInfo | null> {
    try {
      const connection = solanaService.getConnection();
      const programId = new PublicKey(config.programId);
      const voterPubkey = new PublicKey(voter);

      // Derive PDA for vote record
      const [votePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('vote'),
          Buffer.from([proposalId]),
          voterPubkey.toBuffer()
        ],
        programId
      );

      const accountInfo = await connection.getAccountInfo(votePda);

      if (!accountInfo) {
        return null;
      }

      // TODO: Parse account data properly

      logger.info(`Retrieved vote for proposal ${proposalId}`);
      return null;
    } catch (error) {
      logger.error('Error getting vote', error);
      throw new Error('Failed to get vote');
    }
  }

  async registerCommitment(
    userAddress: string,
    commitment: string
  ): Promise<string> {
    try {
      logger.info(`Registering commitment for ${userAddress}`);

      // TODO: Create and send register_commitment transaction

      return 'pending'; // Transaction signature
    } catch (error) {
      logger.error('Error registering commitment', error);
      throw new Error('Failed to register commitment');
    }
  }

  async voteWithZK(
    proposalId: number,
    voter: string,
    nullifier: string,
    commitment: string,
    proof: {
      a: string;
      b: string;
      c: string;
    }
  ): Promise<string> {
    try {
      logger.warn('Using deprecated Groth16 voting (quantum-vulnerable)');

      // TODO: Create and send vote_with_zk transaction

      return 'pending'; // Transaction signature
    } catch (error) {
      logger.error('Error voting with ZK', error);
      throw new Error('Failed to vote');
    }
  }

  async voteWithSTARK(
    proposalId: number,
    voter: string,
    imageId: string
  ): Promise<string> {
    try {
      logger.info(`Voting with STARK proof for proposal ${proposalId}`);

      // TODO: Create and send vote_with_stark transaction

      return 'pending'; // Transaction signature
    } catch (error) {
      logger.error('Error voting with STARK', error);
      throw new Error('Failed to vote with STARK');
    }
  }
}

export const votingService = new VotingService();
