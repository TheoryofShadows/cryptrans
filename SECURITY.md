# Security Policy

## ⚠️ Current Status: Development / Testnet Only

**DO NOT USE THIS ON MAINNET WITHOUT A FULL SECURITY AUDIT**

This project is currently in active development and should **only be deployed on devnet/testnet**. Several critical security improvements have been implemented, but there are still known limitations that require additional work before production use.

---

## 🔒 Security Improvements Implemented

### ✅ 1. Double-Voting Prevention (FIXED)
**Issue**: Users could vote multiple times on the same proposal.

**Solution**: Implemented `VoteRecord` PDA tracking system:
- Each vote creates a unique PDA: `["vote", proposal_id, voter_pubkey]`
- The program checks `has_voted` flag before accepting votes
- Attempting to vote twice will fail with `AlreadyVoted` error

**Files Changed**:
- `programs/cryptrans/src/lib.rs` - Added `VoteRecord` struct and validation
- `app/src/App.js` - Updated to include vote record PDA

---

### ✅ 2. Proof-of-Work Verification (IMPROVED)
**Issue**: PoW was generated on frontend but not validated against proposal content on-chain.

**Solution**: 
- Changed PoW to hash `description + nonce` (instead of arbitrary data)
- On-chain verification now computes `SHA256(description || nonce)` and checks leading zeros
- This cryptographically binds PoW to the proposal content

**Code**:
```rust
// lib.rs lines 56-74
let pow_input = format!("{}{}", description, pow_nonce);
let mut hasher = Sha256::new();
hasher.update(pow_input.as_bytes());
let result = hasher.finalize();
let hex_result = hex::encode(result);

require!(
    hex_result.starts_with(&"0".repeat(pow_difficulty as usize)),
    ErrorCode::InvalidPoW
);
```

**Frontend**: 
- PoW generation in `App.js` now matches this format exactly
- Nonce is generated until hash meets difficulty requirement

---

### ✅ 3. Input Validation (ADDED)
**Issue**: No limits on description length or funding amounts.

**Solution**:
- Description: Maximum 200 characters (validated before account creation)
- Funding: Maximum 1,000 tokens (1,000,000,000,000 lamports)
- Account space properly allocated: `8 + 8 + 32 + 4 + 200 + 8 + 8 + 1 + 32 + 4 + 128 + 8`

**Error Codes**:
- `DescriptionTooLong` - Description exceeds 200 chars
- `FundingTooHigh` - Funding request exceeds maximum

---

### ✅ 4. Automatic Demurrage Enforcement (ADDED)
**Issue**: Demurrage was only applied when users manually called `apply_demurrage()`.

**Solution**:
- Demurrage is now **automatically calculated during voting**
- Vote weight uses adjusted stake based on time elapsed since last demurrage
- Formula: `decay = stake * 200 * time_elapsed / (365 * 24 * 3600 * 10000)`
- Uses 2% annual rate (200 basis points)

**Code Location**: `lib.rs` lines 101-118 in `vote()` function

---

## ⚠️ Known Security Limitations

### 🔴 CRITICAL: Mock Zero-Knowledge Proofs

**Current Implementation**:
```javascript
// App.js lines 75-80
const generateZKProof = () => {
  const privateVote = Math.random();
  const proof = CryptoJS.SHA256(`vote${privateVote}${Date.now()}`).toString();
  return proof;
};
```

**Problem**: 
- This is **NOT a real ZK proof** - it's just a SHA256 hash
- Provides **ZERO actual privacy**
- On-chain verification only checks that proof is non-empty
- Voting is **NOT anonymous** - all votes are publicly visible on-chain

**Why It's a Problem**:
- Anyone can correlate wallet addresses to votes by analyzing transaction signatures
- Timestamps and amounts can be used to de-anonymize voters
- The entire premise of "anonymous voting" is currently **broken**

**Recommended Solutions**:

#### Option 1: Circom + snarkjs (Most Popular)
```bash
npm install snarkjs circom
```
- Create a circuit for vote verification (e.g., prove you have stake ≥ X without revealing exact amount)
- Generate proving/verification keys
- Submit proof + public inputs to smart contract
- Contract verifies using Groth16/PLONK verifier

