import { PublicKey } from '@solana/web3.js';
import { CrypTransClient } from './client';
import { STARKProof, TransactionResult } from './types';

export class VotingClient {
  constructor(private client: CrypTransClient) {}

  async voteWithSTARK(
    proposalId: number,
    voter: PublicKey,
    proof: STARKProof,
    imageId: Uint8Array
  ): Promise<TransactionResult> {
    try {
      const program = this.client.getProgram();
      const [proposalPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('proposal'), Buffer.from([proposalId])],
        program.programId
      );

      const [stakePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), voter.toBuffer()],
        program.programId
      );

      const [voteRecordPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vote'), Buffer.from([proposalId]), voter.toBuffer()],
        program.programId
      );

      const tx = await program.methods
        .voteWithStark(Array.from(imageId))
        .accounts({
          proposal: proposalPda,
          stake: stakePda,
          voteRecord: voteRecordPda,
          voter
        })
        .transaction();

      return await this.client.sendTransaction(tx);
    } catch (error) {
      console.error('Failed to vote with STARK:', error);
      return {
        signature: '',
        confirmed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async registerCommitment(
    user: PublicKey,
    commitment: Uint8Array
  ): Promise<TransactionResult> {
    try {
      const program = this.client.getProgram();
      const [stakePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), user.toBuffer()],
        program.programId
      );

      const tx = await program.methods
        .registerCommitment(Array.from(commitment))
        .accounts({
          stake: stakePda,
          user
        })
        .transaction();

      return await this.client.sendTransaction(tx);
    } catch (error) {
      console.error('Failed to register commitment:', error);
      return {
        signature: '',
        confirmed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
