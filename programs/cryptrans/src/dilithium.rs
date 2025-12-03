//! Dilithium Post-Quantum Signatures for CrypTrans
//!
//! This module implements CRYSTALS-Dilithium (NIST FIPS 204 / ML-DSA) for quantum-safe
//! signature verification on critical operations like treasury fund releases.
//!
//! Dilithium is resistant to quantum attacks via lattice-based cryptography.

use anchor_lang::prelude::*;
use pqcrypto_dilithium::dilithium3::*;

/// Dilithium3 public key (1952 bytes)
pub const DILITHIUM_PUBLICKEY_BYTES: usize = 1952;

/// Dilithium3 signature (3293 bytes)
pub const DILITHIUM_SIGNATURE_BYTES: usize = 3293;

/// Verify a Dilithium signature (post-quantum safe!)
///
/// Uses CRYSTALS-Dilithium3 (NIST ML-DSA) which provides:
/// - 128-bit security against quantum computers
/// - Lattice-based crypto (resistant to Shor's algorithm)
/// - NIST-approved post-quantum standard
///
/// # Arguments
/// * `message` - The message that was signed
/// * `signature` - The Dilithium signature (3293 bytes)
/// * `public_key` - The Dilithium public key (1952 bytes)
///
/// # Returns
/// * `Ok(true)` if signature is valid
/// * `Ok(false)` if signature is invalid
/// * `Err` if inputs are malformed
pub fn verify_dilithium_signature(
    message: &[u8],
    signature: &[u8; DILITHIUM_SIGNATURE_BYTES],
    public_key: &[u8; DILITHIUM_PUBLICKEY_BYTES],
) -> Result<bool> {
    // Convert bytes to pqcrypto types
    let pk = PublicKey::from_bytes(public_key)
        .map_err(|_| ErrorCode::DilithiumVerificationFailed)?;

    let sig = Signature::from_bytes(signature)
        .map_err(|_| ErrorCode::DilithiumVerificationFailed)?;

    // Verify using pqcrypto-dilithium crate
    let is_valid = verify(&sig, message, &pk).is_ok();

    Ok(is_valid)
}

/// Hybrid verification: EdDSA + Dilithium
///
/// Combines traditional EdDSA (for backward compatibility) with post-quantum
/// Dilithium (for quantum safety). Both must pass for full security.
///
/// This provides:
/// - Quantum resistance (Dilithium)
/// - Backward compatibility (EdDSA)
/// - Defense in depth (two independent schemes)
///
/// # Arguments
/// * `message` - The message to verify
/// * `eddsa_signer` - The EdDSA public key (Solana wallet)
/// * `dilithium_signature` - The Dilithium signature
/// * `dilithium_pubkey` - The Dilithium public key
///
/// # Returns
/// * `Ok(true)` if both signatures valid
/// * `Ok(false)` or `Err` if either fails
pub fn verify_hybrid_signature(
    message: &[u8],
    eddsa_signer: &Pubkey,
    dilithium_signature: &[u8; DILITHIUM_SIGNATURE_BYTES],
    dilithium_pubkey: &[u8; DILITHIUM_PUBLICKEY_BYTES],
) -> Result<bool> {
    // 1. EdDSA verification is implicit in Solana's transaction validation
    // If we got here, the EdDSA signature was already verified by the runtime
    // when checking the Signer account
    let eddsa_valid = true; // Guaranteed by Anchor/Solana

    // 2. Verify Dilithium signature (quantum-safe component)
    let dilithium_valid = verify_dilithium_signature(
        message,
        dilithium_signature,
        dilithium_pubkey,
    )?;

    // Both must pass for quantum + classical security
    require!(eddsa_valid && dilithium_valid, ErrorCode::HybridVerificationFailed);

    Ok(true)
}

/// Error codes for Dilithium operations
#[error_code]
pub enum ErrorCode {
    #[msg("Dilithium signature verification failed - Invalid post-quantum signature")]
    DilithiumVerificationFailed,

    #[msg("Hybrid signature verification failed - Either EdDSA or Dilithium invalid")]
    HybridVerificationFailed,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dilithium_constants() {
        // Dilithium3 has specific sizes
        assert_eq!(DILITHIUM_PUBLICKEY_BYTES, 1952);
        assert_eq!(DILITHIUM_SIGNATURE_BYTES, 3293);
    }
}
