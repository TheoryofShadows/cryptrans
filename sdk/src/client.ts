import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { CrypTransConfig, TransactionResult } from './types';
import { logger } from './utils';

export class CrypTransClient {
  private connection: Connection;
  private provider: anchor.AnchorProvider;
  private program: anchor.Program;
  private config: CrypTransConfig;

  constructor(config: CrypTransConfig, wallet: anchor.Wallet) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl);
    this.provider = new anchor.AnchorProvider(
      this.connection,
      wallet,
      { commitment: 'confirmed' }
    );

    // IDL would be loaded from the program
    this.program = new anchor.Program(
      {} as any, // IDL would go here
      config.programId,
      this.provider
    );
  }

  getConnection(): Connection {
    return this.connection;
  }

  getProvider(): anchor.AnchorProvider {
    return this.provider;
  }

  getProgram(): anchor.Program {
    return this.program;
  }

  async sendTransaction(tx: Transaction): Promise<TransactionResult> {
    try {
      const signature = await anchor.web3.sendAndConfirmTransaction(
        this.connection,
        tx,
        [this.provider.wallet.payer]
      );

      logger.info(`Transaction confirmed: ${signature}`);

      return {
        signature,
        confirmed: true
      };
    } catch (error) {
      logger.error('Transaction failed', error);
      return {
        signature: '',
        confirmed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getBalance(address: PublicKey): Promise<number> {
    const balance = await this.connection.getBalance(address);
    return balance / 1e9; // Convert to SOL
  }

  static async createFromPrivateKey(
    config: CrypTransConfig,
    privateKey: Uint8Array | string
  ): Promise<CrypTransClient> {
    const keypair = typeof privateKey === 'string'
      ? Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'))
      : Keypair.fromSecretKey(privateKey);

    const wallet = new anchor.Wallet(keypair);
    return new CrypTransClient(config, wallet);
  }
}

let logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || '')
};
