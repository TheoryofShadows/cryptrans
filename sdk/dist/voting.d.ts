import { PublicKey } from '@solana/web3.js';
import { CrypTransClient } from './client';
import { STARKProof, TransactionResult } from './types';
export declare class VotingClient {
    private client;
    constructor(client: CrypTransClient);
    voteWithSTARK(proposalId: number, voter: PublicKey, proof: STARKProof, imageId: Uint8Array): Promise<TransactionResult>;
    registerCommitment(user: PublicKey, commitment: Uint8Array): Promise<TransactionResult>;
}
//# sourceMappingURL=voting.d.ts.map