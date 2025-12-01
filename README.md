# ⚡ CrypTrans: Embodying Cypherpunk and Extropian Visions

A decentralized governance platform on Solana that embodies the principles of crypto-anarchism, cypherpunk ideals, and extropian philosophy.

---

## ⚠️ SECURITY NOTICE

**Version 0.2.0 - Development/Testnet Only**

This project has undergone significant security hardening but is **NOT production-ready**. Critical security improvements have been implemented (double-voting prevention, PoW verification, input validation), but **ZK proofs are currently MOCK** and provide no actual privacy.

📖 **Read before deploying:** [`SECURITY.md`](./SECURITY.md) | [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md) | [`ZK_IMPLEMENTATION_ROADMAP.md`](./ZK_IMPLEMENTATION_ROADMAP.md)

---

## 🌟 Vision

CrypTrans fully embodies the visions of pioneers from Libtech-l and Extropian circles:

- **Nick Szabo**: Smart contracts for decentralized, self-executing agreements
- **Hal Finney**: Optimism in tech for liberation and reusable proof-of-work
- **Wei Dai**: b-money for stable, decentralized P2P cash with PoW creation
- **David Chaum**: Blind signatures for untraceable privacy in digital payments
- **Adam Back**: Hashcash PoW for anti-spam and resource scarcity
- **Tim May**: Crypto anarchy for free trade and privacy against control
- **Extropian Principles**: Boundless expansion, self-transformation, intelligent technology, spontaneous order, dynamic optimism, and longevity

## 🎯 Key Features

### 1. Privacy & Liberation (Chaum, Finney, May)
- Zero-Knowledge proofs for anonymous voting
- Untraceable participation without infringing rights
- Privacy-first architecture

### 2. PoW Scarcity & Anti-Spam (Back, Dai)
- Off-chain Proof of Work requirement for proposal creation
- Hashcash-style puzzle to prevent spam
- Verified on-chain

### 3. Smart Contracts & Self-Execution (Szabo)
- Proposals self-execute fund releases
- Mimics self-owning agents
- Trustless execution

### 4. Transhuman Focus & Optimism (Extropians)
- UI prompts for longevity projects (cryonics)
- Augmentation projects (BCIs)
- Expansion projects (space tech)
- AI scoring for principle alignment

