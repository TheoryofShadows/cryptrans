# Week 3 Plan: Tranche Release Voting System

## Overview

Week 3 implements the **perpetual tranche funding mechanism** that connects oracle verification to actual fund release. This is where the vision becomes reality: when oracles verify a milestone, community votes on releasing the next funding tranche.

---

## Architecture Overview

```
PHASE FLOW:
1. Admin creates TranhumanProject (5-10 year funding plan)
   ↓
2. Community votes YES on project (existing vote_with_zk)
   ↓
3. Project enters Year 1 with Tranche 1 ($5M)
   ↓
4. Year 1 milestone is achieved (GitHub commits, satellite proof, etc.)
   ↓
5. Oracles verify milestone (submit_milestone_attestation + verify_milestone from Week 2)
   ↓
6. propose_tranche_release() creates voting proposal
   ↓
7. Community votes on "Release Year 1 funds?" (vote_on_tranche_release)
   ↓
8. execute_tranche_release() transfers $5M if 66%+ voted YES
   ↓
9. Immutable TrancheReleaseRecord created + archived to Arweave
   ↓
10. Year 3, 5, 7: Repeat for next tranches
```

---

## Detailed Instruction Specifications

### 1. `propose_transhuman_project()`

**Purpose**: Create a multi-year, multi-tranche funding project

**Location**: To be added in `lib.rs` (around line 487, after verify_milestone)

**Function Signature**:
```rust
pub fn propose_transhuman_project(
    ctx: Context<CreateTranhumanProject>,
    project_name: String,
    project_description: String,
    tranches: Vec<TrancheInput>,  // Vec of tranche data
) -> Result<()> {
    // Implementation here
}
```

**Input Structure** (helper):
```rust
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct TrancheInput {
    pub sequence: u8,               // Tranche 1, 2, 3...
    pub funding_amount: u64,        // Amount in lamports
    pub unlock_date: u64,           // Unix timestamp (can't release before)
    pub milestone_description: String,  // What must be achieved
    pub verification_type: MilestoneVerificationType,  // How to verify
    pub required_attestations: u8,  // Quorum size (default 3)
}
```

**Implementation Steps**:
1. Validate inputs:
   - project_name.len() <= 128
   - project_description.len() <= 1000
   - tranches.len() >= 1 && tranches.len() <= 10
   - tranches are in order (sequence 1, 2, 3...)
   - Each tranche.funding_amount > 0
   - Unlock dates are increasing

2. Calculate total funding needed:
   ```rust
   let total_funding = tranches.iter().map(|t| t.funding_amount).sum()
   ```

3. Create TranhumanProject account with:
   - id: Unique project ID (use ctx.accounts.config.next_project_id?)
   - name: project_name
   - description: project_description
   - creator: ctx.accounts.creator.key()
   - total_funding_needed: total_funding
   - treasury: ctx.accounts.treasury.key() (the escrow account)
   - tranches: Vec of Tranche objects created from inputs
   - status: ProjectStatus::Proposed
   - approval_votes_required: 66 (supermajority)
   - created_at: now
   - completed_at: None
   - arweave_hash: None
   - immutable_record: true

4. For each tranche in tranches:
   - Create Milestone account with:
     - id: Unique milestone ID (derived from project_id + sequence)
     - tranche_id: sequence
     - description: milestone_description
     - verification_type: MilestoneVerificationType
     - required_attestations: required_attestations
     - attestations: Vec::new()
     - verified_at: None
     - release_triggered: false
     - created_at: now

5. Emit ProjectProposed event:
```rust
emit!(ProjectProposed {
    project_id: project.id,
    project_name: project.name.clone(),
    creator: ctx.accounts.creator.key(),
    total_funding: total_funding,
    tranches_count: tranches.len() as u8,
    created_at: now,
});
```

**Account Context**:
```rust
#[derive(Accounts)]
#[instruction(project_name: String)]
pub struct CreateTranhumanProject<'info> {
    // TranhumanProject PDA (the project account)
    #[account(
        init,
        payer = creator,
        space = 8 + 8 + 4 + 128 + 4 + 1000 + 32 + 8 +
                4 + (Vec size) + 1 + 8 + 8 + 1 + 4 + 8,
        seeds = [b"project", project_name.as_bytes()],
        bump
    )]
    pub transhuman_project: Account<'info, TranhumanProject>,

    // Treasury account (holds escrow funds)
    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = transhuman_project
    )]
    pub treasury: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub config: Account<'info, GlobalConfig>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}
```

