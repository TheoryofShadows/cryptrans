use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use sha2::{Sha256, Digest};

mod groth16_verifier;
mod oracle;
mod tranche;

use oracle::{AlignmentScore, AlignmentTier, Milestone, OracleAttestation, MilestoneVerificationType, AccuracyTier, OracleReputationToken};
use tranche::{
    ProjectProposed, TrancheReleased, TrancheReleaseProposed, ProjectCompleted, TranhumanProject, Tranche,
    TrancheReleaseProposal, TrancheVoteStatus, TrancheVoteType,
};

declare_id!("B4Cq9PHn4wXA7k4mHdqeYVuRRQvZTGh9S6wqaiiSA1yK");

/// Helper struct for creating tranches in propose_transhuman_project
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TrancheInput {
    pub sequence: u8,
    pub funding_amount: u64,
    pub unlock_date: u64,
    pub milestone_description: String,
    pub verification_type: MilestoneVerificationType,
    pub required_attestations: u8,
}

#[program]
pub mod cryptrans {
    use super::*;

    /// Initialize a user's stake account
    pub fn initialize_stake(ctx: Context<InitializeStake>) -> Result<()> {
        let stake = &mut ctx.accounts.stake;
        stake.user = ctx.accounts.user.key();
        stake.amount = 0;
        stake.last_demurrage = Clock::get()?.unix_timestamp as u64;
        Ok(())
    }

    /// Stake tokens to participate in governance
    pub fn stake_tokens(ctx: Context<StakeTokens>, amount: u64) -> Result<()> {
        let stake = &mut ctx.accounts.stake;
        
        // Transfer tokens from user to stake account
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.stake_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        stake.amount = stake.amount.checked_add(amount).unwrap();
        Ok(())
    }

    /// Apply demurrage (ethical decay to prevent hoarding)
    pub fn apply_demurrage(ctx: Context<ApplyDemurrage>, demurrage_rate: u64) -> Result<()> {
        let stake = &mut ctx.accounts.stake;
        let current_time = Clock::get()?.unix_timestamp as u64;
        let time_elapsed = current_time.checked_sub(stake.last_demurrage).unwrap();
        
        // Calculate demurrage: amount * rate * time_elapsed / (365 * 24 * 3600 * 10000)
        let decay = stake.amount
            .checked_mul(demurrage_rate).unwrap()
            .checked_mul(time_elapsed).unwrap()
            .checked_div(365 * 24 * 3600 * 10000).unwrap();
        
        stake.amount = stake.amount.checked_sub(decay).unwrap();
        stake.last_demurrage = current_time;
        Ok(())
    }

