import { PublicKey } from '@solana/web3.js';

export interface CrypTransConfig {
  rpcUrl: string;
  programId: PublicKey;
  network: 'devnet' | 'mainnet' | 'testnet';
}

export interface StakeInfo {
  user: PublicKey;
  amount: number;
  lastDemurrage: number;
  commitment: Uint8Array;
}

export interface ProposalInfo {
  id: number;
  creator: PublicKey;
  description: string;
  fundingNeeded: number;
  votes: number;
  funded: boolean;
  createdAt: number;
  expiresAt: number;
}

export interface VoteReceipt {
  proposalId: number;
  voter: PublicKey;
  voteWeight: number;
  votedAt: number;
  nullifier: Uint8Array;
}

export interface TreasuryInfo {
  address: PublicKey;
  balance: number;
  totalFunded: number;
  totalReleased: number;
}

export interface TransactionResult {
  signature: string;
  confirmed: boolean;
  error?: string;
}

export interface ZKProof {
  a: Uint8Array;
  b: Uint8Array;
  c: Uint8Array;
}

export interface STARKProof {
  proof: Uint8Array;
  imageId: Uint8Array;
}
