# Smart Contract Reference

Complete reference for CrypTrans smart contract functions and data structures.

## Instructions

### User Functions

#### `initialize_stake()`
Create a stake account for a user.

**Required Accounts:**
- `stake` - PDA seeded by `["stake", user]`
- `user` - Signer
- `system_program` - System Program

**Constraints:**
- User must be the signer
- Stake account must not exist

**Effects:**
- Creates new Stake account
- Initializes amount to 0
- Sets `last_demurrage` to current time
- Sets empty commitment

---

#### `stake_tokens(amount)`
Deposit tokens into stake account.

**Parameters:**
- `amount: u64` - Amount in lamports to stake

**Required Accounts:**
- `stake` - User's stake account (writable)
- `user` - Signer
- `user_token_account` - User's token account (writable)
- `stake_token_account` - Stake's token account (writable)
- `token_program` - SPL Token Program

**Constraints:**
- User must be signer
- User must have sufficient tokens

**Effects:**
- Transfers tokens from user to stake
- Increases stake.amount

---

#### `unstake_tokens(amount)`
Withdraw tokens from stake account.

**Parameters:**
- `amount: u64` - Amount in lamports to unstake

**Required Accounts:**
- `stake` - User's stake account (writable)
- `user` - Signer
- `user_token_account` - User's token account (writable)
- `stake_token_account` - Stake's token account (writable)
- `token_program` - SPL Token Program

**Constraints:**
- User must be signer
- Stake must have sufficient balance

**Effects:**
- Transfers tokens from stake to user
- Decreases stake.amount

---

#### `register_commitment(commitment)`
Register ZK commitment for anonymous voting.

**Parameters:**
- `commitment: [u8; 32]` - Poseidon hash of secret

**Required Accounts:**
- `stake` - User's stake account (writable)
- `user` - Signer

**Constraints:**
- User must be signer

**Effects:**
- Sets stake.commitment to provided value

---

### Governance Functions

#### `create_proposal(id, description, funding_needed, pow_nonce)`
Create a new governance proposal.

**Parameters:**
- `id: u64` - Unique proposal ID
- `description: String` - Proposal description (max 200 chars)
- `funding_needed: u64` - Amount to release (in lamports)
- `pow_nonce: String` - PoW solution

**Required Accounts:**
- `proposal` - PDA seeded by `["proposal", id]`
- `creator` - Signer
- `mint` - Token mint
- `treasury` - Proposal's token account
- `config` - GlobalConfig account
- `system_program`, `token_program`, `associated_token_program`

**Constraints:**
- Description must be ≤ 200 characters
- Funding must be ≤ 1,000,000,000,000 lamports
- PoW hash must start with required zeros

**Effects:**
- Creates Proposal account
- Creates treasury token account
- Sets expiration time based on config

---

#### `vote_with_zk(nullifier, commitment, proof_a, proof_b, proof_c)`
Cast an anonymous vote with ZK proof.

**Parameters:**
- `nullifier: [u8; 32]` - Vote proof nullifier
- `commitment: [u8; 32]` - Voter's commitment
- `proof_a: [u8; 64]` - ZK proof component A
- `proof_b: [u8; 128]` - ZK proof component B
- `proof_c: [u8; 64]` - ZK proof component C

**Required Accounts:**
- `proposal` - Proposal account (writable)
- `stake` - Voter's stake account
- `vote_record` - PDA seeded by `["vote", proposal, voter]`
- `config` - GlobalConfig account
- `voter` - Signer
- `system_program`

**Constraints:**
- Proposal must not be expired
- Proof must be non-zero (basic validation)
- Commitment must match registered value
- Vote record must not exist (prevent double-voting)

**Effects:**
- Creates VoteRecord
- Records nullifier
- Applies demurrage
- Increments proposal.votes

---

#### `release_funds()`
Release treasury funds if voting threshold is met.

**Required Accounts:**
- `proposal` - Proposal account (writable)
- `treasury` - Proposal's token account (writable)
- `recipient` - Recipient's token account (writable)
- `config` - GlobalConfig account
- `token_program`

