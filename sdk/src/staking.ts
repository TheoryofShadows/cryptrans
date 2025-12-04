import { PublicKey, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { CrypTransClient } from './client';
import { StakeInfo, TransactionResult } from './types';

export class StakingClient {
  constructor(private client: CrypTransClient) {}

  async getStakeInfo(userAddress: PublicKey): Promise<StakeInfo | null> {
    try {
      const program = this.client.getProgram();
      if (!program) {
        throw new Error('Program not initialized - IDL not loaded');
      }

      const [stakePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), userAddress.toBuffer()],
        program.programId
      );

      // TODO: Fetch stake account when IDL is loaded
      // const stake = await program.account.stake.fetch(stakePda);
      // return stake as StakeInfo;
      console.log('Stake PDA:', stakePda.toString());
      return null; // Placeholder until IDL is loaded
    } catch (error) {
      console.error('Failed to fetch stake info:', error);
      return null;
    }
  }

  async initializeStake(user: PublicKey): Promise<TransactionResult> {
    try {
      const program = this.client.getProgram();
      if (!program) {
        throw new Error('Program not initialized - IDL not loaded');
      }

      const [stakePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), user.toBuffer()],
        program.programId
      );

      const tx = await program.methods
        .initializeStake()
        .accounts({
          stake: stakePda,
          user,
          systemProgram: SystemProgram.programId
        })
        .transaction();

      return await this.client.sendTransaction(tx);
    } catch (error) {
      console.error('Failed to initialize stake:', error);
      return {
        signature: '',
        confirmed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async stakeTokens(
    user: PublicKey,
    amount: number
  ): Promise<TransactionResult> {
    try {
      const program = this.client.getProgram();
      if (!program) {
        throw new Error('Program not initialized - IDL not loaded');
      }

      const [stakePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), user.toBuffer()],
        program.programId
      );

      const tx = await program.methods
        .stakeTokens(new anchor.BN(amount))
        .accounts({
          stake: stakePda,
          user
        })
        .transaction();

      return await this.client.sendTransaction(tx);
    } catch (error) {
      console.error('Failed to stake tokens:', error);
      return {
        signature: '',
        confirmed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
