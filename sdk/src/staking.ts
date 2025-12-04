import { PublicKey, SystemProgram } from '@solana/web3.js';
import { CrypTransClient } from './client';
import { StakeInfo, TransactionResult } from './types';

export class StakingClient {
  constructor(private client: CrypTransClient) {}

  async getStakeInfo(userAddress: PublicKey): Promise<StakeInfo | null> {
    try {
      const program = this.client.getProgram();
      const [stakePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), userAddress.toBuffer()],
        program.programId
      );

      const stake = await program.account.stake.fetch(stakePda);
      return stake as StakeInfo;
    } catch (error) {
      console.error('Failed to fetch stake info:', error);
      return null;
    }
  }

  async initializeStake(user: PublicKey): Promise<TransactionResult> {
    try {
      const program = this.client.getProgram();
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