**Error Handling**:
- ErrorCode::ProjectNameTooLong (new)
- ErrorCode::ProjectDescriptionTooLong (new)
- ErrorCode::InvalidTrancheCount (new)
- ErrorCode::InvalidTrancheSequence (new)
- ErrorCode::InvalidUnlockDates (new)

---

### 2. `propose_tranche_release()`

**Purpose**: Initiate community voting on releasing a specific tranche's funds

**Triggers After**: Milestone is verified (milestone.verified_at is Some)

**Function Signature**:
```rust
pub fn propose_tranche_release(
    ctx: Context<ProposeTrancheRelease>,
    project_id: u64,
    tranche_id: u64,
    voting_period_seconds: u64,  // e.g., 7 days = 604800
) -> Result<()> {
    // Implementation here
}
```

**Implementation Steps**:
1. Validate inputs:
   - voting_period_seconds >= 86400 (minimum 1 day)
   - voting_period_seconds <= 2592000 (maximum 30 days)

2. Load and validate project:
   - Project status must be ProjectStatus::Approved or ProjectStatus::InProgress
   - Get the tranche from project.tranches matching tranche_id

3. Validate tranche:
   - Tranche must not be released (!tranche.released)
   - Tranche unlock date must have passed (now >= tranche.unlock_date)
   - Linked milestone must be verified

4. Create TrancheReleaseProposal account with:
   - id: Unique proposal ID
   - project_id: project_id
   - tranche_id: tranche_id
   - proposed_at: now
   - voting_deadline: now + voting_period_seconds
   - votes_yes: 0
   - votes_no: 0
   - votes_abstain: 0
   - status: TrancheVoteStatus::Open

5. Emit TrancheReleaseProposed event:
```rust
emit!(TrancheReleaseProposed {
    project_id,
    tranche_id,
    required_votes: config.voting_threshold,  // 66% of voting power
    voting_deadline: now + voting_period_seconds,
});
```

