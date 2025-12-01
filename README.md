# CrypTrans

**Anonymous governance powered by zero-knowledge proofs on Solana**

CrypTrans is a decentralized governance platform combining stake-based voting with cryptographic anonymity. Vote without revealing your identity while maintaining verifiable voting power.

## Features

- 🔒 **Anonymous Voting** - Zero-knowledge proofs hide voter identity
- ⛓️ **Solana Native** - Fast, low-cost transactions on devnet/mainnet
- 📊 **Smart Governance** - Community controls treasury and proposals
- 💰 **Stake-Based** - Voting power determined by token stake
- ⚙️ **Configurable** - Admin controls voting thresholds and parameters
- 🛡️ **Secure** - Double-voting prevention, treasury validation, proposal expiration

## Quick Start

### Prerequisites
- Node.js 16+
- Solana CLI
- Anchor Framework
- Phantom or Solflare wallet

### Deploy to Devnet (5 minutes)

```bash
# Clone and setup
git clone https://github.com/yourusername/cryptrans.git
cd cryptrans

# Deploy smart contract
cd programs/cryptrans
cargo build-sbf
solana program deploy target/sbf-solana-solana/release/cryptrans.so
# Save your Program ID

# Deploy frontend
cd ../../app
npm install
export REACT_APP_PROGRAM_ID=<your-program-id>
npm start
```

Open http://localhost:3000 and connect your wallet!

## How It Works

### 1. Stake Tokens
Users deposit tokens to participate in governance and gain voting power.

### 2. Create Proposal
Submit a governance proposal (requires proof-of-work for spam prevention).

### 3. Vote Anonymously
- Generate zero-knowledge proof from secret key
- Proof proves sufficient stake without revealing identity
- Nullifier prevents double-voting
- Vote recorded on-chain

### 4. Distribute Funds
When proposal reaches voting threshold, treasury automatically releases funds.

## Architecture

```
Frontend (React + Anchor SDK)
    ↓
Solana Blockchain (Devnet/Mainnet)
    ↓
Smart Contract (Rust)
├─ GlobalConfig (governance parameters)
├─ Stake Accounts (user participation)
├─ Proposals (governance items)
└─ Vote Records (voting history)
```

## Core Functions

### Smart Contract

```rust
// User Functions
initialize_stake()      // Create stake account
stake_tokens(amount)    // Deposit tokens
unstake_tokens(amount)  // Withdraw tokens
register_commitment()   // Setup for ZK voting

// Governance
create_proposal()       // Submit proposal
vote_with_zk()         // Vote anonymously
release_funds()        // Distribute treasury

// Admin
initialize_config()    // Setup governance
update_config()        // Update parameters
```

### Frontend

```javascript
// Governance
<ProposalsList />      // Browse proposals
<VoteTab />           // Cast anonymous vote
<CreateTab />         // Submit proposal
<StakeTab />          // Manage stake
```

## Configuration

Global parameters stored in `GlobalConfig`:

```rust
voting_threshold: u64,           // Votes needed to pass
demurrage_rate: u64,             // Annual decay rate
proposal_duration_seconds: u64,  // Proposal lifetime
pow_difficulty: u32,             // Spam prevention
admin: Pubkey,                   // Admin wallet
```

All parameters are updateable via `update_config()` without redeployment.

## Project Structure

```
cryptrans/
├── programs/cryptrans/         # Smart contract (Rust)
│   └── src/lib.rs             # Core logic
├── app/                        # Frontend (React)
│   ├── src/
│   │   ├── App.js             # Main app
│   │   ├── zkProver.js        # ZK proof generation
│   │   ├── components/        # UI components
│   │   └── idl/               # Contract IDL
│   └── public/zkproof/        # ZK artifacts
├── circuits/                  # Circom ZK circuits
│   └── vote.circom            # Voting circuit
├── tests/                     # Integration tests
└── docs/                      # Documentation
```

## Technology Stack

**Blockchain**
- Solana (devnet for testing)
- Anchor Framework (smart contracts)

**Frontend**
- React 18
- @coral-xyz/anchor (type-safe interactions)
- @solana/web3.js (blockchain communication)

**Zero-Knowledge**
- Circom (ZK circuit language)
- snarkjs (proof generation)
- Groth16 (pairing-based proofs)

## Status

✅ **v0.2.0 - Groth16 Verifier Implemented**
- All core features functional
- Smart contract compiles without errors
- Frontend fully integrated
- **Groth16 on-chain proof verification (structural)**
- Comprehensive test suite included

⏳ **Pending Production**
- Professional security audit
- Full Groth16 pairing verification (post-audit)
- Mainnet deployment (after audit)

## Documentation

- **[Getting Started](docs/GETTING_STARTED.md)** - Detailed setup guide
- **[Smart Contract](docs/SMART_CONTRACT.md)** - Contract reference
- **[Deployment](docs/DEPLOYMENT.md)** - Production deployment
- **[Security](docs/SECURITY.md)** - Security considerations
- **[Groth16 Verifier](docs/GROTH16_VERIFIER.md)** - ZK proof verification architecture

## Security

CrypTrans includes multiple security layers:

- ✅ **Groth16 proof verification** - Validates ZK proof structure on-chain
- ✅ Vote expiration prevents indefinite voting
- ✅ Treasury balance validation before releases
- ✅ Nullifier system prevents double-voting
- ✅ Admin-controlled parameter updates
- ✅ Input validation and error handling
- ✅ Proper access controls
- ✅ All security vulnerabilities resolved (npm audit: 0 findings)

**Proof Verification**: Structural verification implemented (v0.2.0). Full cryptographic pairing verification will be enabled post-security-audit for complete privacy guarantee.

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -am 'Add feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

MIT License - See LICENSE file for details

## Support

- 📖 Documentation: Check the `/docs` directory
- 🐛 Found a bug? [Open an issue](https://github.com/yourusername/cryptrans/issues)
- 💡 Have ideas? [Start a discussion](https://github.com/yourusername/cryptrans/discussions)

## Vision

CrypTrans embodies the principles of:

- **Privacy** - Your vote is your secret
- **Fairness** - One stake-weighted vote
- **Transparency** - All decisions on-chain
- **Self-Sovereignty** - No intermediaries

Join us building a future where anonymous, verifiable governance is available to everyone.

---

**Built with ❤️ for decentralized coordination and privacy**