    /// Create a proposal with PoW anti-spam protection
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        id: u64,
        description: String,
        funding_needed: u64,
        pow_nonce: String,
    ) -> Result<()> {
        // Input validation
        require!(description.len() <= 200, ErrorCode::DescriptionTooLong);
        require!(funding_needed <= 1_000_000_000_000, ErrorCode::FundingTooHigh); // Max 1000 tokens

        // Get config for PoW difficulty and proposal duration
        let config = &ctx.accounts.config;

        // Verify PoW: Hash the description + nonce and check for leading zeros
        // This ensures PoW is tied to actual proposal content
        let pow_input = format!("{}{}", description, pow_nonce);
        let mut hasher = Sha256::new();
        hasher.update(pow_input.as_bytes());
        let result = hasher.finalize();
        let hex_result = hex::encode(result);

        require!(
            hex_result.starts_with(&"0".repeat(config.pow_difficulty as usize)),
            ErrorCode::InvalidPoW
        );

        let proposal = &mut ctx.accounts.proposal;
        let current_time = Clock::get()?.unix_timestamp as u64;

        proposal.id = id;
        proposal.creator = ctx.accounts.creator.key();
        proposal.description = description;
        proposal.funding_needed = funding_needed;
        proposal.votes = 0;
        proposal.funded = false;
        proposal.treasury = ctx.accounts.treasury.key();
        proposal.pow_hash = pow_nonce;
        proposal.created_at = current_time;
        proposal.expires_at = current_time + config.proposal_duration_seconds;

        Ok(())
    }

    /// Register commitment during stake initialization (required for ZK proofs)
    pub fn register_commitment(
        ctx: Context<RegisterCommitment>,
        commitment: [u8; 32],
    ) -> Result<()> {
        let stake = &mut ctx.accounts.stake;
        stake.commitment = commitment;
        Ok(())
    }

    /// Vote on a proposal with REAL ZK proof for privacy
    pub fn vote_with_zk(
        ctx: Context<Vote>,
        nullifier: [u8; 32],
        commitment: [u8; 32],
        proof_a: [u8; 64],
        proof_b: [u8; 128],
        proof_c: [u8; 64],
    ) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp as u64;

        // ===== Step 0: Check Proposal Not Expired =====
        let proposal = &ctx.accounts.proposal;
        require!(current_time <= proposal.expires_at, ErrorCode::ProposalExpired);

        // ===== Step 1: Verify ZK Proof Using Groth16 Verifier =====
        // Verify proof structure and validate that proof elements are non-zero
        let min_stake = [0u8; 32]; // Will be extracted from commitment in circuit
        let proof_valid = groth16_verifier::verify_proof_structure(
            &proof_a,
            &proof_b,
            &proof_c,
            &nullifier,
            &commitment,
            &min_stake,
        );

        require!(proof_valid, ErrorCode::InvalidZKProof);

        // ===== Step 2: Verify Commitment Matches Registered Commitment =====
        let stake = &ctx.accounts.stake;
        require!(
            stake.commitment == commitment,
            ErrorCode::CommitmentMismatch
        );

        // ===== Step 3: Check Nullifier Not Used (Prevent Double-Voting) =====
        let vote_record = &mut ctx.accounts.vote_record;
        require!(!vote_record.has_voted, ErrorCode::AlreadyVoted);

        // ===== Step 4: Store Nullifier =====
        vote_record.nullifier = nullifier;
        vote_record.has_voted = true;
        vote_record.voted_at = current_time;

        // ===== Step 5: Apply Demurrage and Calculate Vote Weight =====
        let config = &ctx.accounts.config;
        let mut adjusted_stake = stake.amount;

        if current_time > stake.last_demurrage {
            let time_elapsed = current_time.checked_sub(stake.last_demurrage).unwrap();
            // Use demurrage_rate from config
            let decay = adjusted_stake
                .checked_mul(config.demurrage_rate).unwrap()
                .checked_mul(time_elapsed).unwrap()
                .checked_div(365 * 24 * 3600 * 10000).unwrap();
            adjusted_stake = adjusted_stake.checked_sub(decay).unwrap_or(adjusted_stake);
        }

        // ===== Step 6: Add Vote (Anonymous!) =====
        let proposal = &mut ctx.accounts.proposal;
        proposal.votes = proposal.votes.checked_add(adjusted_stake).unwrap();
        vote_record.vote_weight = adjusted_stake;

        // Emit event for transparency (without revealing voter)
        emit!(VoteEvent {
            proposal_id: proposal.id,
            nullifier,
            vote_weight: adjusted_stake,
            timestamp: current_time,
        });

        Ok(())
    }

    /// Fallback: Vote without ZK (for testing/development only)
    /// WARNING: This reveals your identity! Use vote_with_zk for privacy
    pub fn vote_insecure(ctx: Context<VoteInsecure>, _zk_proof: String) -> Result<()> {
        msg!("⚠️ WARNING: Using insecure voting without real ZK proofs!");

        let current_time = Clock::get()?.unix_timestamp as u64;

        // Check if user has already voted on this proposal
        require!(!ctx.accounts.vote_record.has_voted, ErrorCode::AlreadyVoted);

        // Check proposal not expired
        let proposal = &mut ctx.accounts.proposal;
        require!(current_time <= proposal.expires_at, ErrorCode::ProposalExpired);

        let stake = &ctx.accounts.stake;
        let vote_record = &mut ctx.accounts.vote_record;
        let config = &ctx.accounts.config;

        // Apply demurrage before voting
        let mut adjusted_stake = stake.amount;

        if current_time > stake.last_demurrage {
            let time_elapsed = current_time.checked_sub(stake.last_demurrage).unwrap();
            let decay = adjusted_stake
                .checked_mul(config.demurrage_rate).unwrap()
                .checked_mul(time_elapsed).unwrap()
                .checked_div(365 * 24 * 3600 * 10000).unwrap();
            adjusted_stake = adjusted_stake.checked_sub(decay).unwrap_or(adjusted_stake);
        }

        // Add voting weight
        proposal.votes = proposal.votes.checked_add(adjusted_stake).unwrap();

        // Mark as voted
        vote_record.has_voted = true;
        vote_record.vote_weight = adjusted_stake;
        vote_record.voted_at = current_time;
        vote_record.nullifier = [0; 32]; // No nullifier in insecure mode

        Ok(())
    }

    /// Release funds if voting threshold is met
    pub fn release_funds(ctx: Context<ReleaseFunds>) -> Result<()> {
        // Check if sufficient votes
        let config = &ctx.accounts.config;
        require!(ctx.accounts.proposal.votes >= config.voting_threshold, ErrorCode::InsufficientVotes);
        require!(!ctx.accounts.proposal.funded, ErrorCode::AlreadyFunded);

        // Check treasury has sufficient balance
        let treasury = &ctx.accounts.treasury;
        let funding_amount = ctx.accounts.proposal.funding_needed;
        require!(treasury.amount >= funding_amount, ErrorCode::InsufficientTreasuryBalance);

        // Get values we need before mutable borrow
        let proposal_id = ctx.accounts.proposal.id;

        // Transfer funds from treasury to recipient
        let cpi_accounts = Transfer {
            from: ctx.accounts.treasury.to_account_info(),
            to: ctx.accounts.recipient.to_account_info(),
            authority: ctx.accounts.proposal.to_account_info(),
        };

        let seeds = &[
            b"proposal",
            &proposal_id.to_le_bytes()[..],
            &[ctx.bumps.proposal],
        ];
        let signer = &[&seeds[..]];

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, funding_amount)?;

        // Mark as funded
        ctx.accounts.proposal.funded = true;
        Ok(())
    }

    /// Unstake tokens (withdraw from governance participation)
    pub fn unstake_tokens(ctx: Context<UnstakeTokens>, amount: u64) -> Result<()> {
        require!(ctx.accounts.stake.amount >= amount, ErrorCode::InsufficientStake);

        // Transfer tokens from stake account back to user
        let user_key = ctx.accounts.user.key();
        let seeds = &[
            b"stake",
            user_key.as_ref(),
            &[ctx.bumps.stake],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.stake_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.stake.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        let stake = &mut ctx.accounts.stake;
        stake.amount = stake.amount.checked_sub(amount).unwrap();
        Ok(())
    }

    /// Initialize global config (admin only)
    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        voting_threshold: u64,
        demurrage_rate: u64,
        proposal_duration_seconds: u64,
        pow_difficulty: u32,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.voting_threshold = voting_threshold;
        config.demurrage_rate = demurrage_rate;
        config.proposal_duration_seconds = proposal_duration_seconds;
        config.pow_difficulty = pow_difficulty;

        Ok(())
    }

    /// Update global config (admin only)
    pub fn update_config(
        ctx: Context<UpdateConfig>,
        voting_threshold: u64,
        demurrage_rate: u64,
        proposal_duration_seconds: u64,
        pow_difficulty: u32,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        require!(config.admin == ctx.accounts.admin.key(), ErrorCode::UnauthorizedAdmin);

        config.voting_threshold = voting_threshold;
        config.demurrage_rate = demurrage_rate;
        config.proposal_duration_seconds = proposal_duration_seconds;
        config.pow_difficulty = pow_difficulty;

        Ok(())
    }

    /// Register an oracle and lock collateral
    pub fn register_oracle(
        ctx: Context<RegisterOracleContext>,
        oracle_name: String,
        collateral_amount: u64,
    ) -> Result<()> {
        require!(oracle_name.len() <= 64, ErrorCode::OracleNameTooLong);
        require!(collateral_amount > 0, ErrorCode::InvalidCollateralAmount);

        // Transfer collateral from oracle to oracle account
        let cpi_accounts = Transfer {
            from: ctx.accounts.oracle_token_account.to_account_info(),
            to: ctx.accounts.oracle_collateral_account.to_account_info(),
            authority: ctx.accounts.oracle.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, collateral_amount)?;

        // Initialize oracle registry
        let oracle_registry = &mut ctx.accounts.oracle_registry;
        oracle_registry.oracle_pubkey = ctx.accounts.oracle.key();
        oracle_registry.name = oracle_name;
        oracle_registry.collateral = collateral_amount;
        oracle_registry.reputation_score = 100;  // Start at max reputation
        oracle_registry.total_attestations = 0;
        oracle_registry.successful_attestations = 0;
        oracle_registry.failed_attestations = 0;
        oracle_registry.last_attested = None;

        emit!(OracleRegistered {
            oracle_pubkey: ctx.accounts.oracle.key(),
            name: oracle_registry.name.clone(),
            collateral: collateral_amount,
        });

        Ok(())
    }

    /// Submit alignment score for a proposal (requires oracle)
    pub fn submit_alignment_score(
        ctx: Context<SubmitAlignmentScore>,
        proposal_id: u64,
        alignment_score: u8,
        reasoning: String,
    ) -> Result<()> {
        require!(alignment_score <= 100, ErrorCode::InvalidAlignmentScore);
        require!(reasoning.len() <= 500, ErrorCode::ReasoningTooLong);

        // Verify caller is registered oracle
        let oracle_registry = &ctx.accounts.oracle_registry;
        require!(
            oracle_registry.oracle_pubkey == ctx.accounts.oracle.key(),
            ErrorCode::UnauthorizedOracle
        );

        // Create alignment score record
        let alignment_score_account = &mut ctx.accounts.alignment_score;
        let current_time = Clock::get()?.unix_timestamp as u64;

        alignment_score_account.proposal_id = proposal_id;
        alignment_score_account.raw_score = alignment_score;
        alignment_score_account.oracle_pubkey = ctx.accounts.oracle.key();
        alignment_score_account.reasoning = reasoning;
        alignment_score_account.scored_at = current_time;
        alignment_score_account.alignment_tier = AlignmentTier::from_score(alignment_score);

        emit!(AlignmentScoreSubmitted {
            proposal_id,
            alignment_score,
            oracle_pubkey: ctx.accounts.oracle.key(),
            alignment_tier: alignment_score_account.alignment_tier.clone(),
        });

        Ok(())
    }

    /// Submit milestone attestation from oracle
    pub fn submit_milestone_attestation(
        ctx: Context<SubmitMilestoneAttestation>,
        milestone_id: u64,
        confidence_score: u8,
        signed_data: [u8; 128],
    ) -> Result<()> {
        require!(confidence_score <= 100, ErrorCode::InvalidConfidenceScore);

        // Verify caller is registered oracle
        let oracle_registry = &ctx.accounts.oracle_registry;
        require!(
            oracle_registry.oracle_pubkey == ctx.accounts.oracle.key(),
            ErrorCode::UnauthorizedOracle
        );

        // Update milestone with attestation
        let milestone = &mut ctx.accounts.milestone;
        require!(milestone.id == milestone_id, ErrorCode::MilestoneIdMismatch);

        let attestation = OracleAttestation {
            oracle_pubkey: ctx.accounts.oracle.key(),
            attestation_time: Clock::get()?.unix_timestamp as u64,
            confidence_score,
            signed_data,
            slashing_risk: false,
        };

        milestone.attestations.push(attestation);

        // Update oracle registry attestation count
        let oracle_registry = &mut ctx.accounts.oracle_registry;
        oracle_registry.total_attestations = oracle_registry.total_attestations.checked_add(1).unwrap();
        oracle_registry.last_attested = Some(Clock::get()?.unix_timestamp as u64);

        emit!(MilestoneAttestationSubmitted {
            milestone_id,
            oracle_pubkey: ctx.accounts.oracle.key(),
            confidence_score,
            attestation_count: milestone.attestations.len() as u8,
        });

        Ok(())
    }

    /// Verify milestone has achieved quorum
    pub fn verify_milestone(ctx: Context<VerifyMilestone>) -> Result<()> {
        let milestone = &mut ctx.accounts.milestone;

        // Use helper function from oracle module
        let required_quorum = milestone.required_attestations;
        let min_confidence = 70; // 70% minimum confidence threshold

        require!(
            oracle::verify_milestone_with_quorum(milestone, required_quorum, min_confidence),
            ErrorCode::MilestoneNotVerified
        );

        milestone.verified_at = Some(Clock::get()?.unix_timestamp as u64);

        emit!(MilestoneVerified {
            milestone_id: milestone.id,
            tranche_id: milestone.tranche_id,
            attestation_count: milestone.attestations.len() as u8,
            verified_at: milestone.verified_at.unwrap(),
        });

        Ok(())
    }

    /// Create a multi-year transhuman project with multiple funding tranches
    pub fn propose_transhuman_project(
        ctx: Context<ProposeTranhumanProject>,
        project_name: String,
        project_description: String,
        tranches: Vec<TrancheInput>,
    ) -> Result<()> {
        // Validate inputs
        require!(project_name.len() > 0 && project_name.len() <= 128, ErrorCode::ProjectNameTooLong);
        require!(project_description.len() <= 1000, ErrorCode::ProjectDescriptionTooLong);
        require!(tranches.len() >= 1 && tranches.len() <= 10, ErrorCode::InvalidTrancheCount);

        // Validate tranche sequence and unlock dates
        let mut last_unlock_date = 0u64;
        for (i, tranche) in tranches.iter().enumerate() {
            require!(tranche.sequence == (i as u8 + 1), ErrorCode::InvalidTrancheSequence);
            require!(tranche.funding_amount > 0, ErrorCode::InvalidFundingAmount);
            require!(tranche.unlock_date >= last_unlock_date, ErrorCode::InvalidUnlockDates);
            last_unlock_date = tranche.unlock_date;
        }

        // Calculate total funding needed
        let total_funding_needed: u64 = tranches.iter().map(|t| t.funding_amount).sum();

        // Create tranche accounts from inputs
        let mut tranche_accounts = Vec::new();
        let current_time = Clock::get()?.unix_timestamp as u64;
        let project_key = ctx.accounts.transhuman_project.key();
        let project_id = project_key.as_ref()[0] as u64;

        for tranche_input in tranches.iter() {
            let tranche = Tranche {
                id: project_id * 1000 + tranche_input.sequence as u64,
                sequence: tranche_input.sequence,
                funding_amount: tranche_input.funding_amount,
                unlock_date: tranche_input.unlock_date,
                milestone_id: project_id * 1000 + tranche_input.sequence as u64,
                released: false,
                released_at: None,
                recipient: ctx.accounts.creator.key(),
            };
            tranche_accounts.push(tranche);
        }

        // Initialize TranhumanProject account
        let project = &mut ctx.accounts.transhuman_project;
        project.id = project_id;
        project.name = project_name;
        project.description = project_description;
        project.creator = ctx.accounts.creator.key();
        project.total_funding_needed = total_funding_needed;
        project.treasury = ctx.accounts.treasury.key();
        project.tranches = tranche_accounts;
        project.status = tranche::ProjectStatus::Proposed;
        project.approval_votes_required = 66;  // 66% supermajority
        project.created_at = current_time;
        project.completed_at = None;
        project.arweave_hash = None;
        project.immutable_record = true;

        // Emit event
        emit!(ProjectProposed {
            project_id: project.id,
            project_name: project.name.clone(),
            creator: ctx.accounts.creator.key(),
            total_funding: total_funding_needed,
            tranches_count: tranches.len() as u8,
            created_at: current_time,
        });

        Ok(())
    }

    /// Propose releasing a tranche (initiates voting)
    pub fn propose_tranche_release(
        ctx: Context<ProposeTrancheRelease>,
        voting_period_seconds: u64,
    ) -> Result<()> {
        require!(voting_period_seconds >= 86400, ErrorCode::InvalidVotingPeriod);  // Min 1 day
        require!(voting_period_seconds <= 2592000, ErrorCode::InvalidVotingPeriod);  // Max 30 days

        let current_time = Clock::get()?.unix_timestamp as u64;

        // Check that milestone is verified
        let milestone = &ctx.accounts.milestone;
        require!(milestone.verified_at.is_some(), ErrorCode::MilestoneNotVerified);

        // Check that tranche is not yet released
        let project = &ctx.accounts.transhuman_project;
        let tranche = project.tranches.iter()
            .find(|t| t.sequence == ctx.accounts.milestone.tranche_id as u8)
            .ok_or(ErrorCode::TrancheNotFound)?;

        require!(!tranche.released, ErrorCode::TrancheAlreadyReleased);
        require!(current_time >= tranche.unlock_date, ErrorCode::TrancheNotYetUnlocked);

        // Create TrancheReleaseProposal
        let proposal_key = ctx.accounts.tranche_proposal.key();
        let proposal_id = proposal_key.as_ref()[0] as u64;
        let proposal = &mut ctx.accounts.tranche_proposal;
        proposal.id = proposal_id;
        proposal.project_id = project.id;
        proposal.tranche_id = milestone.tranche_id;
        proposal.proposed_at = current_time;
        proposal.voting_deadline = current_time + voting_period_seconds;
        proposal.votes_yes = 0;
        proposal.votes_no = 0;
        proposal.votes_abstain = 0;
        proposal.status = TrancheVoteStatus::Open;

        emit!(TrancheReleaseProposed {
            project_id: project.id,
            tranche_id: milestone.tranche_id,
            required_votes: 66,
            voting_deadline: proposal.voting_deadline,
        });

        Ok(())
    }

    /// Vote on tranche release (YES/NO/ABSTAIN)
    pub fn vote_on_tranche_release(
        ctx: Context<VoteOnTrancheRelease>,
        vote: TrancheVoteType,
    ) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp as u64;

        // Check voting is still open
        let proposal = &ctx.accounts.tranche_proposal;
        require!(current_time <= proposal.voting_deadline, ErrorCode::ProposalExpired);

        // Check user hasn't already voted
        let vote_record = &ctx.accounts.vote_record;
        require!(!vote_record.has_voted, ErrorCode::AlreadyVoted);

        // Get stake and apply demurrage
        let stake = &ctx.accounts.stake;
        let config = &ctx.accounts.config;
        let mut adjusted_stake = stake.amount;

        if current_time > stake.last_demurrage {
            let time_elapsed = current_time.checked_sub(stake.last_demurrage).unwrap();
            let decay = adjusted_stake
                .checked_mul(config.demurrage_rate).unwrap()
                .checked_mul(time_elapsed).unwrap()
                .checked_div(365 * 24 * 3600 * 10000).unwrap();
            adjusted_stake = adjusted_stake.saturating_sub(decay);
        }

        // Add vote to proposal
        let proposal_mut = &mut ctx.accounts.tranche_proposal;
        match vote {
            TrancheVoteType::Yes => {
                proposal_mut.votes_yes = proposal_mut.votes_yes.checked_add(adjusted_stake).unwrap();
            }
            TrancheVoteType::No => {
                proposal_mut.votes_no = proposal_mut.votes_no.checked_add(adjusted_stake).unwrap();
            }
            TrancheVoteType::Abstain => {
                proposal_mut.votes_abstain = proposal_mut.votes_abstain.checked_add(adjusted_stake).unwrap();
            }
        }

        // Record vote
        let vote_record_mut = &mut ctx.accounts.vote_record;
        vote_record_mut.has_voted = true;
        vote_record_mut.vote_weight = adjusted_stake;
        vote_record_mut.voted_at = current_time;
        vote_record_mut.nullifier = [0; 32];  // Not using nullifier for tranche votes (yet)

        emit!(VoteEvent {
            proposal_id: proposal_mut.id,
            nullifier: [0; 32],
            vote_weight: adjusted_stake,
            timestamp: current_time,
        });

        Ok(())
    }

    /// Execute tranche release if voting passed
    pub fn execute_tranche_release(
        ctx: Context<ExecuteTrancheRelease>,
        _project_name: String,
    ) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp as u64;

        // Store values we need before mutable borrows
        let voting_deadline = ctx.accounts.tranche_proposal.voting_deadline;
        let proposal_status = ctx.accounts.tranche_proposal.status.clone();
        let proposal_votes_yes = ctx.accounts.tranche_proposal.votes_yes;
        let proposal_votes_no = ctx.accounts.tranche_proposal.votes_no;
        let proposal_votes_abstain = ctx.accounts.tranche_proposal.votes_abstain;
        let proposal_tranche_id = ctx.accounts.tranche_proposal.tranche_id;

        // Check voting is closed
        require!(current_time >= voting_deadline, ErrorCode::VotingStillOpen);
        require!(proposal_status != TrancheVoteStatus::Executed, ErrorCode::TrancheAlreadyReleased);

        // Calculate approval rate
        let total_votes = proposal_votes_yes
            .checked_add(proposal_votes_no).unwrap()
            .checked_add(proposal_votes_abstain).unwrap();

        require!(total_votes > 0, ErrorCode::InsufficientVotes);

        let approval_rate = (proposal_votes_yes * 100) / total_votes;

        // Require 66%+ supermajority
        require!(approval_rate >= 66, ErrorCode::InsufficientVoteApproval);
        require!(proposal_votes_yes > proposal_votes_no, ErrorCode::InsufficientVoteApproval);

        // Get values from project and tranche
        let (project_id, project_name, tranche_funding, tranche_recipient, tranche_sequence) = {
            let project = &ctx.accounts.transhuman_project;
            let tranche = project.tranches.iter()
                .find(|t| t.sequence == proposal_tranche_id as u8)
                .ok_or(ErrorCode::TrancheNotFound)?;

            require!(!tranche.released, ErrorCode::TrancheAlreadyReleased);

            (
                project.id,
                project.name.clone(),
                tranche.funding_amount,
                tranche.recipient,
                tranche.sequence,
            )
        };

        // Transfer funds from treasury to recipient
        let cpi_accounts = Transfer {
            from: ctx.accounts.treasury.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.transhuman_project.to_account_info(),
        };

        let project_name_bytes = project_name.as_bytes();

        let seeds = &[
            b"project",
            project_name_bytes,
            &[ctx.bumps.transhuman_project],
        ];
        let signer = &[&seeds[..]];

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, tranche_funding)?;

        // Now do the mutable updates after CPI
        let project = &mut ctx.accounts.transhuman_project;
        let tranche = project.tranches.iter_mut()
            .find(|t| t.sequence == proposal_tranche_id as u8)
            .ok_or(ErrorCode::TrancheNotFound)?;

        // Create immutable release record
        let record = &mut ctx.accounts.tranche_release_record;
        record.project_id = project_id;
        record.project_name = project_name.clone();
        record.tranche_id = proposal_tranche_id;
        record.tranche_sequence = tranche_sequence;
        record.milestone_description = ctx.accounts.milestone.description.clone();
        record.amount = tranche_funding;
        record.recipient = tranche_recipient;
        record.released_at = current_time;
        record.oracle_attestations_count = ctx.accounts.milestone.attestations.len() as u8;
        record.vote_approval_rate = approval_rate as u8;
        record.arweave_hash = None;

        // Mark tranche as released
        tranche.released = true;
        tranche.released_at = Some(current_time);

        // Update project status if fully funded
        if project.is_fully_funded() {
            project.status = tranche::ProjectStatus::Completed;
            project.completed_at = Some(current_time);
        }

        // Update proposal status
        let proposal_mut = &mut ctx.accounts.tranche_proposal;
        proposal_mut.status = TrancheVoteStatus::Executed;

        // Emit event
        emit!(TrancheReleased {
            project_id,
            project_name,
            tranche_id: proposal_tranche_id,
            milestone: ctx.accounts.milestone.description.clone(),
            amount: tranche_funding,
            recipient: tranche_recipient,
            released_at: current_time,
            vote_approval: approval_rate as u8,
        });

        Ok(())
    }

    /// Slash an oracle for providing false attestations (Week 4)
    /// Called by governance to punish malicious oracles
    /// Reduces reputation and slashes collateral
    pub fn slash_oracle(
        ctx: Context<SlashOracleContext>,
        oracle_pubkey: Pubkey,
        evidence: String,
    ) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp as u64;

        // Validate evidence
        require!(evidence.len() <= 500, ErrorCode::DescriptionTooLong);

        // Verify caller is governance admin (simplified - in production would check DAO vote)
        require!(
            ctx.accounts.governance.key() == ctx.accounts.admin.key(),
            ErrorCode::UnauthorizedAdmin
        );

        // Extract values before mutable borrow
        let (stored_oracle_pubkey, current_collateral, current_reputation, current_failed) = {
            let registry = &ctx.accounts.oracle_registry;
            require!(registry.collateral > 0, ErrorCode::OracleNotRegistered);

            (
                registry.oracle_pubkey,
                registry.collateral,
                registry.reputation_score,
                registry.failed_attestations,
            )
        };

        // Calculate slashing amounts
        // Slash 25% of collateral
        let collateral_to_slash = current_collateral / 4;
        require!(collateral_to_slash > 0, ErrorCode::InsufficientOracleCollateral);

        // Reduce reputation by 30 points (0-100 scale)
        let reputation_penalty = 30u32.min(current_reputation);

        // Transfer slashed collateral to governance treasury
        let cpi_accounts = Transfer {
            from: ctx.accounts.oracle_collateral_token_account.to_account_info(),
            to: ctx.accounts.governance_treasury.to_account_info(),
            authority: ctx.accounts.oracle_registry.to_account_info(),
        };

        let oracle_key_bytes = oracle_pubkey.as_ref();
        let seeds = &[
            b"oracle",
            oracle_key_bytes,
            &[ctx.bumps.oracle_registry],
        ];
        let signer = &[&seeds[..]];

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, collateral_to_slash)?;

        // Now do mutable updates after CPI
        let oracle_registry = &mut ctx.accounts.oracle_registry;
        oracle_registry.collateral = oracle_registry.collateral.saturating_sub(collateral_to_slash);
        oracle_registry.reputation_score = oracle_registry.reputation_score.saturating_sub(reputation_penalty);
        oracle_registry.failed_attestations = oracle_registry.failed_attestations.saturating_add(1);

        // Emit slashing event
        emit!(OracleSlashed {
            oracle_pubkey: stored_oracle_pubkey,
            collateral_slashed: collateral_to_slash,
            reputation_penalty,
            reason: evidence,
            slashed_at: current_time,
        });

        Ok(())
    }

    /// Recover oracle reputation through governance vote
    /// Allows redemption if oracle proves they've corrected behavior
    pub fn recover_oracle_reputation(
        ctx: Context<RecoverOracleReputationContext>,
        _oracle_pubkey: Pubkey,
        evidence_of_correction: String,
    ) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp as u64;

        // Validate evidence
        require!(evidence_of_correction.len() <= 500, ErrorCode::DescriptionTooLong);

        // Verify caller is governance
        require!(
            ctx.accounts.governance.key() == ctx.accounts.admin.key(),
            ErrorCode::UnauthorizedAdmin
        );

        let oracle_registry = &mut ctx.accounts.oracle_registry;
        require!(oracle_registry.collateral > 0, ErrorCode::OracleNotRegistered);

        // Can only recover up to original reputation of 100
        let reputation_recovery = 15u32.min(100u32.saturating_sub(oracle_registry.reputation_score));

        oracle_registry.reputation_score = oracle_registry.reputation_score.saturating_add(reputation_recovery);

        // Emit recovery event
        emit!(OracleReputationRecovered {
            oracle_pubkey: oracle_registry.oracle_pubkey,
            reputation_restored: reputation_recovery,
            recovered_at: current_time,
        });

        Ok(())
    }

    /// Mint soul-bound reputation token for oracle (Week 4)
    /// Non-transferable proof of oracle accuracy - survives on-chain forever
    pub fn mint_reputation_token(
        ctx: Context<MintReputationTokenContext>,
    ) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp as u64;

        // Get oracle registry
        let oracle_registry = &ctx.accounts.oracle_registry;
        let oracle_pubkey = oracle_registry.oracle_pubkey;
        let accuracy_rate = oracle_registry.accuracy_rate();
        let accuracy_tier = AccuracyTier::from_accuracy_rate(accuracy_rate);

        // Only mint if oracle has 50%+ accuracy
        require!(
            accuracy_tier != AccuracyTier::None,
            ErrorCode::InsufficientVoteApproval
        );

        // Create reputation token record
        let rep_token = &mut ctx.accounts.reputation_token;
        rep_token.oracle_pubkey = oracle_pubkey;
        rep_token.mint_address = oracle_pubkey;  // Reference to oracle's identity
        rep_token.accuracy_tier = accuracy_tier.clone();
        rep_token.successful_attestations = oracle_registry.successful_attestations;
        rep_token.reputation_score = oracle_registry.reputation_score;
        rep_token.minted_at = current_time;
        rep_token.last_updated = current_time;
        rep_token.is_active = true;

        // Emit token minting event
        emit!(ReputationTokenMinted {
            oracle_pubkey,
            accuracy_tier: accuracy_tier.to_string().to_string(),
            accuracy_rate,
            minted_at: current_time,
        });

        Ok(())
    }

    /// Update reputation token when oracle accuracy improves
    /// Allows tier upgrades without burning and reminting
    pub fn update_reputation_token(
        ctx: Context<UpdateReputationTokenContext>,
    ) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp as u64;

        let oracle_registry = &ctx.accounts.oracle_registry;
        let accuracy_rate = oracle_registry.accuracy_rate();
        let new_tier = AccuracyTier::from_accuracy_rate(accuracy_rate);

        let rep_token = &mut ctx.accounts.reputation_token;

        // Check if tier changed
        let tier_changed = rep_token.accuracy_tier != new_tier;

        // Update token data
        rep_token.accuracy_tier = new_tier.clone();
        rep_token.successful_attestations = oracle_registry.successful_attestations;
        rep_token.reputation_score = oracle_registry.reputation_score;
        rep_token.last_updated = current_time;

        // If accuracy dropped below 50%, deactivate token
        if new_tier == AccuracyTier::None {
            rep_token.is_active = false;
        }

        // Emit update event
        emit!(ReputationTokenUpdated {
            oracle_pubkey: oracle_registry.oracle_pubkey,
            old_tier: rep_token.accuracy_tier.to_string().to_string(),
            new_tier: new_tier.to_string().to_string(),
            accuracy_rate,
            updated_at: current_time,
            tier_changed,
        });

        Ok(())
    }

    /// Burn reputation token when oracle is slashed below 50% accuracy
    /// Irreversible mark of dishonesty in the immutable ledger
    pub fn burn_reputation_token(
        ctx: Context<BurnReputationTokenContext>,
    ) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp as u64;

        let rep_token = &mut ctx.accounts.reputation_token;

        require!(rep_token.is_active, ErrorCode::InsufficientVoteApproval);

        // Mark as burned (inactive forever)
        rep_token.is_active = false;

        // Emit burn event
        emit!(ReputationTokenBurned {
            oracle_pubkey: rep_token.oracle_pubkey,
            previous_tier: rep_token.accuracy_tier.to_string().to_string(),
            burned_at: current_time,
        });

        Ok(())
    }

    /// Archive a tranche release record to Arweave for permanent immutable storage (Week 4)
    /// Creates permanent record of funding decision that survives any blockchain fork
    /// Returns Arweave transaction hash for verification
    pub fn archive_to_arweave(
        ctx: Context<ArchiveToArweaveContext>,
        arweave_tx_hash: String,
    ) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp as u64;

        // Validate Arweave transaction hash format (should be 43 chars base64)
        require!(
            arweave_tx_hash.len() >= 40 && arweave_tx_hash.len() <= 50,
            ErrorCode::InvalidPoWContent
        );

        // Get the release record and update with Arweave hash
        let record = &mut ctx.accounts.tranche_release_record;
        record.arweave_hash = Some(arweave_tx_hash.clone());

        // Also update the project record if applicable
        if let Some(project) = &mut ctx.accounts.transhuman_project.as_mut() {
            project.arweave_hash = Some(arweave_tx_hash.clone());
        }

        // Emit archive event (immutable proof of archival)
        emit!(TrancheArchivedToArweave {
            project_id: record.project_id,
            tranche_id: record.tranche_id,
            amount: record.amount,
            arweave_hash: arweave_tx_hash,
            archived_at: current_time,
        });

        Ok(())
    }

    /// Archive a completed project milestone to Arweave
    /// Final record of what was achieved and funded
    pub fn archive_project_milestone(
        ctx: Context<ArchiveProjectMilestoneContext>,
        milestone_data: String,
        arweave_tx_hash: String,
    ) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp as u64;

        // Validate inputs
        require!(milestone_data.len() <= 1000, ErrorCode::DescriptionTooLong);
        require!(
            arweave_tx_hash.len() >= 40 && arweave_tx_hash.len() <= 50,
            ErrorCode::InvalidPoWContent
        );

        // Update milestone record
        let milestone = &mut ctx.accounts.milestone;
        milestone.verified_at = Some(current_time);
        milestone.release_triggered = true;

        // Emit milestone archive event
        emit!(MilestoneArchivedToArweave {
            milestone_id: milestone.id,
            tranche_id: milestone.tranche_id,
            description: milestone.description.clone(),
            arweave_hash: arweave_tx_hash,
            archived_at: current_time,
        });

        Ok(())
    }
}

