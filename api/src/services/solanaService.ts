import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { config } from '../config';
import { logger } from '../utils/logger';

export class SolanaService {
  private connection: Connection;
  private provider: anchor.AnchorProvider;

  constructor() {
    this.connection = new Connection(config.solanaRpcUrl, 'confirmed');

    const wallet = new anchor.Wallet(
      Keypair.fromSecretKey(
        Buffer.from(JSON.parse(process.env.WALLET_KEYPAIR || '[]'))
      )
    );

    this.provider = new anchor.AnchorProvider(
      this.connection,
      wallet,
      { commitment: 'confirmed' }
    );
  }

  getConnection(): Connection {
    return this.connection;
  }

  getProvider(): anchor.AnchorProvider {
    return this.provider;
  }

  async getBalance(publicKey: string): Promise<number> {
    try {
      const key = new PublicKey(publicKey);
      const balance = await this.connection.getBalance(key);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      logger.error('Error getting balance', error);
      throw new Error('Failed to get balance');
    }
  }

  async sendTransaction(transaction: Transaction, signers: Keypair[]): Promise<string> {
    try {
      const signature = await anchor.web3.sendAndConfirmTransaction(
        this.connection,
        transaction,
        signers
      );
      return signature;
    } catch (error) {
      logger.error('Error sending transaction', error);
      throw new Error('Failed to send transaction');
    }
  }

  async getTokenBalance(walletAddress: string, mintAddress: string): Promise<number> {
    try {
      const wallet = new PublicKey(walletAddress);
      const mint = new PublicKey(mintAddress);

      const ata = anchor.utils.token.associatedAddress({
        mint,
        owner: wallet
      });

      const accountInfo = await this.connection.getTokenAccountBalance(ata);
      return parseFloat(accountInfo.value.amount) / Math.pow(10, accountInfo.value.decimals);
    } catch (error) {
      logger.error('Error getting token balance', error);
      return 0;
    }
  }
}

export const solanaService = new SolanaService();
