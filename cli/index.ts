#!/usr/bin/env node

/**
 * CrypTrans CLI - Command-line interface for decentralized transhuman project funding
 *
 * Usage:
 *   cryptrans propose --name "Project Name" --description "..." --funding 1000000
 *   cryptrans vote --project-id [ID] --choice yes
 *   cryptrans oracle-register --collateral 100
 *   cryptrans verify --project-id [ID]
 *   cryptrans check-balance
 */

import * as fs from "fs";
import * as path from "path";
import { program } from "commander";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor";
import idl from "../target/idl/cryptrans.json";
import {
  registerOracleCommand,
  proposeProjectCommand,
  voteCommand,
  verifyMilestoneCommand,
  checkBalanceCommand,
  statusCommand,
  archiveCommand,
} from "./commands";

// Constants
const PROGRAM_ID = new PublicKey("B346Vx1KonmcvcHrXq6ukyNBKVTZKpmB79LESakd6ALB");
const DEVNET_RPC = "https://api.devnet.solana.com";

/**
 * Load wallet keypair from file
 */
function loadWallet(walletPath?: string): Keypair {
  const defaultPath = path.join(process.env.HOME || "/root", ".config/solana/id.json");
  const keyPath = walletPath || defaultPath;

  try {
    const secretKey = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
  } catch (err) {
    console.error(`❌ Failed to load wallet from ${keyPath}`);
    console.error("Please ensure your Solana keypair is set up:");
    console.error("  solana-keygen new --outfile ~/.config/solana/id.json");
    process.exit(1);
  }
}

/**
 * Initialize Anchor provider
 */
function initializeProvider(rpcUrl: string, walletPath?: string) {
  const wallet = loadWallet(walletPath);
  const connection = new Connection(rpcUrl, "processed");
  const provider = new AnchorProvider(connection, { publicKey: wallet.publicKey, signTransaction: async (tx) => tx, signAllTransactions: async (txs) => txs }, {});
  setProvider(provider);
  return { provider, wallet };
}

/**
 * Main CLI setup
 */