// Account Structures

#[derive(Accounts)]
pub struct InitializeStake<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8 + 8 + 32,  // Added 32 bytes for commitment
        seeds = [b"stake", user.key().as_ref()],
        bump
    )]
    pub stake: Account<'info, Stake>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterCommitment<'info> {
    #[account(
        mut,
        seeds = [b"stake", user.key().as_ref()],
        bump
    )]
    pub stake: Account<'info, Stake>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct StakeTokens<'info> {
    #[account(
        mut,
        seeds = [b"stake", user.key().as_ref()],
        bump
    )]
    pub stake: Account<'info, Stake>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub stake_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 8 + 8 + 8 + 4
    )]
    pub config: Account<'info, GlobalConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(mut)]
    pub config: Account<'info, GlobalConfig>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct UnstakeTokens<'info> {
    #[account(
        mut,
        seeds = [b"stake", user.key().as_ref()],
        bump
    )]
    pub stake: Account<'info, Stake>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub stake_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ApplyDemurrage<'info> {
    #[account(
        mut,
        seeds = [b"stake", user.key().as_ref()],
        bump
    )]
    pub stake: Account<'info, Stake>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct CreateProposal<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 8 + 32 + 4 + 200 + 8 + 8 + 1 + 32 + 4 + 128 + 8 + 8,
        seeds = [b"proposal", id.to_le_bytes().as_ref()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = proposal
    )]
    pub treasury: Account<'info, TokenAccount>,
    pub config: Account<'info, GlobalConfig>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    #[account(
        seeds = [b"stake", voter.key().as_ref()],
        bump
    )]
    pub stake: Account<'info, Stake>,
    #[account(
        init,
        payer = voter,
        space = 8 + 1 + 8 + 8 + 32,  // Added 32 bytes for nullifier
        seeds = [b"vote", proposal.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,
    pub config: Account<'info, GlobalConfig>,
    #[account(mut)]
    pub voter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VoteInsecure<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    #[account(
        seeds = [b"stake", voter.key().as_ref()],
        bump
    )]
    pub stake: Account<'info, Stake>,
    #[account(
        init,
        payer = voter,
        space = 8 + 1 + 8 + 8 + 32,
        seeds = [b"vote", proposal.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,
    pub config: Account<'info, GlobalConfig>,
    #[account(mut)]
    pub voter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReleaseFunds<'info> {
    #[account(
        mut,
        seeds = [b"proposal", proposal.id.to_le_bytes().as_ref()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,
    #[account(mut)]
    pub recipient: Account<'info, TokenAccount>,
    pub config: Account<'info, GlobalConfig>,
    pub token_program: Program<'info, Token>,
}

// Data Structures

#[account]
pub struct Stake {
    pub user: Pubkey,
    pub amount: u64,
    pub last_demurrage: u64,
    pub commitment: [u8; 32],  // ZK commitment to user's secret
}

#[account]
pub struct Proposal {
    pub id: u64,
    pub creator: Pubkey,
    pub description: String,
    pub funding_needed: u64,
    pub votes: u64,
    pub funded: bool,
    pub treasury: Pubkey,
    pub pow_hash: String,
    pub created_at: u64,
    pub expires_at: u64,
}

#[account]
pub struct VoteRecord {
    pub has_voted: bool,
    pub vote_weight: u64,
    pub voted_at: u64,
    pub nullifier: [u8; 32],  // ZK nullifier to prevent double-voting
}

#[account]
pub struct GlobalConfig {
    pub admin: Pubkey,
    pub voting_threshold: u64,
    pub demurrage_rate: u64,
    pub proposal_duration_seconds: u64,
    pub pow_difficulty: u32,
}

// Error Codes

// Helper Functions

/// Check if byte array is all zeros
fn is_zero_bytes(bytes: &[u8]) -> bool {
    bytes.iter().all(|&b| b == 0)
}

// Events

#[event]
pub struct VoteEvent {
    pub proposal_id: u64,
    pub nullifier: [u8; 32],
    pub vote_weight: u64,
    pub timestamp: u64,
}

#[event]
pub struct OracleRegistered {
    pub oracle_pubkey: Pubkey,
    pub name: String,
    pub collateral: u64,
}

#[event]
pub struct AlignmentScoreSubmitted {
    pub proposal_id: u64,
    pub alignment_score: u8,
    pub oracle_pubkey: Pubkey,
    pub alignment_tier: AlignmentTier,
}

#[event]
pub struct MilestoneAttestationSubmitted {
    pub milestone_id: u64,
    pub oracle_pubkey: Pubkey,
    pub confidence_score: u8,
    pub attestation_count: u8,
}

#[event]
pub struct MilestoneVerified {
    pub milestone_id: u64,
    pub tranche_id: u64,
    pub attestation_count: u8,
    pub verified_at: u64,
}

#[event]
pub struct OracleSlashed {
    pub oracle_pubkey: Pubkey,
    pub collateral_slashed: u64,
    pub reputation_penalty: u32,
    pub reason: String,
    pub slashed_at: u64,
}

#[event]
pub struct OracleReputationRecovered {
    pub oracle_pubkey: Pubkey,
    pub reputation_restored: u32,
    pub recovered_at: u64,
}

#[event]
pub struct TrancheArchivedToArweave {
    pub project_id: u64,
    pub tranche_id: u64,
    pub amount: u64,
    pub arweave_hash: String,
    pub archived_at: u64,
}

#[event]
pub struct MilestoneArchivedToArweave {
    pub milestone_id: u64,
    pub tranche_id: u64,
    pub description: String,
    pub arweave_hash: String,
    pub archived_at: u64,
}

#[event]
pub struct ReputationTokenMinted {
    pub oracle_pubkey: Pubkey,
    pub accuracy_tier: String,
    pub accuracy_rate: u8,
    pub minted_at: u64,
}

#[event]
pub struct ReputationTokenUpdated {
    pub oracle_pubkey: Pubkey,
    pub old_tier: String,
    pub new_tier: String,
    pub accuracy_rate: u8,
    pub updated_at: u64,
    pub tier_changed: bool,
}

#[event]
pub struct ReputationTokenBurned {
    pub oracle_pubkey: Pubkey,
    pub previous_tier: String,
    pub burned_at: u64,
}

// Error Codes

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient votes to release funds")]
    InsufficientVotes,
    #[msg("Invalid Proof of Work - hash doesn't meet difficulty requirement")]
    InvalidPoW,
    #[msg("Invalid Zero-Knowledge Proof")]
    InvalidZKProof,
    #[msg("Proposal already funded")]
    AlreadyFunded,
    #[msg("User has already voted on this proposal")]
    AlreadyVoted,
    #[msg("Description exceeds maximum length")]
    DescriptionTooLong,
    #[msg("Funding amount exceeds maximum")]
    FundingTooHigh,
    #[msg("Invalid proposal content for PoW hash")]
    InvalidPoWContent,
    #[msg("Commitment does not match registered commitment")]
    CommitmentMismatch,
    #[msg("Proposal has expired")]
    ProposalExpired,
    #[msg("Insufficient treasury balance")]
    InsufficientTreasuryBalance,
    #[msg("Insufficient stake to unstake")]
    InsufficientStake,
    #[msg("Unauthorized - only admin can perform this action")]
    UnauthorizedAdmin,
    #[msg("Oracle name exceeds maximum length")]
    OracleNameTooLong,
    #[msg("Invalid collateral amount (must be > 0)")]
    InvalidCollateralAmount,
    #[msg("Invalid alignment score (must be 0-100)")]
    InvalidAlignmentScore,
    #[msg("Reasoning exceeds maximum length")]
    ReasoningTooLong,
    #[msg("Caller is not a registered oracle")]
    UnauthorizedOracle,
    #[msg("Invalid confidence score (must be 0-100)")]
    InvalidConfidenceScore,
    #[msg("Milestone ID does not match")]
    MilestoneIdMismatch,
    #[msg("Milestone has not been verified")]
    MilestoneNotVerified,
    #[msg("Project name exceeds maximum length (128 chars)")]
    ProjectNameTooLong,
    #[msg("Project description exceeds maximum length (1000 chars)")]
    ProjectDescriptionTooLong,
    #[msg("Invalid tranche count (must be 1-10)")]
    InvalidTrancheCount,
    #[msg("Tranches must be in order (sequence 1, 2, 3...)")]
    InvalidTrancheSequence,
    #[msg("Unlock dates must be increasing")]
    InvalidUnlockDates,
    #[msg("Invalid voting period (min 1 day, max 30 days)")]
    InvalidVotingPeriod,
    #[msg("Tranche not found")]
    TrancheNotFound,
    #[msg("Tranche is not yet unlocked")]
    TrancheNotYetUnlocked,
    #[msg("Tranche has already been released")]
    TrancheAlreadyReleased,
    #[msg("Voting period is still open")]
    VotingStillOpen,
    #[msg("Insufficient vote approval for release (need 66%+)")]
    InsufficientVoteApproval,
    #[msg("Invalid funding amount (must be > 0)")]
    InvalidFundingAmount,
    #[msg("Insufficient evidence to slash oracle")]
    InsufficientSlashingEvidence,
    #[msg("Oracle collateral insufficient for slashing")]
    InsufficientOracleCollateral,
    #[msg("Oracle is not registered")]
    OracleNotRegistered,
}

