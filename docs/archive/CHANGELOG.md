# Changelog

All notable changes to CrypTrans will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2025-11-30 - Security Hardening Release

### 🔒 Security Improvements

#### Added
- **Double-voting prevention system**
  - New `VoteRecord` account tracks votes per user per proposal
  - PDA seeds: `["vote", proposal_id, voter_pubkey]`
  - Prevents users from voting multiple times on same proposal
  - Added `AlreadyVoted` error code
  - Location: `programs/cryptrans/src/lib.rs:90-125`, `app/src/App.js:220-258`

- **Improved PoW verification**
  - PoW now tied to proposal content: `SHA256(description + nonce)`
  - On-chain verification ensures PoW matches actual proposal
  - Prevents submission of arbitrary pre-computed PoW
  - Frontend matches backend verification logic
  - Location: `programs/cryptrans/src/lib.rs:56-74`, `app/src/App.js:40-72`

- **Input validation**
  - Description: Maximum 200 characters enforced
  - Funding: Maximum 1,000 tokens (1,000,000,000,000 lamports)
  - Account space properly calculated: 441 bytes + 8 discriminator
  - Added error codes: `DescriptionTooLong`, `FundingTooHigh`, `InvalidPoWContent`
  - Location: `programs/cryptrans/src/lib.rs:66-68`

- **Automatic demurrage enforcement**
  - Demurrage now calculated during voting automatically
  - Vote weight uses time-adjusted stake amount
  - 2% annual rate (200 basis points) applied
  - Prevents hoarding without manual intervention
  - Location: `programs/cryptrans/src/lib.rs:106-116`

#### Changed
- Updated `Vote` account context to include `vote_record` and `system_program`
- Changed `create_proposal` parameter from `pow_hash` to `pow_nonce` for clarity
- Updated frontend to generate PoW from description + nonce (not arbitrary data)
- Improved error handling in frontend with specific messages for known errors

### 🧪 Testing

#### Added
- Comprehensive test suite in `tests/cryptrans.ts`
  - Stake initialization and token staking
  - Demurrage application
  - Proposal creation with valid/invalid PoW
  - Description length validation
  - Voting functionality with ZK proof
  - Double-voting prevention
  - Empty ZK proof rejection
  - Treasury fund release
  - Double-funding prevention
  - Complete integration workflow test
- Test dependencies: `chai`, `mocha`, `@types/chai`, `@types/mocha`

### 📚 Documentation

#### Added
- **`SECURITY.md`** - Comprehensive security documentation
  - Details of all security improvements
  - Known limitations (especially mock ZK proofs)
  - Pre-mainnet checklist
  - Security best practices
  - Reporting vulnerabilities
  - Resources for auditing and ZK implementation

- **`KNOWN_ISSUES.md`** - Complete issue tracking
  - Critical: Mock ZK proofs (documented, not fixed)
  - Medium: Hardcoded voting threshold, no treasury balance check
  - Low: Clock manipulation, no partial unstaking
  - Future enhancements roadmap
  - Issue status tracking

- **`ZK_IMPLEMENTATION_ROADMAP.md`** - ZK implementation guide
  - Phase-by-phase implementation plan
  - Circuit design examples (Circom)
  - Client-side proof generation
  - On-chain verifier strategies
  - Performance benchmarks
  - Cost estimation
  - Learning resources
  - Alternative solutions (Light Protocol, Elusiv)

- **`CHANGELOG.md`** - This file

#### Changed
- Updated `README.md` with prominent security warnings
- Added links to security documentation
- Highlighted testnet-only status
- Listed security improvements in main README

### 🐛 Bug Fixes

#### Fixed
- Double-voting vulnerability (CRITICAL)
- PoW not validated against proposal content (HIGH)
- No limits on description/funding inputs (MEDIUM)
- Demurrage only applied manually (MEDIUM)

### ⚠️ Known Limitations

#### NOT Fixed
- **ZK proofs are MOCK** (CRITICAL)
  - Current implementation: SHA256 hash of random data
  - Provides NO actual privacy
  - All votes visible on-chain
  - See `ZK_IMPLEMENTATION_ROADMAP.md` for solution

- **Hardcoded voting threshold** (MEDIUM)
  - Fixed at 1 billion lamports
  - Should be percentage of total supply

- **No treasury balance verification** (MEDIUM)
  - Transfer fails with generic error if insufficient funds

See `KNOWN_ISSUES.md` for complete list.

### 🔧 Internal Changes

- Refactored vote function to calculate demurrage inline
- Updated account space allocation for proper String serialization
- Added helper error codes for better debugging
- Improved code comments and documentation

---

## [0.1.0] - 2025-11-XX - Initial Release

### Added
- Basic staking mechanism
  - `initialize_stake()` - Create stake account
  - `stake_tokens()` - Stake SPL tokens
  - `apply_demurrage()` - Manual demurrage application

