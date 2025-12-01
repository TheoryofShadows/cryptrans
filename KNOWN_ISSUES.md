# Known Issues and Limitations

This document tracks known issues, limitations, and planned improvements for CrypTrans.

---

## 🔴 Critical Issues

### 1. Mock Zero-Knowledge Proofs
**Status**: ❌ Not Fixed (Documented)  
**Severity**: CRITICAL  
**Impact**: Voting is not actually private

**Description**:
The current "ZK proof" implementation is just a SHA256 hash of random data. This provides no actual privacy:
- All votes are visible on-chain via transaction history
- Vote amounts can be correlated with stake amounts
- Timestamps can be used to de-anonymize voters
- Anyone can trace votes back to wallet addresses

**Location**: 
- `app/src/App.js` lines 74-80
- `programs/cryptrans/src/lib.rs` line 93 (only checks non-empty)

**Workaround**: None - this is a fundamental limitation

**Fix Plan**: See `SECURITY.md` for ZK implementation options (circom, Light Protocol, o1js)

**Estimated Effort**: 2-4 weeks for experienced ZK developer

---

## 🟡 Medium Severity Issues

### 2. Hardcoded Voting Threshold
**Status**: ⚠️ Needs Improvement  
**Severity**: MEDIUM  
**Impact**: Voting threshold not representative of actual supply

**Description**:
The voting threshold is hardcoded to 1 billion lamports (1 token):
```rust
require!(ctx.accounts.proposal.votes >= 1_000_000_000, ErrorCode::InsufficientVotes);
```

This doesn't scale with:
- Total token supply changes
- Token burns/mints
- Different governance requirements per proposal type

**Recommendation**:
- Make threshold a percentage of total supply (e.g., 51%)
- Or make it configurable per proposal
- Read from on-chain Mint account to get current supply

**Estimated Effort**: 4-8 hours

---

### 3. No Treasury Balance Verification
**Status**: ⚠️ Minor Issue  
**Severity**: MEDIUM  
**Impact**: Unclear error messages if treasury is empty

**Description**:
`release_funds()` attempts transfer without checking treasury balance first. If insufficient funds, the SPL Token program will reject with a generic error.

**Current Behavior**:
```
Error: failed to send transaction: Transaction simulation failed: Error processing Instruction 0: custom program error: 0x1
```

**Desired Behavior**:
```
Error: InsufficientTreasuryBalance - Treasury has 0.5 tokens but proposal needs 1.0 tokens
```

**Fix**:
```rust
let treasury_balance = ctx.accounts.treasury.amount;
require!(
    treasury_balance >= ctx.accounts.proposal.funding_needed,
    ErrorCode::InsufficientTreasuryBalance
);
```

**Estimated Effort**: 1-2 hours

---

### 4. No Proposal Expiration
**Status**: ⚠️ Missing Feature  
**Severity**: MEDIUM  
**Impact**: Old proposals can be voted on indefinitely

**Description**:
Proposals don't have expiration dates. A proposal from 2024 could still receive votes and funding in 2030.

**Recommendation**:
- Add `expires_at: u64` field to Proposal struct
- Check expiration in `vote()` function:
```rust
let current_time = Clock::get()?.unix_timestamp as u64;
require!(current_time <= proposal.expires_at, ErrorCode::ProposalExpired);
```
- Allow proposal creator to set duration (e.g., 7 days, 30 days)

**Estimated Effort**: 4-6 hours

---

### 5. No Proposal Cancellation
**Status**: ⚠️ Missing Feature  
**Severity**: MEDIUM  
**Impact**: Cannot cancel proposals with errors/mistakes

**Description**:
Once a proposal is created, it cannot be cancelled by the creator. If there's a typo or the proposal is no longer needed, the creator has no recourse.

**Recommendation**:
Add `cancel_proposal()` function:
- Only creator can cancel (before funding threshold is met)
- Refund PoW cost (if any was implemented)
- Mark proposal as `cancelled: bool`
- Prevent voting on cancelled proposals

**Estimated Effort**: 4-6 hours

---

## 🟢 Low Severity Issues

### 6. Clock Timestamp Manipulation
**Status**: ℹ️ Acknowledged  
**Severity**: LOW  
**Impact**: Minimal (~2 second variance in demurrage)

**Description**:
Solana validators can manipulate timestamps within a ~2 second window. This could theoretically be used to game demurrage calculations, but the impact is negligible given the annual calculation period.

**Mitigation**: Already minimal impact; slot-based calculations would be more robust but add complexity

**Fix Priority**: LOW (only needed for high-stakes financial applications)

---

### 7. No Partial Stake Withdrawal
**Status**: ⚠️ Missing Feature  
**Severity**: LOW  
**Impact**: Must unstake all tokens at once

**Description**:
Users can stake tokens but there's no implemented way to withdraw partial amounts. The `stake_tokens` function only adds to stake, and there's no complementary `unstake_tokens` function.

**Current Workaround**: None implemented

**Recommendation**:
```rust
pub fn unstake_tokens(ctx: Context<UnstakeTokens>, amount: u64) -> Result<()> {
    let stake = &mut ctx.accounts.stake;
    
    // Apply demurrage first
    // ... demurrage logic ...
    
    require!(stake.amount >= amount, ErrorCode::InsufficientStake);
    
    // Transfer tokens back
    // ... transfer logic ...
    
    stake.amount = stake.amount.checked_sub(amount).unwrap();
    Ok(())
}
```