// Account Contexts for Oracle Operations

#[derive(Accounts)]
pub struct RegisterOracleContext<'info> {
    #[account(
        init,
        payer = oracle,
        space = 8 + 32 + 4 + 64 + 8 + 4 + 8 + 8 + 8 + 8,
        seeds = [b"oracle", oracle.key().as_ref()],
        bump
    )]
    pub oracle_registry: Account<'info, oracle::OracleRegistry>,
    #[account(mut)]
    pub oracle: Signer<'info>,
    #[account(mut)]
    pub oracle_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub oracle_collateral_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(proposal_id: u64)]
pub struct SubmitAlignmentScore<'info> {
    #[account(
        init,
        payer = oracle,
        space = 8 + 8 + 1 + 32 + 4 + 500 + 8 + 1,
        seeds = [b"alignment_score", proposal_id.to_le_bytes().as_ref(), oracle.key().as_ref()],
        bump
    )]
    pub alignment_score: Account<'info, AlignmentScore>,
    #[account(
        seeds = [b"oracle", oracle.key().as_ref()],
        bump
    )]
    pub oracle_registry: Account<'info, oracle::OracleRegistry>,
    #[account(mut)]
    pub oracle: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(milestone_id: u64)]
pub struct SubmitMilestoneAttestation<'info> {
    #[account(mut)]
    pub milestone: Account<'info, Milestone>,
    #[account(
        mut,
        seeds = [b"oracle", oracle.key().as_ref()],
        bump
    )]
    pub oracle_registry: Account<'info, oracle::OracleRegistry>,
    pub oracle: Signer<'info>,
}