async function main() {
  program
    .name("cryptrans")
    .description("CrypTrans - Decentralized DAO for funding transhuman futures")
    .version("0.1.0");

  // Global options
  program
    .option("--rpc <url>", "Solana RPC endpoint", DEVNET_RPC)
    .option("--wallet <path>", "Path to Solana keypair")
    .option("--verbose", "Verbose output");

  // Oracle Commands
  program
    .command("oracle-register")
    .description("Register as an oracle with collateral stake")
    .requiredOption("--collateral <amount>", "SOL to stake as collateral")
    .option("--rpc <url>", "Solana RPC endpoint", DEVNET_RPC)
    .option("--wallet <path>", "Path to Solana keypair")
    .action(async (options) => {
      try {
        const { provider, wallet } = initializeProvider(options.rpc, options.wallet);
        await registerOracleCommand(provider, wallet, {
          collateral: parseFloat(options.collateral),
          verbose: options.verbose || false,
        });
      } catch (err) {
        console.error("❌ Oracle registration failed:", err);
        process.exit(1);
      }
    });

  // Project Commands
  program
    .command("propose")
    .description("Propose a new transhuman project for funding")
    .requiredOption("--name <name>", "Project name")
    .requiredOption("--description <desc>", "Project description")
    .requiredOption("--funding <amount>", "Total funding needed in SOL")
    .option("--tranches <count>", "Number of tranches (default: 5)", "5")
    .option("--rpc <url>", "Solana RPC endpoint", DEVNET_RPC)
    .option("--wallet <path>", "Path to Solana keypair")
    .action(async (options) => {
      try {
        const { provider, wallet } = initializeProvider(options.rpc, options.wallet);
        await proposeProjectCommand(provider, wallet, {
          name: options.name,
          description: options.description,
          fundingNeeded: parseFloat(options.funding),
          trancheCount: parseInt(options.tranches),
          verbose: options.verbose || false,
        });
      } catch (err) {
        console.error("❌ Project proposal failed:", err);
        process.exit(1);
      }
    });

  // Voting Commands
  program
    .command("vote")
    .description("Vote on a project proposal or tranche release")
    .requiredOption("--project-id <id>", "Project ID (base58)")
    .requiredOption("--choice <choice>", "Vote choice: yes, no, or abstain")
    .option("--stake <amount>", "Amount to vote with (optional, uses full balance)")
    .option("--rpc <url>", "Solana RPC endpoint", DEVNET_RPC)
    .option("--wallet <path>", "Path to Solana keypair")
    .action(async (options) => {
      try {
        if (!["yes", "no", "abstain"].includes(options.choice.toLowerCase())) {
          throw new Error("Vote choice must be: yes, no, or abstain");
        }
        const { provider, wallet } = initializeProvider(options.rpc, options.wallet);
        await voteCommand(provider, wallet, {
          projectId: options.projectId,
          choice: options.choice.toLowerCase(),
          stake: options.stake ? parseFloat(options.stake) : undefined,
          verbose: options.verbose || false,
        });
      } catch (err) {
        console.error("❌ Vote failed:", err);
        process.exit(1);
      }
    });

  // Verification Commands
  program
    .command("verify-milestone")
    .description("Verify a project milestone (oracle only)")
    .requiredOption("--project-id <id>", "Project ID")
    .requiredOption("--milestone-num <num>", "Milestone number")
    .requiredOption("--confidence <score>", "Confidence score (0-100)")
    .option("--proof-url <url>", "URL to milestone proof documentation")
    .option("--rpc <url>", "Solana RPC endpoint", DEVNET_RPC)
    .option("--wallet <path>", "Path to Solana keypair")
    .action(async (options) => {
      try {
        const { provider, wallet } = initializeProvider(options.rpc, options.wallet);
        await verifyMilestoneCommand(provider, wallet, {
          projectId: options.projectId,
          milestoneNum: parseInt(options.milestoneNum),
          confidence: parseInt(options.confidence),
          proofUrl: options.proofUrl || "",
          verbose: options.verbose || false,
        });
      } catch (err) {
        console.error("❌ Milestone verification failed:", err);
        process.exit(1);
      }
    });

  // Status Commands
  program
    .command("status")
    .description("Check project or oracle status")
    .requiredOption("--project-id <id>", "Project ID to check")
    .option("--rpc <url>", "Solana RPC endpoint", DEVNET_RPC)
    .action(async (options) => {
      try {
        const { provider } = initializeProvider(options.rpc);
        await statusCommand(provider, {
          projectId: options.projectId,
          verbose: options.verbose || false,
        });
      } catch (err) {
        console.error("❌ Status check failed:", err);
        process.exit(1);
      }
    });

  // Wallet Commands
  program
    .command("balance")
    .description("Check wallet balance")
    .option("--wallet <path>", "Path to Solana keypair")
    .option("--rpc <url>", "Solana RPC endpoint", DEVNET_RPC)
    .action(async (options) => {
      try {
        const { provider, wallet } = initializeProvider(options.rpc, options.wallet);
        await checkBalanceCommand(provider, wallet);
      } catch (err) {
        console.error("❌ Balance check failed:", err);
        process.exit(1);
      }
    });

  // Archive Commands
  program
    .command("archive")
    .description("Archive a completed project to Arweave")
    .requiredOption("--project-id <id>", "Project ID to archive")
    .option("--rpc <url>", "Solana RPC endpoint", DEVNET_RPC)
    .option("--wallet <path>", "Path to Solana keypair")
    .action(async (options) => {
      try {
        const { provider, wallet } = initializeProvider(options.rpc, options.wallet);
        await archiveCommand(provider, wallet, {
          projectId: options.projectId,
          verbose: options.verbose || false,
        });
      } catch (err) {
        console.error("❌ Archive failed:", err);
        process.exit(1);
      }
    });

  // Help
  program
    .command("help-examples")
    .description("Show example commands")
    .action(() => {
      console.log(`
CrypTrans CLI Examples
======================

1. Register as Oracle (with 100 SOL collateral):
   $ cryptrans oracle-register --collateral 100

2. Propose a Transhuman Project:
   $ cryptrans propose \\
     --name "First Whole-Brain Emulation" \\
     --description "10-year research initiative" \\
     --funding 50000000

3. Vote on a Project (YES with 1000 tokens):
   $ cryptrans vote \\
     --project-id [PROJECT_ID] \\
     --choice yes \\
     --stake 1000

4. Verify a Milestone (Oracle):
   $ cryptrans verify-milestone \\
     --project-id [PROJECT_ID] \\
     --milestone-num 1 \\
     --confidence 85 \\
     --proof-url "https://github.com/project/milestones"

5. Check Project Status:
   $ cryptrans status --project-id [PROJECT_ID]

6. Check Wallet Balance:
   $ cryptrans balance

7. Archive Completed Project:
   $ cryptrans archive --project-id [PROJECT_ID]

Options available for all commands:
  --rpc <url>         Solana RPC endpoint (default: devnet)
  --wallet <path>     Path to keypair file
  --verbose           Show detailed output
      `);
    });

  // Parse and execute
  await program.parseAsync(process.argv);
}

// Execute
main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