**Estimated Effort**: 4-6 hours

---

### 8. No Vote Delegation
**Status**: ℹ️ Feature Request  
**Severity**: LOW  
**Impact**: Users must vote directly

**Description**:
Many governance systems allow vote delegation (e.g., delegate your voting power to a trusted community member). CrypTrans currently requires direct participation.

**Use Case**: 
- Large token holders who don't want to vote on every proposal
- Community leaders who want to represent a constituency
- Better participation rates

**Estimated Effort**: 2-3 days (requires significant redesign)

---

## 🏗️ Architectural Limitations

### 9. No Multi-Sig Support
**Status**: ℹ️ Future Enhancement  
**Severity**: LOW  
**Impact**: All operations require single signer

**Description**:
Critical operations (especially treasury management) should support multi-sig:
- Release large funding amounts
- Upgrade program authority
- Emergency pause

**Recommendation**: Integrate with Squads Protocol or implement custom multi-sig logic

**Estimated Effort**: 1-2 weeks

---

### 10. No Oracle Integration
**Status**: ℹ️ Future Enhancement  
**Severity**: LOW  
**Impact**: Cannot make decisions based on external data

**Description**:
Proposals are purely social/funding based. No mechanism to trigger actions based on external data (e.g., "fund this if BTC > $50k").

**Potential Integration**: Pyth Network, Switchboard, Chainlink

**Use Case**: Conditional funding, performance-based releases

**Estimated Effort**: 1-2 weeks

---

### 11. Gas Optimization Not Prioritized
**Status**: ℹ️ Acknowledged  
**Severity**: LOW  
**Impact**: Slightly higher transaction costs

**Description**:
The program prioritizes readability and security over gas optimization:
- String storage for descriptions and PoW hashes (could use fixed-size arrays)
- Multiple account reads in single transaction
- Generous space allocation

**Impact**: Each transaction costs ~0.001-0.01 SOL extra (negligible on Solana)

**Optimization Plan**: Defer until mainnet deployment is imminent

---

## 📊 Testing Gaps

### 12. Limited Stress Testing
**Status**: ⚠️ Needs Attention  
**Severity**: MEDIUM  
**Impact**: Unknown behavior under load

**Missing Test Scenarios**:
- Concurrent voting from multiple users
- Proposal creation spam (even with PoW)
- Very large stake amounts (u64 limits)
- Network congestion handling
- Account rent exemption edge cases

**Recommendation**: 
- Load testing with 100+ concurrent voters
- Fuzzing with random inputs
- Integration with mainnet-fork testing

**Estimated Effort**: 1-2 weeks

---

### 13. No Upgrade Path Testing
**Status**: ⚠️ Missing  
**Severity**: MEDIUM  
**Impact**: Unknown compatibility with future versions

**Description**:
No tests for upgrading the program while preserving existing accounts:
- Can old Proposal accounts be read by new program?
- Migration path for schema changes?
- Backwards compatibility strategy?

**Recommendation**: Implement versioning in account structs

**Estimated Effort**: 3-5 days

---

## 🔮 Future Enhancements

### Potential Features (Not Issues)
- **Quadratic Voting**: Vote cost increases quadratically
- **Conviction Voting**: Longer commitment = more weight
- **Proposal Dependencies**: "Fund X if Y passes"
- **Treasury Streaming**: Continuous fund release over time
- **Reputation System**: Track proposal success rates
- **NFT-gated Proposals**: Require specific NFT to create/vote
- **Cross-chain Proposals**: Wormhole integration for multi-chain governance

---

## 🔄 Issue Status Key

- ❌ **Not Fixed**: Issue acknowledged but not addressed
- ⚠️ **Needs Improvement**: Partial implementation or workaround exists
- ℹ️ **Acknowledged**: Known limitation, accepted trade-off
- 🏗️ **Planned**: Scheduled for future release
- ✅ **Fixed**: Issue has been resolved

---

## 📅 Roadmap Priority

### Phase 1: Critical Security (CURRENT)
- [x] Fix double-voting
- [x] Improve PoW verification
- [x] Add input validation
- [x] Automatic demurrage
- [ ] Implement real ZK proofs

### Phase 2: Governance Improvements
- [ ] Dynamic voting thresholds
- [ ] Proposal expiration
- [ ] Proposal cancellation
- [ ] Treasury balance checks
- [ ] Unstake functionality

### Phase 3: Advanced Features
- [ ] Vote delegation
- [ ] Multi-sig support
- [ ] Stress testing & optimization
- [ ] Oracle integration

### Phase 4: Production Readiness
- [ ] Professional security audit
- [ ] Mainnet-fork testing
- [ ] Gas optimization
- [ ] Upgrade path implementation
- [ ] Bug bounty program

---

## 💬 Contributing

Found a new issue? Want to fix one?

1. Check if it's already listed here
2. Open a GitHub issue with label `bug` or `enhancement`
3. For security issues, see `SECURITY.md`
4. Submit PRs referencing the issue number

---

**Last Updated**: November 30, 2025  
**Version**: 0.2.0  
**Contributors**: Feel free to add your name when fixing an issue!

