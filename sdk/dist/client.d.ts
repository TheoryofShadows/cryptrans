import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { CrypTransConfig, TransactionResult } from './types';
export declare class CrypTransClient {
    private connection;
    private provider;
    private program?;
    private config;
    constructor(config: CrypTransConfig, wallet: anchor.Wallet);
    getConnection(): Connection;
    getProvider(): anchor.AnchorProvider;
    getProgram(): anchor.Program | undefined;
    sendTransaction(tx: Transaction): Promise<TransactionResult>;
    getBalance(address: PublicKey): Promise<number>;
    static createFromPrivateKey(config: CrypTransConfig, privateKey: Uint8Array | string): Promise<CrypTransClient>;
}
//# sourceMappingURL=client.d.ts.map