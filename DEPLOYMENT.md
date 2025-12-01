# 🚀 Complete CrypTrans Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Build & Deploy Program](#build--deploy-program)
4. [Create Governance Token](#create-governance-token)
5. [Configure Frontend](#configure-frontend)
6. [Deploy Frontend](#deploy-frontend)
7. [Testing](#testing)
8. [Mainnet Deployment](#mainnet-deployment)

---

## Prerequisites

### Required Software

| Tool | Version | Installation |
|------|---------|--------------|
| Node.js | v20+ | https://nodejs.org/ |
| Rust | Latest | https://rustup.rs/ |
| Solana CLI | v1.18+ | https://docs.solana.com/cli/install-solana-cli-tools |
| Anchor | v0.30+ | https://www.anchor-lang.com/docs/installation |

### Installation Commands

#### Windows (PowerShell)
```powershell
# Install Rust
Invoke-WebRequest -Uri https://win.rustup.rs/x86_64 -OutFile rustup-init.exe
.\rustup-init.exe -y

# Install Solana (requires WSL or use Windows installer)
# Download from: https://github.com/solana-labs/solana/releases

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
```

#### macOS/Linux
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana
sh -c "$(curl -sSfL https://release.solana.com/v1.18.17/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
```

---

## Initial Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/cryptrans.git
cd cryptrans
```

### Step 2: Install Dependencies

```bash
# Root dependencies
npm install

# Frontend dependencies
cd app
npm install
cd ..
```

### Step 3: Create Solana Wallet

```bash
# Generate new wallet
solana-keygen new --outfile ~/.config/solana/id.json

# IMPORTANT: Save your seed phrase securely!
```

### Step 4: Configure Network

```bash
# Set to devnet for testing
solana config set --url devnet

# Verify configuration
solana config get
```

### Step 5: Fund Wallet

```bash
# Request airdrop (devnet only)
solana airdrop 2

# Check balance
solana balance

# If airdrop fails, try again or use devnet faucet:
# https://faucet.solana.com/
```

---

## Build & Deploy Program

### Step 1: Build Program

```bash
# From project root
anchor build

# This compiles the Rust program and generates:
# - target/deploy/cryptrans.so
# - target/idl/cryptrans.json
```

### Step 2: Get Program ID

```bash
# Display program keypair address
solana address -k target/deploy/cryptrans-keypair.json

# Save this address - you'll need it for configuration
```

### Step 3: Update Anchor.toml

Edit `Anchor.toml` and update the program ID:

```toml
[programs.devnet]
cryptrans = "YOUR_PROGRAM_ID_FROM_STEP_2"
```

### Step 4: Rebuild with New ID

```bash
anchor build
```

### Step 5: Deploy to Devnet

```bash
anchor deploy --provider.cluster devnet

# Expected output:
# Deploying workspace: https://api.devnet.solana.com
# Upgrade authority: YOUR_WALLET_ADDRESS
# Deploying program "cryptrans"...
# Program Id: YOUR_PROGRAM_ID
```

### Step 6: Verify Deployment

```bash
# Check program account
solana program show YOUR_PROGRAM_ID

# View logs (in separate terminal)
solana logs YOUR_PROGRAM_ID
```

---

## Create Governance Token

### Step 1: Install SPL Token CLI

```bash
cargo install spl-token-cli
```

### Step 2: Create Token Mint

```bash
# Create token with 9 decimals
spl-token create-token --decimals 9

# Output will look like:
# Creating token AbCdEf123...
# Signature: xyz...

# SAVE THE MINT ADDRESS!
```

### Step 3: Create Token Account

```bash
# Replace <MINT_ADDRESS> with your mint from step 2
spl-token create-account <MINT_ADDRESS>
```

### Step 4: Mint Initial Supply

```bash
# Mint 1 billion tokens
spl-token mint <MINT_ADDRESS> 1000000000

# Verify balance
spl-token balance <MINT_ADDRESS>
```

### Step 5: Create Additional Test Accounts (Optional)

```bash
# For testing with multiple wallets
solana-keygen new --outfile ~/test-wallet-2.json
solana airdrop 2 $(solana-keygen pubkey ~/test-wallet-2.json)
```

---

## Configure Frontend

### Step 1: Copy IDL

```bash
# From project root
npm run copy-idl

# Or manually:
cp target/idl/cryptrans.json app/src/idl/
```

### Step 2: Update App Configuration

Edit `app/src/App.js` and update these constants:

```javascript
// Line ~14-15
const PROGRAM_ID = new PublicKey('YOUR_DEPLOYED_PROGRAM_ID');
const MINT_ADDRESS = new PublicKey('YOUR_TOKEN_MINT_ADDRESS');
```

### Step 3: Verify Configuration

```javascript
// Your configuration should look like:
const PROGRAM_ID = new PublicKey('AbC123...xyz');
const MINT_ADDRESS = new PublicKey('DeF456...abc');
```

---

## Deploy Frontend

### Option 1: Local Testing

```bash
cd app
npm start

# App runs at http://localhost:3000
```

### Option 2: Vercel (Production)

```bash
cd app

# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? (select your account)
# - Link to existing project? N
# - Project name? cryptrans
# - Directory? ./
# - Override settings? N

# For production deployment
vercel --prod
```

### Option 3: Netlify

```bash
cd app
npm run build

# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy

# Follow prompts:
# - Create & configure new site? Y
# - Team? (select your team)
# - Site name? cryptrans
# - Deploy path? ./build

# For production
netlify deploy --prod
```

### Option 4: GitHub Pages

1. Update `app/package.json`:
```json
{
  "homepage": "https://YOUR_USERNAME.github.io/cryptrans",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
  }
}
```

2. Install gh-pages:
```bash
cd app
npm install --save-dev gh-pages
```

3. Deploy:
```bash
npm run deploy
```

4. Configure GitHub repo:
   - Go to Settings > Pages
   - Source: gh-pages branch
   - Save

---

## Testing

### Test Checklist

#### On-Chain Tests
```bash
# Run Anchor tests
anchor test

# Test with local validator
solana-test-validator  # Terminal 1
anchor test --skip-local-validator  # Terminal 2
```

#### Frontend Tests

1. **Connect Wallet**
   - [ ] Install Phantom or Solflare
   - [ ] Switch to Devnet
   - [ ] Connect to app

2. **Initialize Stake**
   - [ ] Click "Initialize Stake Account"
   - [ ] Confirm transaction
   - [ ] Verify success message

3. **Stake Tokens**
   - [ ] Transfer tokens to wallet (if needed)
   - [ ] Enter amount to stake
   - [ ] Click "Stake Tokens"
   - [ ] Confirm transaction

4. **Create Proposal**
   - [ ] Enter description (e.g., "Decentralized BCI Research")
   - [ ] Enter funding amount
   - [ ] Click "Generate Proof of Work"
   - [ ] Wait for PoW completion
   - [ ] Click "Create Proposal"
   - [ ] Note the proposal ID

5. **Vote on Proposal**
   - [ ] Enter proposal ID
   - [ ] Click "Cast Anonymous Vote"
   - [ ] Verify ZK proof generated
   - [ ] Confirm transaction

6. **Verify Behavior**
   - [ ] Check Solana Explorer for transactions
   - [ ] Verify voting power matches stake
   - [ ] Test demurrage (if implemented)

---

## Mainnet Deployment

### ⚠️ CRITICAL: Pre-Mainnet Checklist

Before deploying to mainnet, ensure:

- [ ] **Security Audit**: Professional audit completed
- [ ] **Legal Review**: Compliance with relevant regulations
- [ ] **Insurance**: Consider smart contract insurance
- [ ] **Testing**: Months of devnet testing without issues
- [ ] **Documentation**: All docs complete and reviewed
- [ ] **Emergency Plan**: Pause mechanism and recovery plan
- [ ] **Multisig**: Treasury controlled by multisig
- [ ] **Rate Limits**: Spam protection verified
- [ ] **ZK Circuits**: Real ZK implementation (not mock)

### Mainnet Deployment Steps

1. **Switch to Mainnet**
```bash
solana config set --url mainnet-beta
```

2. **Fund Deployment Wallet**
```bash
# You'll need ~5 SOL for deployment
# NEVER send large amounts to untested addresses
solana balance
```

3. **Update Configuration**

Edit `Anchor.toml`:
```toml
[programs.mainnet]
cryptrans = "11111111111111111111111111111111"  # Will update after deploy
```

4. **Build for Mainnet**
```bash
anchor build
```

5. **Deploy**
```bash
anchor deploy --provider.cluster mainnet

# SAVE THE PROGRAM ID IMMEDIATELY
```

6. **Create Mainnet Token**
```bash
spl-token create-token --decimals 9
# Use this mint for production
```

7. **Update Frontend for Mainnet**

Edit `app/src/App.js`:
```javascript
const connection = useMemo(() => 
  new Connection(clusterApiUrl('mainnet-beta'), 'confirmed'), 
  []
);
```

8. **Deploy Frontend**
```bash
cd app
vercel --prod
```

9. **Verify Everything**
- Test with small amounts first
- Monitor logs continuously
- Have emergency contacts ready

---

## Environment Variables

### Create `.env` file:

```bash
# Copy template
cp .env.example .env
```

### Edit `.env`:
```env
SOLANA_NETWORK=devnet
WALLET_PATH=~/.config/solana/id.json
PROGRAM_ID=YOUR_PROGRAM_ID
MINT_ADDRESS=YOUR_MINT_ADDRESS
```

---

## Monitoring & Maintenance

### Monitor Logs
```bash
# Real-time logs
solana logs YOUR_PROGRAM_ID

# Explorer
# https://explorer.solana.com/address/YOUR_PROGRAM_ID?cluster=devnet
```

### Upgrade Program
```bash
# Build new version
anchor build

# Upgrade (requires upgrade authority)
anchor upgrade target/deploy/cryptrans.so --program-id YOUR_PROGRAM_ID
```

### Check Account State
```bash
# View account data
solana account YOUR_PROGRAM_ID
```

---

## Troubleshooting

### Common Errors

**Error: "Error: failed to send transaction"**
```bash
# Solution: Increase compute budget or optimize transaction
solana airdrop 1  # Ensure sufficient SOL
```

**Error: "custom program error: 0x1"**
```bash
# Solution: Check program logs
solana logs YOUR_PROGRAM_ID
```

**Error: "Anchor.toml program ID mismatch"**
```bash
# Solution: Regenerate program ID
anchor keys sync
anchor build
```

---

## Support

- GitHub Issues: https://github.com/YOUR_USERNAME/cryptrans/issues
- Discord: [Your Discord Link]
- Documentation: https://github.com/YOUR_USERNAME/cryptrans

---

**Deployment Date**: _____________

**Program ID (Devnet)**: _____________

**Program ID (Mainnet)**: _____________

**Mint Address**: _____________

**Frontend URL**: _____________

---

*Remember: Test extensively on devnet before mainnet deployment!*

