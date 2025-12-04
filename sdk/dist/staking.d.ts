import { PublicKey } from '@solana/web3.js';
import { CrypTransClient } from './client';
import { StakeInfo, TransactionResult } from './types';
export declare class StakingClient {
    private client;
    constructor(client: CrypTransClient);
    getStakeInfo(userAddress: PublicKey): Promise<StakeInfo | null>;
    initializeStake(user: PublicKey): Promise<TransactionResult>;
    stakeTokens(user: PublicKey, amount: number): Promise<TransactionResult>;
}
//# sourceMappingURL=staking.d.ts.map