**Account Context**:
```rust
#[derive(Accounts)]
#[instruction(project_id: u64, tranche_id: u64)]
pub struct ProposeTrancheRelease<'info> {
    #[account(
        init,
        payer = proposer,
        space = 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1,
        seeds = [b"tranche_proposal", project_id.to_le_bytes().as_ref(), tranche_id.to_le_bytes().as_ref()],
        bump
    )]
    pub tranche_proposal: Account<'info, TrancheReleaseProposal>,

    #[account(
        mut,
        seeds = [b"project", project_name.as_bytes()],  // Need to pass project_name
    )]
    pub transhuman_project: Account<'info, TranhumanProject>,

    #[account(
        seeds = [b"milestone", project_id.to_le_bytes().as_ref(), tranche_id.to_le_bytes().as_ref()],
    )]
    pub milestone: Account<'info, Milestone>,

    pub config: Account<'info, GlobalConfig>,
    #[account(mut)]
    pub proposer: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

**Error Handling**:
- ErrorCode::ProjectNotFound (new)
- ErrorCode::ProjectStatusInvalid (already exists in tranche.rs but use it)
- ErrorCode::TrancheNotUnlocked
- ErrorCode::MilestoneNotVerified
- ErrorCode::InvalidVotingPeriod (new)

---

### 3. `vote_on_tranche_release()`

**Purpose**: Allow stakeholders to vote YES/NO/ABSTAIN on tranche release

**Similar To**: `vote_with_zk()` but for tranche voting instead of proposal voting

**Function Signature**:
```rust
pub fn vote_on_tranche_release(
    ctx: Context<VoteOnTrancheRelease>,
    project_id: u64,
    tranche_id: u64,
    vote: TrancheVoteType,  // Yes, No, or Abstain
) -> Result<()> {
    // Implementation here
}
```

**Implementation Steps**:
1. Get current time and validate voting window:
   - current_time <= proposal.voting_deadline (voting still open)

2. Check user hasn't already voted:
   - Check VoteRecord for this proposal + user combo doesn't exist or has !has_voted

3. Load stake account and apply demurrage:
   ```rust
   let mut adjusted_stake = stake.amount;
   if current_time > stake.last_demurrage {
       let time_elapsed = current_time - stake.last_demurrage;
       let decay = adjusted_stake
           .checked_mul(config.demurrage_rate).unwrap()
           .checked_mul(time_elapsed).unwrap()
           .checked_div(365 * 24 * 3600 * 10000).unwrap();
       adjusted_stake = adjusted_stake.saturating_sub(decay);
   }
   ```

4. Add vote to proposal:
   ```rust
   match vote {
       TrancheVoteType::Yes => proposal.votes_yes += adjusted_stake,
       TrancheVoteType::No => proposal.votes_no += adjusted_stake,
       TrancheVoteType::Abstain => proposal.votes_abstain += adjusted_stake,
   }
   ```

5. Record vote:
   - Create/update VoteRecord
   - Mark has_voted = true
   - Store vote_weight = adjusted_stake
   - Store voted_at = now

6. Emit VoteEvent (similar to proposal voting)

**Account Context**:
```rust
#[derive(Accounts)]
#[instruction(project_id: u64, tranche_id: u64)]
pub struct VoteOnTrancheRelease<'info> {
    #[account(mut)]
    pub tranche_proposal: Account<'info, TrancheReleaseProposal>,

    #[account(
        seeds = [b"stake", voter.key().as_ref()],
    )]
    pub stake: Account<'info, Stake>,

    #[account(
        init_if_needed,  // Create vote record if not exists
        payer = voter,
        space = 8 + 32 + 1 + 8 + 8,
        seeds = [b"tranche_vote", tranche_proposal.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,

    pub config: Account<'info, GlobalConfig>,
    #[account(mut)]
    pub voter: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

**Error Handling**:
- ErrorCode::ProposalExpired (rename to VotingExpired and reuse)
- ErrorCode::AlreadyVoted
- ErrorCode::InsufficientStake

---

### 4. `execute_tranche_release()`

**Purpose**: Release funds if voting passed (66%+ approved), create immutable record

**Triggers After**: Voting deadline passed and supermajority met

**Function Signature**:
```rust
pub fn execute_tranche_release(
    ctx: Context<ExecuteTrancheRelease>,
    project_id: u64,
    tranche_id: u64,
) -> Result<()> {
    // Implementation here
}
```

**Implementation Steps**:
1. Validate voting is closed:
   - current_time >= proposal.voting_deadline

2. Check proposal hasn't already been executed:
   - proposal.status != TrancheVoteStatus::Executed

3. Calculate approval rate:
   ```rust
   let total_votes = votes_yes + votes_no + votes_abstain;
   let approval_rate = (votes_yes * 100) / total_votes;
   ```

4. Validate supermajority (66%):
   ```rust
   require!(approval_rate >= 66, ErrorCode::InsufficientVoteApproval);
   require!(votes_yes > votes_no, ErrorCode::InsufficientVoteApproval);
   ```

5. Load project and tranche:
   - Get tranche from project.tranches
   - Validate tranche.released == false

6. Transfer funds from treasury to recipient:
   ```rust
   let cpi_accounts = Transfer {
       from: ctx.accounts.treasury.to_account_info(),
       to: ctx.accounts.recipient_token_account.to_account_info(),
       authority: ctx.accounts.transhuman_project.to_account_info(),
   };

   let seeds = &[
       b"project",
       project_name.as_bytes(),
       &[ctx.bumps.transhuman_project],
   ];
   let signer = &[&seeds[..]];

   let cpi_program = ctx.accounts.token_program.to_account_info();
   let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
   token::transfer(cpi_ctx, tranche.funding_amount)?;
   ```

7. Create immutable TrancheReleaseRecord:
   ```rust
   let record = &mut ctx.accounts.tranche_release_record;
   record.project_id = project_id;
   record.project_name = project.name.clone();
   record.tranche_id = tranche_id;
   record.tranche_sequence = tranche.sequence;
   record.milestone_description = milestone.description.clone();
   record.amount = tranche.funding_amount;
   record.recipient = tranche.recipient;
   record.released_at = current_time;
   record.oracle_attestations_count = milestone.attestations.len() as u8;
   record.vote_approval_rate = approval_rate;
   record.arweave_hash = None;  // Week 4: Archive to Arweave
   ```

8. Mark tranche as released:
   ```rust
   tranche.released = true;
   tranche.released_at = Some(current_time);
   ```

9. Update project status if all tranches released:
   ```rust
   if project.is_fully_funded() {
       project.status = ProjectStatus::Completed;
       project.completed_at = Some(current_time);
   }
   ```

10. Update proposal status:
    ```rust
    proposal.status = TrancheVoteStatus::Executed;
    ```

11. Emit TrancheReleased event:
    ```rust
    emit!(TrancheReleased {
        project_id,
        project_name: project.name.clone(),
        tranche_id,
        milestone: milestone.description.clone(),
        amount: tranche.funding_amount,
        recipient: tranche.recipient,
        released_at: current_time,
        vote_approval: approval_rate,
    });
    ```

**Account Context**:
```rust
#[derive(Accounts)]
#[instruction(project_id: u64, tranche_id: u64)]
pub struct ExecuteTrancheRelease<'info> {
    #[account(mut)]
    pub tranche_proposal: Account<'info, TrancheReleaseProposal>,

    #[account(mut)]
    pub transhuman_project: Account<'info, TranhumanProject>,

    #[account(mut)]
    pub milestone: Account<'info, Milestone>,

    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,

    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = executor,
        space = 8 + 8 + 4 + 128 + 8 + 8 + 4 + 500 + 8 + 8 + 32 + 1 + 4 + 1,
        seeds = [b"release_record", project_id.to_le_bytes().as_ref(), tranche_id.to_le_bytes().as_ref()],
        bump
    )]
    pub tranche_release_record: Account<'info, TrancheReleaseRecord>,

    #[account(mut)]
    pub executor: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
```

**Error Handling**:
- ErrorCode::VotingStillOpen (new)
- ErrorCode::InsufficientVoteApproval
- ErrorCode::TrancheAlreadyReleased
- ErrorCode::ProjectNotFound

---

## New Data Structures Needed

All these are already defined in `tranche.rs`, we just need to use them:

1. **TranhumanProject** (already defined)
2. **Tranche** (already defined)
3. **TrancheReleaseProposal** (already defined)
4. **TrancheReleaseRecord** (already defined)
5. **TrancheVoteStatus** enum (already defined)
6. **TrancheVoteType** enum (already defined)

### New Helper Input Struct:
```rust
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct TrancheInput {
    pub sequence: u8,
    pub funding_amount: u64,
    pub unlock_date: u64,
    pub milestone_description: String,
    pub verification_type: MilestoneVerificationType,
    pub required_attestations: u8,
}
```

---

## New Error Codes

```rust
#[msg("Project name exceeds maximum length")]
ProjectNameTooLong,

#[msg("Project description exceeds maximum length")]
ProjectDescriptionTooLong,

#[msg("Invalid tranche count (must be 1-10)")]
InvalidTrancheCount,

#[msg("Tranches must be in sequence (1, 2, 3...)")]
InvalidTrancheSequence,

#[msg("Unlock dates must be increasing")]
InvalidUnlockDates,

#[msg("Invalid voting period")]
InvalidVotingPeriod,

#[msg("Project not found")]
ProjectNotFound,

#[msg("Voting period is still open")]
VotingStillOpen,

#[msg("Insufficient vote approval for release")]
InsufficientVoteApproval,
```

---

## New Events

```rust
#[event]
pub struct ProjectProposed {
    pub project_id: u64,
    pub project_name: String,
    pub creator: Pubkey,
    pub total_funding: u64,
    pub tranches_count: u8,
    pub created_at: u64,
}

// TrancheReleaseProposed, TrancheReleased, ProjectCompleted
// already defined in tranche.rs
```

---

## Integration Points

### Connect to Week 2 Oracle System:
- `propose_tranche_release()` checks milestone.verified_at is Some
- `execute_tranche_release()` uses oracle attestation count in record
- Voting confirms oracle verification was correct

### Connect to Existing Governance:
- Use demurrage from `apply_demurrage()` in vote_on_tranche_release()
- Use existing Stake accounts for voting weight
- Use existing config for voting parameters

### Create New Workflow:
```
1. Admin calls propose_transhuman_project()
   → Creates project with multiple tranches
   → Creates milestone for each tranche

2. Community votes project YES (via existing vote_with_zk)
   → Project status = Approved

3. Year 1 passes, milestone is achieved
   → Oracles call submit_milestone_attestation() (Week 2)
   → Oracle calls verify_milestone() (Week 2)
   → milestone.verified_at = timestamp

4. Anyone calls propose_tranche_release()
   → TrancheReleaseProposal created
   → 7-day voting period starts

5. Community votes on tranche (via vote_on_tranche_release)
   → Stake holders vote YES/NO/ABSTAIN
   → Demurrage applied to their stake

6. After voting period, execute_tranche_release()
   → Funds transferred from treasury
   → TrancheReleaseRecord created (immutable)
   → TrancheReleased event emitted
   → Arweave archiving queued (Week 4)

7. Record shows: "CrypTrans funded Year 1 of WBE on 2025-01-15, verified by 3 oracles, approved by 78% of stakeholders"
```

---

## Test Plan for Week 3

1. **test_propose_transhuman_project**
   - Create project with 3 tranches
   - Verify all tranches initialized
   - Verify milestones created

2. **test_propose_tranche_release**
   - Verify can't propose before unlock date
   - Verify can't propose if milestone not verified
   - Verify voting deadline set correctly

3. **test_vote_on_tranche_release**
   - Vote YES from multiple stakeholders
   - Vote NO from some
   - Vote ABSTAIN from others
   - Verify demurrage applied to votes
   - Verify can't vote twice

4. **test_execute_tranche_release**
   - Execute with 66% approval (should succeed)
   - Execute with <66% approval (should fail)
   - Verify funds transferred
   - Verify record created
   - Verify project status updated

5. **test_full_tranche_workflow**
   - Create project
   - Verify milestone (via Week 2 oracles)
   - Propose release
   - Vote and execute
   - Verify immutable record

---

## Checklist for Implementation

- [ ] Add TrancheInput struct to oracle.rs or lib.rs
- [ ] Implement propose_transhuman_project()
- [ ] Implement propose_tranche_release()
- [ ] Implement vote_on_tranche_release()
- [ ] Implement execute_tranche_release()
- [ ] Add all new error codes to ErrorCode enum
- [ ] Add all new events (ProjectProposed already done)
- [ ] Create all Account contexts
- [ ] Wire up CPI for token transfers
- [ ] Write comprehensive tests
- [ ] Verify clean compilation
- [ ] Create WEEK_3_TRANCHE_VOTING.md documentation
- [ ] Commit to GitHub

---

## Timeline

- **Target Duration**: 1 week (same as Week 2)
- **Complexity**: Similar to Week 2 (4 instructions to implement)
- **Build Dependencies**: All depend on Week 2 oracle completion
- **Testing**: Can be done in parallel with implementation

---

## Post-Week 3 Status

After Week 3 completes:
- ✅ Oracle infrastructure (register, score, attest, verify)
- ✅ Multi-year project funding structure
- ✅ Voting on tranche release (66%+ supermajority)
- ✅ Immutable release records
- ⏳ Oracle slashing mechanism (Week 4)
- ⏳ Arweave permanent archive (Week 4)
- ⏳ Full Groth16 verification (post-audit)

**Readiness**: System will be feature-complete for Phase 3 Beta. Can do internal testing with real ZK proofs and tranche workflows.

---

## Architecture Diagram

```
TranhumanProject
├── Tranche 1 (Year 1: $5M)
│   └── Milestone 1 (Lab built)
│       ├── OracleAttestation (Alice: 95% confidence)
│       ├── OracleAttestation (Bob: 92% confidence)
│       └── OracleAttestation (Carol: 88% confidence)
│           └── Verified! (91.67% avg >= 70%)
│               └── TrancheReleaseProposal (voting starts)
│                   ├── Vote: Alice (10k stake) YES
│                   ├── Vote: Bob (20k stake) YES
│                   └── Vote: Carol (5k stake) NO
│                       └── Execute! (75% approval > 66%)
│                           └── TrancheReleaseRecord (immutable)
│                               └── Archive to Arweave
│
├── Tranche 2 (Year 3: $10M)
│   └── Milestone 2 (Patients recruited)
│
├── Tranche 3 (Year 5: $15M)
│   └── Milestone 3 (Tech development)
│
└── Tranche 4 (Year 7: $20M)
    └── Milestone 4 (First trials)
```

---

This plan makes the **perpetual funding vision real**: projects get multi-year funding locked in by immutable oracle verification and community voting. No government can censor it. No single entity can control it.

When Phase 3 goes live, this system will be the **monetary backbone of transhuman progress**.