- Proposal system
  - `create_proposal()` - Create governance proposals
  - PoW anti-spam (basic implementation)
  - Proposal storage with description and funding

- Voting system
  - `vote()` - Vote on proposals with mock ZK proof
  - Vote weight based on stake amount

- Treasury management
  - `release_funds()` - Release funds when threshold met
  - PDA-based authority for transfers

- Frontend application
  - React-based UI
  - Wallet integration (Phantom, Solflare)
  - PoW generation
  - Mock ZK proof generation
  - Proposal creation and voting

- Documentation
  - Basic README with deployment guide
  - Quick start instructions
  - Troubleshooting section

### Security Issues (Fixed in 0.2.0)
- ❌ No double-voting prevention
- ❌ PoW not tied to proposal content
- ❌ No input validation
- ❌ Manual demurrage only
- ⚠️ Mock ZK proofs (still an issue)

---

## [Unreleased]

### Planned for 0.3.0
- [ ] Real ZK proof implementation (circom + snarkjs)
- [ ] Dynamic voting threshold based on total supply
- [ ] Treasury balance verification
- [ ] Proposal expiration mechanism
- [ ] Proposal cancellation by creator
- [ ] Unstake functionality

### Planned for 0.4.0
- [ ] Vote delegation system
- [ ] Multi-sig treasury support
- [ ] Oracle integration (Pyth, Switchboard)
- [ ] Improved gas optimization
- [ ] Quadratic voting option

### Planned for 1.0.0 (Production)
- [ ] Professional security audit
- [ ] Real ZK proofs fully tested
- [ ] Mainnet deployment
- [ ] Bug bounty program
- [ ] Multi-sig governance
- [ ] Emergency pause mechanism

---

## Version History Summary

| Version | Date       | Status      | Key Feature                        |
|---------|------------|-------------|------------------------------------|
| 0.1.0   | 2025-11-XX | Deprecated  | Initial release (security issues)  |
| 0.2.0   | 2025-11-30 | Current     | Security hardening (testnet only)  |
| 0.3.0   | TBD        | Planned     | Real ZK proofs                     |
| 1.0.0   | TBD        | Future      | Production-ready with audit        |

---

## Upgrade Guide

### Upgrading from 0.1.0 to 0.2.0

#### Program Changes
1. **Vote function signature changed:**
   ```rust
   // Old (0.1.0)
   pub fn vote(ctx: Context<Vote>, zk_proof: String) -> Result<()>
   
   // New (0.2.0) - requires vote_record account
   pub fn vote(ctx: Context<Vote>, zk_proof: String) -> Result<()>
   // Context now includes vote_record and system_program
   ```

2. **CreateProposal parameter renamed:**
   ```rust
   // Old
   pub fn create_proposal(..., pow_hash: String, ...) -> Result<()>
   
   // New
   pub fn create_proposal(..., pow_nonce: String, ...) -> Result<()>
   ```

3. **New accounts required:**
   - `VoteRecord` - Tracks votes per user per proposal
   - Vote context requires `system_program` for VoteRecord initialization

#### Frontend Changes
1. **Update vote function call:**
   ```javascript
   // Old (0.1.0)
   await program.methods
     .vote(zkProof)
     .accounts({
       proposal: proposalPda,
       stake: stakePda,
       voter: wallet.publicKey,
     })
     .rpc();
   
   // New (0.2.0)
   const [voteRecordPda] = PublicKey.findProgramAddressSync(
     [Buffer.from('vote'), proposalPda.toBuffer(), wallet.publicKey.toBuffer()],
     program.programId
   );
   
   await program.methods
     .vote(zkProof)
     .accounts({
       proposal: proposalPda,
       stake: stakePda,
       voteRecord: voteRecordPda,
       voter: wallet.publicKey,
       systemProgram: web3.SystemProgram.programId,
     })
     .rpc();
   ```

2. **Update PoW generation:**
   ```javascript
   // Old - arbitrary data
   const data = `${description}${Date.now()}${nonce}`;
   
   // New - description + nonce only
   const nonceStr = `${nonce}`;
   const data = `${description}${nonceStr}`;
   ```

#### Migration Steps
1. Deploy new program version
2. Update frontend with new accounts
3. Test voting on new proposals
4. Old proposals remain compatible (but won't have double-vote protection)

---

## Contributing

When contributing, please:
1. Update this CHANGELOG under `[Unreleased]`
2. Follow the format: Added/Changed/Deprecated/Removed/Fixed/Security
3. Reference issue numbers where applicable
4. Update version numbers when releasing

---

## Links

- [Repository](https://github.com/YOUR_USERNAME/cryptrans)
- [Security Policy](./SECURITY.md)
- [Known Issues](./KNOWN_ISSUES.md)
- [ZK Roadmap](./ZK_IMPLEMENTATION_ROADMAP.md)
- [Documentation](./README.md)

---

**Last Updated:** November 30, 2025  
**Maintainer:** CrypTrans Core Team

