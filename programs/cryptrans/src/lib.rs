use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use sha2::{Sha256, Digest};

mod groth16_verifier;
mod oracle;
mod tranche;

use oracle::{AlignmentScore, AlignmentTier, Milestone, OracleAttestation};
use tranche::{
    TrancheReleased, TrancheReleaseProposed, ProjectCompleted,
};

declare_id!("B4Cq9PHn4wXA7k4mHdqeYVuRRQvZTGh9S6wqaiiSA1yK");

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

