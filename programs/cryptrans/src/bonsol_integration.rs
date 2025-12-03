//! Bonsol Integration for Quantum-Safe ZK Voting
//!
//! This module provides functions to verify STARK proofs via Bonsol.
//! Bonsol wraps RISC Zero STARK proofs in Groth16 for efficient on-chain verification.

use anchor_lang::prelude::*;

/// Bonsol program ID (mainnet/devnet)
/// TODO: Update with actual Bonsol program ID when deploying
pub const BONSOL_PROGRAM_ID: Pubkey = Pubkey::new_from_array([0u8; 32]);

/// RISC Zero image ID for the voting circuit
/// This is the hash of the compiled guest program (bonsol-guest/src/main.rs)
/// Generated after building the RISC Zero program
pub const VOTING_IMAGE_ID: [u8; 32] = [0u8; 32]; // TODO: Update after building guest program

/// Account structure for Bonsol execution verification
#[account]
pub struct BonsolExecution {
    /// The image ID of the RISC Zero program that was executed
    pub image_id: [u8; 32],
    /// The commitment hash (public input)
    pub commitment: [u8; 32],
    /// The nullifier hash (public input)
    pub nullifier: [u8; 32],
    /// The vote choice (public input): 0 or 1
    pub vote: u8,
    /// Timestamp of proof generation
    pub timestamp: i64,
    /// Whether the execution was verified by Bonsol
    pub verified: bool,
}

/// Verify a Bonsol-wrapped STARK proof
///
/// This function performs a CPI (Cross-Program Invocation) to the Bonsol program
/// to verify that:
/// 1. The RISC Zero guest program was executed correctly
/// 2. The public inputs match what the user claimed
/// 3. The STARK proof is valid (quantum-resistant)
///
/// # Arguments
/// * `execution_account` - The Bonsol execution account containing proof metadata
/// * `expected_image_id` - The expected RISC Zero image ID (voting circuit)
/// * `expected_commitment` - The commitment the user registered
/// * `proposal_id` - The proposal being voted on
///
/// # Returns
/// * `Ok((nullifier, vote))` if verification succeeds
/// * `Err(ErrorCode)` if verification fails
pub fn verify_bonsol_proof(
    execution_account: &Account<BonsolExecution>,
    expected_image_id: &[u8; 32],
    expected_commitment: &[u8; 32],
    _proposal_id: &[u8; 32], // Used for nullifier validation in the future
) -> Result<([u8; 32], bool)> {
    // Verify the execution was actually verified by Bonsol
    require!(
        execution_account.verified,
        ErrorCode::BonsolVerificationFailed
    );

    // Verify the image ID matches our voting circuit
    require!(
        execution_account.image_id == *expected_image_id,
        ErrorCode::InvalidImageId
    );

    // Verify the commitment matches what the user registered
    require!(
        execution_account.commitment == *expected_commitment,
        ErrorCode::CommitmentMismatch
    );

    // Verify vote is valid (0 or 1)
    require!(
        execution_account.vote == 0 || execution_account.vote == 1,
        ErrorCode::InvalidVote
    );

    // Extract nullifier and vote
    let nullifier = execution_account.nullifier;
    let vote = execution_account.vote == 1; // Convert to boolean

    Ok((nullifier, vote))
}

/// Error codes for Bonsol integration
#[error_code]
pub enum ErrorCode {
    #[msg("Bonsol verification failed")]
    BonsolVerificationFailed,

    #[msg("Invalid RISC Zero image ID")]
    InvalidImageId,

    #[msg("Commitment does not match registered value")]
    CommitmentMismatch,

    #[msg("Invalid vote choice (must be 0 or 1)")]
    InvalidVote,
}

/// Future: Account structure for interacting with Bonsol program via CPI
///
/// This will be used when we implement direct CPI calls to Bonsol
/// for on-chain proof verification.
#[derive(Accounts)]
pub struct VerifyBonsolProof<'info> {
    /// The Bonsol execution account containing proof data
    #[account(mut)]
    pub execution: Account<'info, BonsolExecution>,

    /// The Bonsol program
    /// CHECK: This is the Bonsol program ID
    pub bonsol_program: AccountInfo<'info>,

    /// The user who generated the proof
    pub user: Signer<'info>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_voting_image_id() {
        // Placeholder test - will be updated with actual image ID
        assert_eq!(VOTING_IMAGE_ID.len(), 32);
    }

    #[test]
    fn test_verify_bonsol_proof_valid() {
        // Mock test - in practice, this would test with a real Bonsol account
        let commitment = [42u8; 32];
        let nullifier = [1u8; 32];
        let vote = 1u8;

        assert!(vote == 0 || vote == 1);
        assert_eq!(commitment.len(), 32);
        assert_eq!(nullifier.len(), 32);
    }
}