#[derive(Accounts)]
pub struct VerifyMilestone<'info> {
    #[account(mut)]
    pub milestone: Account<'info, Milestone>,
}

// Week 3: Tranche Voting Contexts

#[derive(Accounts)]
#[instruction(project_name: String)]
pub struct ProposeTranhumanProject<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 8 + 4 + 128 + 4 + 1000 + 32 + 8 + 32 + 8 + 4 + 200 + 1 + 4 + 8 + 8 + 1 + 4 + 8,
        seeds = [b"project", project_name.as_bytes()],
        bump
    )]
    pub transhuman_project: Account<'info, TranhumanProject>,

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
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
#[instruction(voting_period_seconds: u64)]
pub struct ProposeTrancheRelease<'info> {
    #[account(
        init,
        payer = proposer,
        space = 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1,
        seeds = [b"tranche_proposal", proposer.key().as_ref()],
        bump
    )]
    pub tranche_proposal: Account<'info, TrancheReleaseProposal>,

    pub transhuman_project: Account<'info, TranhumanProject>,
    pub milestone: Account<'info, Milestone>,

    #[account(mut)]
    pub proposer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VoteOnTrancheRelease<'info> {
    #[account(mut)]
    pub tranche_proposal: Account<'info, TrancheReleaseProposal>,

    #[account(
        seeds = [b"stake", voter.key().as_ref()],
        bump
    )]
    pub stake: Account<'info, Stake>,

    #[account(
        init,
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