### 5. Decentralization & Spontaneous Order
- No admins or central authority
- Voting creates emergent order
- Demurrage for ethical circulation over hoarding

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20 or higher): [Download](https://nodejs.org/)
- **Rust** (latest stable): [Install](https://rustup.rs/)
- **Solana CLI** (v1.18+): [Install Guide](https://docs.solana.com/cli/install-solana-cli-tools)
- **Anchor** (v0.30+): [Install Guide](https://www.anchor-lang.com/docs/installation)
- **Git**: [Download](https://git-scm.com/)

### Quick Installation Check

```bash
node --version    # Should be v20+
rust --version    # Should be 1.70+
solana --version  # Should be 1.18+
anchor --version  # Should be 0.30+
```

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/cryptrans.git
cd cryptrans

# Run automated setup
npm install
node scripts/setup.js
```

### 2. Build the Program

```bash
# Build Anchor program
anchor build
```

### 3. Deploy to Devnet

```bash
# Deploy to Solana devnet
anchor deploy --provider.cluster devnet

# Or use the helper script
npm run deploy:devnet
```

After deployment, note the **Program ID** from the output.

### 4. Create Governance Token

```bash
# Create SPL token for governance
spl-token create-token --decimals 9

# Save the mint address, then create account
spl-token create-account <MINT_ADDRESS>

# Mint initial supply (1 billion tokens)
spl-token mint <MINT_ADDRESS> 1000000000

# Or use the helper script (Unix/Mac)
bash scripts/create-token.sh
```

### 5. Update Configuration

1. Copy IDL to frontend:
```bash
npm run copy-idl
```

2. Update `app/src/App.js`:
```javascript
const PROGRAM_ID = new PublicKey('YOUR_DEPLOYED_PROGRAM_ID');
const MINT_ADDRESS = new PublicKey('YOUR_TOKEN_MINT_ADDRESS');
```

### 6. Run Frontend

```bash
cd app
npm install
npm start
```

The app will open at `http://localhost:3000`

## 📖 Detailed Deployment Guide

### Step 1: Environment Setup

#### Install Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env
```

#### Install Solana CLI
```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.18.17/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

#### Install Anchor
```bash
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
```

#### Create Wallet
```bash
# Generate new keypair (save the seed phrase!)
solana-keygen new

# Set to devnet
solana config set --url devnet

# Request airdrop (2 SOL)
solana airdrop 2

# Check balance
solana balance
```

### Step 2: Build and Deploy

```bash
# Navigate to project
cd cryptrans

# Build program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Get program ID
solana address -k target/deploy/cryptrans-keypair.json
```

### Step 3: Token Creation

```bash
# Install SPL Token CLI
cargo install spl-token-cli

# Create token
spl-token create-token --decimals 9
# Output: Creating token ABC123...

# Create associated token account
spl-token create-account ABC123...

# Mint initial supply
spl-token mint ABC123... 1000000000

# Check balance
spl-token balance ABC123...
```

### Step 4: Update Frontend Configuration

1. **Update Anchor.toml** with deployed program ID:
```toml
[programs.devnet]
cryptrans = "YOUR_DEPLOYED_PROGRAM_ID"
```

2. **Copy IDL to frontend**:
```bash
cp target/idl/cryptrans.json app/src/idl/
```

3. **Update app/src/App.js**:
```javascript
const PROGRAM_ID = new PublicKey('YOUR_PROGRAM_ID_HERE');
const MINT_ADDRESS = new PublicKey('YOUR_MINT_ADDRESS_HERE');
```

### Step 5: Test Locally

```bash
cd app
npm install
npm start
```

Connect your wallet (Phantom, Solflare) set to Devnet and test:
1. Initialize stake account
2. Stake tokens
3. Generate PoW for proposal
4. Create proposal
5. Vote anonymously

## 🌐 Deploy Frontend to Production

### Option 1: Vercel (Recommended)

```bash
cd app

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts, select React project
```

### Option 2: Netlify

```bash
cd app
npm run build

# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=build
```

### Option 3: GitHub Pages

```bash
cd app

# Add homepage to package.json
# "homepage": "https://YOUR_USERNAME.github.io/cryptrans"

npm run build

# Deploy to gh-pages branch
npm i -g gh-pages
gh-pages -d build
```

## 🔧 Configuration Options

### PoW Difficulty

Adjust in `app/src/App.js`:
```javascript
const POW_DIFFICULTY = 4; // Higher = more secure but slower
```

### Voting Threshold

Modify in `programs/cryptrans/src/lib.rs`:
```rust
require!(proposal.votes >= 1_000_000_000, ErrorCode::InsufficientVotes);
```

### Demurrage Rate

Apply demurrage to prevent hoarding:
```javascript
// In frontend, call with rate (e.g., 5% annually = 500 basis points)
await program.methods.applyDemurrage(new BN(500)).rpc();
```

## 🧪 Testing

### Run Anchor Tests

```bash
anchor test
```

### Local Validator Testing

```bash
# Terminal 1: Start local validator
solana-test-validator

# Terminal 2: Deploy locally
anchor deploy --provider.cluster localnet

# Terminal 3: Run tests
anchor test --skip-local-validator
```

### Manual Testing Checklist

- [ ] Connect wallet on devnet
- [ ] Initialize stake account
- [ ] Stake tokens
- [ ] Generate PoW (verify difficulty)
- [ ] Create proposal
- [ ] Vote on proposal (verify anonymity)
- [ ] Check voting power reflects stake
- [ ] Release funds (if threshold met)
- [ ] Apply demurrage

## 📁 Project Structure

```
cryptrans/
├── programs/
│   └── cryptrans/
│       ├── src/
│       │   └── lib.rs          # Main Solana program
│       └── Cargo.toml           # Rust dependencies
├── app/
│   ├── public/
│   ├── src/
│   │   ├── idl/
│   │   │   └── cryptrans.json  # Program IDL
│   │   ├── App.js              # Main React component
│   │   ├── App.css             # Styling
│   │   └── index.js            # Entry point
│   └── package.json             # Frontend dependencies
├── scripts/
│   ├── setup.js                # Automated setup
│   ├── copy-idl.js             # IDL copy helper
│   ├── deploy.sh               # Deployment script
│   └── create-token.sh         # Token creation script
├── tests/                       # Anchor tests
├── Anchor.toml                  # Anchor configuration
├── Cargo.toml                   # Workspace config
└── package.json                 # Root package config
```

## 🔐 Security & Status

### ⚠️ Current Version: v0.2.0 - Security Hardened (Testnet Only)

**Major Security Improvements Implemented:**
- ✅ **Double-voting prevention** - VoteRecord tracking system prevents duplicate votes
- ✅ **PoW verification improved** - Now cryptographically bound to proposal content
- ✅ **Input validation** - Description length (200 chars) and funding limits enforced
- ✅ **Automatic demurrage** - Applied during voting for fair weight calculation
- ✅ **Comprehensive tests** - Full test suite covering all security scenarios

**Critical Known Limitation:**
- ⚠️ **ZK Proofs are MOCK** - Current implementation provides NO actual privacy
  - See `ZK_IMPLEMENTATION_ROADMAP.md` for real ZK implementation plan
  - Voting is publicly visible on-chain
  - **DO NOT use for production privacy-critical applications**

**Security Documentation:**
- 📄 [`SECURITY.md`](./SECURITY.md) - Comprehensive security analysis and best practices
- 📄 [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md) - Complete list of known limitations
- 📄 [`ZK_IMPLEMENTATION_ROADMAP.md`](./ZK_IMPLEMENTATION_ROADMAP.md) - Guide for implementing real ZK proofs

### For Development (Devnet)
- Use test wallets only
- Never expose private keys
- Test thoroughly before mainnet
- Review all security documentation

### For Production (Mainnet)
- ❌ **NOT READY FOR MAINNET** - See security docs for requirements
- **Get a professional audit** before deploying
- Implement real ZK proofs (see roadmap)
- Use hardware wallets for deployment
- Implement multisig for treasury
- Add rate limiting and emergency pause
- Complete all items in `SECURITY.md` Pre-Mainnet Checklist

## 🐛 Troubleshooting

### Common Issues

**Issue**: `anchor: command not found`
```bash
# Solution: Reinstall Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
```

**Issue**: `Insufficient funds`
```bash
# Solution: Request more SOL
solana airdrop 2
```

**Issue**: Deployment fails with "Program ID mismatch"
```bash
# Solution: Update Anchor.toml with correct program ID
solana address -k target/deploy/cryptrans-keypair.json
```

**Issue**: Frontend can't connect to wallet
- Ensure wallet extension is installed (Phantom/Solflare)
- Switch wallet network to Devnet
- Refresh page

**Issue**: PoW generation too slow
- Reduce POW_DIFFICULTY in App.js (e.g., from 4 to 3)
- Or increase for production security (5-6)

**Issue**: Transaction fails with "custom program error"
- Check Solana logs: `solana logs <PROGRAM_ID>`
- Verify accounts are initialized
- Check token balances

## 🌍 Mainnet Deployment

**WARNING**: Only deploy to mainnet after:
1. Professional security audit
2. Extensive testing on devnet
3. Legal compliance review
4. Insurance/risk assessment

### Mainnet Steps

```bash
# Switch to mainnet
solana config set --url mainnet-beta

# Ensure sufficient SOL for deployment (~5 SOL)
solana balance

# Deploy
anchor deploy --provider.cluster mainnet

# Update Anchor.toml and frontend with mainnet program ID
```

## 📚 Resources

- [Solana Documentation](https://docs.solana.com/)
- [Anchor Book](https://book.anchor-lang.com/)
- [SPL Token Guide](https://spl.solana.com/token)
- [Zero-Knowledge Proofs](https://z.cash/technology/zksnarks/)
- [Cypherpunk Manifesto](https://www.activism.net/cypherpunk/manifesto.html)
- [Extropian Principles](https://www.extropy.org/principles.htm)

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

This project honors the visions of:
- Nick Szabo (Smart Contracts)
- Hal Finney (Reusable PoW)
- Wei Dai (b-money)
- David Chaum (Blind Signatures)
- Adam Back (Hashcash)
- Tim May (Crypto Anarchy)
- The Extropian Movement

---

**Built with 💙 for a decentralized, transhuman future**

*"The future belongs to those who believe in cryptography, voluntary exchange, and unbounded human potential."*

---

## 🔗 Quick Links

- [Documentation](./docs/)
- [Report Bug](https://github.com/YOUR_USERNAME/cryptrans/issues)
- [Request Feature](https://github.com/YOUR_USERNAME/cryptrans/issues)
- [Discord Community](#)
- [Twitter](#)

## ⚠️ Disclaimer

This software is experimental and provided "as is" without warranty. Use at your own risk. Not financial advice. Always do your own research and security audits before deploying to mainnet or handling real funds.

#   c r y p t r a n s  
 