**Resources**:
- [Circom Documentation](https://docs.circom.io/)
- [snarkjs Guide](https://github.com/iden3/snarkjs)

#### Option 2: Solana Native ZK (Emerging)
- **Light Protocol**: Privacy-preserving transactions on Solana
- **Elusiv**: Confidential transactions
- **ZK Compression**: New Solana feature (2024+)

**Resources**:
- [Light Protocol Docs](https://docs.lightprotocol.com/)
- [Elusiv SDK](https://github.com/elusiv-privacy/elusiv-sdk)

#### Option 3: o1js (Mina) + Bridge
- Use o1js (formerly SnarkyJS) to create ZK proofs off-chain
- Bridge to Solana via Wormhole or custom validator
- More complex but very powerful

**Minimum Viable ZK Implementation**:
1. Prove you own a stake account without revealing amount
2. Prove you haven't voted before (using Merkle tree commitment)
3. Blind your vote weight using Pedersen commitment
4. Submit proof + nullifier to prevent double-voting

**Estimated Work**: 2-4 weeks for experienced ZK developer

---

### 🟡 MEDIUM: Treasury Account Security

**Current Status**: Uses PDA signing with seeds, which is correct.

**Potential Issue**: 
- The `release_funds()` function assumes treasury has sufficient balance
- No explicit check before transfer (will fail with SPL Token error if insufficient)

**Recommendation**:
```rust
// Add before transfer
let treasury_account = ctx.accounts.treasury.to_account_info();
let treasury_balance = TokenAccount::try_deserialize(&mut &treasury_account.data.borrow()[..])?;
require!(
    treasury_balance.amount >= ctx.accounts.proposal.funding_needed,
    ErrorCode::InsufficientTreasuryBalance
);
```

---

### 🟡 MEDIUM: Voting Threshold Hardcoded

**Current Code**:
```rust
require!(ctx.accounts.proposal.votes >= 1_000_000_000, ErrorCode::InsufficientVotes);
```

**Issue**: 
- Fixed threshold of 1 billion (1 token) regardless of total supply
- Should be dynamic (e.g., 51% of circulating supply)

**Recommendation**:
- Add `total_supply` parameter to program initialization
- Calculate threshold as `(total_supply * 51) / 100`
- Or use on-chain Mint account to fetch current supply

---

### 🟢 LOW: Time-Based Attacks on Demurrage

**Current Status**: Uses `Clock::get()?.unix_timestamp`

**Potential Issue**: 
- Validators can manipulate timestamps within a small window (~2 seconds)
- Could be used to slightly game demurrage calculations

**Mitigation**: 
- Current impact is minimal (2 seconds out of annual calculation)
- For high-stakes applications, consider using slot number instead of timestamp

---

## 🔐 Best Practices Implemented

### ✅ PDA Authority
- All sensitive operations use Program Derived Addresses
- Seeds are properly structured and deterministic
- Bump seeds are passed via `ctx.bumps` for efficiency

### ✅ Account Validation
- All accounts are validated with Anchor constraints
- `#[account(mut)]` used appropriately for state changes
- Seeds verified using `seeds` and `bump` constraints

### ✅ Integer Overflow Protection
- All arithmetic uses `.checked_add()`, `.checked_sub()`, `.checked_mul()`, `.checked_div()`
- Will panic safely if overflow occurs (better than wrapping)

### ✅ Error Handling
- Custom error codes with descriptive messages
- Errors are properly propagated with `?` operator

---

## 🧪 Testing

Comprehensive test suite included in `tests/cryptrans.ts`:

**Test Coverage**:
- ✅ Stake account initialization
- ✅ Token staking
- ✅ Demurrage application
- ✅ Proposal creation with valid PoW
- ✅ Proposal rejection with invalid PoW
- ✅ Description length validation
- ✅ Voting functionality
- ✅ Double-voting prevention
- ✅ Empty ZK proof rejection
- ✅ Treasury fund release
- ✅ Double-funding prevention
- ✅ Complete integration workflow

**Run Tests**:
```bash
anchor test
```

---

## 📋 Pre-Mainnet Checklist

Before deploying to mainnet, ensure:

- [ ] **Real ZK proofs implemented** (most critical!)
- [ ] Professional security audit completed (Halborn, OtterSec, Neodyme, etc.)
- [ ] Dynamic voting threshold based on supply
- [ ] Treasury balance verification
- [ ] Comprehensive integration tests with mainnet fork
- [ ] Frontend rate limiting to prevent spam
- [ ] Emergency pause mechanism for governance
- [ ] Upgrade authority properly configured
- [ ] Multi-sig for critical operations
- [ ] Bug bounty program established

---

## 🐛 Reporting Security Issues

**DO NOT** open public GitHub issues for security vulnerabilities.

Instead, please email: **security@yourdomain.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a timeline for fixes.

---

## 📚 Additional Resources

### Solana Security Best Practices
- [Solana Security Best Practices](https://docs.solana.com/developing/programming-model/security-best-practices)
- [Anchor Security](https://book.anchor-lang.com/anchor_in_depth/security.html)
- [Neodyme Audits](https://github.com/neodyme-labs/solana-security-txt)

### ZK Resources
- [ZK Whiteboard Sessions](https://zkhack.dev/whiteboard/)
- [Awesome Zero Knowledge](https://github.com/matter-labs/awesome-zero-knowledge-proofs)
- [Practical ZK](https://blog.pantherprotocol.io/a-practical-guide-to-zero-knowledge-proofs/)

### Auditing Firms
- [Halborn](https://halborn.com/)
- [OtterSec](https://osec.io/)
- [Neodyme](https://neodyme.io/)
- [Quantstamp](https://quantstamp.com/)

---

## 📜 Version History

### v0.2.0 (Current) - Security Hardening
- ✅ Fixed double-voting vulnerability
- ✅ Improved PoW verification
- ✅ Added input validation
- ✅ Automatic demurrage enforcement
- ✅ Comprehensive test suite
- ⚠️ ZK proofs still mock (documented limitation)

### v0.1.0 - Initial Release
- Basic staking mechanism
- Proposal creation with PoW
- Mock ZK voting
- Manual demurrage
- Multiple critical vulnerabilities (see above)

---

**Last Updated**: November 30, 2025  
**Status**: Development / Testnet Only  
**License**: MIT