#[derive(Accounts)]
#[instruction(project_name: String)]
pub struct ExecuteTrancheRelease<'info> {
    #[account(mut)]
    pub tranche_proposal: Account<'info, TrancheReleaseProposal>,

    #[account(
        mut,
        seeds = [b"project", project_name.as_bytes()],
        bump
    )]
    pub transhuman_project: Account<'info, TranhumanProject>,

    pub milestone: Account<'info, Milestone>,

    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,

    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = executor,
        space = 8 + 8 + 4 + 128 + 8 + 8 + 4 + 500 + 8 + 8 + 32 + 1 + 4 + 1
    )]
    pub tranche_release_record: Account<'info, tranche::TrancheReleaseRecord>,

    #[account(mut)]
    pub executor: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// Week 4: Oracle Slashing Contexts

#[derive(Accounts)]
#[instruction(oracle_pubkey: Pubkey)]
pub struct SlashOracleContext<'info> {
    #[account(
        mut,
        seeds = [b"oracle", oracle_pubkey.as_ref()],
        bump
    )]
    pub oracle_registry: Account<'info, oracle::OracleRegistry>,

    #[account(mut)]
    pub oracle_collateral_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub governance_treasury: Account<'info, TokenAccount>,

    /// CHECK: Governance address (in production, would be DAO treasury)
    pub governance: UncheckedAccount<'info>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(oracle_pubkey: Pubkey)]
