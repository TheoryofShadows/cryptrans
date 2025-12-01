# Getting Started with CrypTrans

This guide will help you set up CrypTrans for development and testing on Solana devnet.

## Prerequisites

Install the following tools:

- **Node.js** 16+ - [Download](https://nodejs.org/)
- **Rust** - [Install](https://rustup.rs/)
- **Solana CLI** - [Install](https://docs.solana.com/cli/install-solana-cli-tools)
- **Anchor Framework** - [Install](https://www.anchor-lang.com/docs/installation)
- **Git** - [Download](https://git-scm.com/)

### Verify Installation

```bash
node --version    # v16+
rustc --version   # 1.70+
solana --version  # 1.18+
anchor --version  # 0.30+
```

## Setup (5 minutes)

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/cryptrans.git
cd cryptrans
```

### 2. Configure Solana

```bash
# Set to devnet
solana config set --url devnet

# Create keypair (save seed phrase!)
solana-keygen new

# Get test SOL
solana airdrop 2

# Check balance
solana balance
```

### 3. Build Smart Contract

```bash
cd programs/cryptrans
cargo build-sbf
```

### 4. Deploy Contract

```bash
solana program deploy target/sbf-solana-solana/release/cryptrans.so
```

**Save the Program ID** - you'll need this for the frontend.

### 5. Setup Frontend

```bash
cd ../../app
npm install

# Create .env file
echo "REACT_APP_PROGRAM_ID=<your-program-id>" > .env

# Start dev server
npm start
```

Open http://localhost:3000

## First Steps

1. **Connect Wallet**
   - Install [Phantom](https://phantom.app/) or [Solflare](https://solflare.com/)
   - Set to Devnet
   - Click "Connect Wallet" in app

2. **Initialize Stake**
   - Go to "Stake" tab
   - Click "Initialize Stake" (one-time setup)

3. **Stake Tokens**
   - You need test tokens first
   - Enter amount and click "Stake"

4. **Create Proposal**
   - Go to "Create" tab
   - Enter description, funding amount, PoW nonce
   - Click "Create Proposal"

5. **Vote Anonymously**
   - Go to "Proposals" tab
   - Click on any proposal
   - Click "Vote Yes (ANONYMOUS)"
   - Wait for ZK proof generation

6. **Check Blockchain**
   - Visit [Solana Explorer](https://explorer.solana.com?cluster=devnet)
   - Search your wallet address
   - See your vote transactions

## Troubleshooting

### "anchor: command not found"
```bash
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
```

### "Insufficient balance"
```bash
solana airdrop 2
```

### "Program ID mismatch"
- Update `app/.env` with correct Program ID
- Refresh browser

### "Wallet not connecting"
- Ensure wallet extension is installed
- Switch wallet to Devnet
- Refresh page

### "ZK proof generation too slow"
- Reduce POW difficulty (see Configuration section in README)

## Next Steps

- Read [Smart Contract Guide](SMART_CONTRACT.md)
- Check [Deployment Guide](DEPLOYMENT.md)
- Review [Security Considerations](SECURITY.md)