**Constraints:**
- Votes must meet or exceed `config.voting_threshold`
- Proposal must not be already funded
- Treasury must have sufficient balance

**Effects:**
- Transfers funds to recipient
- Sets proposal.funded = true

---

### Configuration Functions

#### `initialize_config(voting_threshold, demurrage_rate, proposal_duration_seconds, pow_difficulty)`
Initialize global governance configuration.

**Parameters:**
- `voting_threshold: u64` - Votes needed to pass proposals
- `demurrage_rate: u64` - Annual decay rate (e.g., 200 = 2%)
- `proposal_duration_seconds: u64` - Proposal lifetime in seconds
- `pow_difficulty: u32` - Required leading zeros in PoW hash

**Required Accounts:**
- `config` - GlobalConfig account
- `admin` - Signer
- `system_program`

**Constraints:**
- Admin must be signer
- Config must not exist

**Effects:**
- Creates GlobalConfig account
- Sets all parameters

---

#### `update_config(voting_threshold, demurrage_rate, proposal_duration_seconds, pow_difficulty)`
Update global configuration (admin only).

**Parameters:**
- Same as `initialize_config`

**Required Accounts:**
- `config` - GlobalConfig account (writable)
- `admin` - Signer

**Constraints:**
- Admin must match config.admin
- Admin must be signer

**Effects:**
- Updates all configuration parameters

---

## Data Structures

### Stake
User's governance participation account.

```rust
pub struct Stake {
    pub user: Pubkey,                // User's wallet
    pub amount: u64,                 // Staked tokens
    pub last_demurrage: u64,         // Last demurrage timestamp
    pub commitment: [u8; 32],        // ZK commitment
}
```

### Proposal
Governance proposal.

```rust
pub struct Proposal {
    pub id: u64,                     // Unique ID
    pub creator: Pubkey,             // Proposal creator
    pub description: String,         // Proposal text (max 200)
    pub funding_needed: u64,         // Amount to release
    pub votes: u64,                  // Current vote count
    pub funded: bool,                // Has been funded
    pub treasury: Pubkey,            // Treasury account
    pub pow_hash: String,            // PoW solution nonce
    pub created_at: u64,             // Creation timestamp
    pub expires_at: u64,             // Expiration timestamp
}
```

### VoteRecord
Records that a user voted on a proposal.

```rust
pub struct VoteRecord {
    pub has_voted: bool,             // Vote recorded
    pub vote_weight: u64,            // Voting power used
    pub voted_at: u64,               // Vote timestamp
    pub nullifier: [u8; 32],         // ZK nullifier
}
```

### GlobalConfig
Governance parameters.

```rust
pub struct GlobalConfig {
    pub admin: Pubkey,               // Admin wallet
    pub voting_threshold: u64,       // Votes to pass
    pub demurrage_rate: u64,         // Annual decay
    pub proposal_duration_seconds: u64, // Proposal lifetime
    pub pow_difficulty: u32,         // PoW difficulty
}
```

## Error Codes

```rust
InsufficientVotes           // Not enough votes to pass
InvalidPoW                  // PoW hash doesn't meet difficulty
InvalidZKProof              // ZK proof validation failed
AlreadyFunded               // Proposal already funded
AlreadyVoted                // User already voted on this proposal
DescriptionTooLong          // Description exceeds 200 chars
FundingTooHigh              // Funding exceeds max amount
CommitmentMismatch          // Commitment doesn't match
ProposalExpired             // Proposal voting period ended
InsufficientTreasuryBalance // Treasury lacks funds
InsufficientStake           // Not enough stake to unstake
UnauthorizedAdmin           // Only admin can call
```

## Security Notes

- Nullifiers prevent double-voting
- Commitments must be pre-registered
- Proposals auto-expire
- Treasury balance validated before release
- All parameters configurable by admin
- Demurrage applied to prevent hoarding

## Gas Costs (Approximate)

- `initialize_stake()` - ~8,000 CUs
- `stake_tokens()` - ~15,000 CUs
- `vote_with_zk()` - ~20,000 CUs
- `create_proposal()` - ~25,000 CUs
- `release_funds()` - ~12,000 CUs

*CUs = Compute Units (Solana's measure of computation)*