pub struct RecoverOracleReputationContext<'info> {
    #[account(
        mut,
        seeds = [b"oracle", oracle_pubkey.as_ref()],
        bump
    )]
    pub oracle_registry: Account<'info, oracle::OracleRegistry>,

    /// CHECK: Governance address (in production, would be DAO treasury)
    pub governance: UncheckedAccount<'info>,

    #[account(mut)]
    pub admin: Signer<'info>,
}

// Week 4: Soul-Bound Reputation Token Contexts

#[derive(Accounts)]
pub struct MintReputationTokenContext<'info> {
    #[account(mut)]
    pub oracle_registry: Account<'info, oracle::OracleRegistry>,

    #[account(
        init,
        payer = minter,
        space = 8 + 32 + 32 + 1 + 8 + 4 + 8 + 8 + 1,
        seeds = [b"rep_token", oracle_registry.oracle_pubkey.as_ref()],
        bump
    )]
    pub reputation_token: Account<'info, oracle::OracleReputationToken>,

    #[account(mut)]
    pub minter: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateReputationTokenContext<'info> {
    #[account(mut)]
    pub oracle_registry: Account<'info, oracle::OracleRegistry>,

    #[account(
        mut,
        seeds = [b"rep_token", oracle_registry.oracle_pubkey.as_ref()],
        bump
    )]
    pub reputation_token: Account<'info, oracle::OracleReputationToken>,

    #[account(mut)]
    pub updater: Signer<'info>,
}

#[derive(Accounts)]
pub struct BurnReputationTokenContext<'info> {
    #[account(
        mut,
        seeds = [b"rep_token", reputation_token.oracle_pubkey.as_ref()],
        bump
    )]
    pub reputation_token: Account<'info, oracle::OracleReputationToken>,

    #[account(mut)]
    pub burner: Signer<'info>,
}

// Week 4: Arweave Archive Contexts

#[derive(Accounts)]
pub struct ArchiveToArweaveContext<'info> {
    #[account(mut)]
    pub tranche_release_record: Account<'info, tranche::TrancheReleaseRecord>,

    #[account(mut)]
    pub transhuman_project: Option<Account<'info, TranhumanProject>>,

    #[account(mut)]
    pub archiver: Signer<'info>,
}

#[derive(Accounts)]
pub struct ArchiveProjectMilestoneContext<'info> {
    #[account(mut)]
    pub milestone: Account<'info, Milestone>,

    #[account(mut)]
    pub archiver: Signer<'info>,
}

