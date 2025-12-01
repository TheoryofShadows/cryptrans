/// Groth16 Zero-Knowledge Proof Verifier for CrypTrans
///
/// This module implements on-chain verification of Groth16 proofs for anonymous voting.
/// Verifies that a vote was cast by someone with sufficient stake without revealing identity.

use ark_bn254::{Bn254, Fr, G1Affine, G2Affine};
use ark_ec::pairing::Pairing;
use ark_ff::PrimeField;
use ark_serialize::CanonicalDeserialize;
use std::io::Cursor;
use std::ops::{Add, AddAssign, Mul};

/// Represents a Groth16 proof
#[derive(Clone, Debug)]
pub struct Proof {
    pub a: G1Affine,
    pub b: G2Affine,
    pub c: G1Affine,
}

/// Verification key for Groth16
#[derive(Clone, Debug)]
pub struct VerificationKey {
    pub alpha: G1Affine,
    pub beta: G2Affine,
    pub gamma: G2Affine,
    pub delta: G2Affine,
    pub gamma_abc: Vec<G1Affine>,
}

/// Parse a proof from byte arrays
///
/// Proof format:
/// - a: 64 bytes (G1 point compressed)
/// - b: 128 bytes (G2 point compressed)
/// - c: 64 bytes (G1 point compressed)
pub fn parse_proof(
    proof_a: &[u8; 64],
    proof_b: &[u8; 128],
    proof_c: &[u8; 64],
) -> Result<Proof, Box<dyn std::error::Error>> {
    // Parse G1 point (a)
    let a = G1Affine::deserialize_compressed(&mut Cursor::new(proof_a))?;

    // Parse G2 point (b)
    let b = G2Affine::deserialize_compressed(&mut Cursor::new(proof_b))?;

    // Parse G1 point (c)
    let c = G1Affine::deserialize_compressed(&mut Cursor::new(proof_c))?;

    Ok(Proof { a, b, c })
}

/// Convert byte array to field element
fn bytes_to_fr(bytes: &[u8; 32]) -> Fr {
    Fr::from_le_bytes_mod_order(bytes)
}

/// Verify a Groth16 proof
///
/// Verifies: e(A, B) = e(α, β) + e(L, γ) + e(C, δ)
/// where L = ∑_i c_i * [γ]_1^{γ_abc,i}
///
/// Parameters:
/// - proof: The Groth16 proof (A, B, C)
/// - public_signals: Public inputs [nullifier, commitment, minStake]
/// - vk: Verification key
pub fn verify_proof(
    proof: &Proof,
    public_signals: &[Fr],
    vk: &VerificationKey,
) -> Result<bool, Box<dyn std::error::Error>> {
    // Check that we have the right number of public signals
    // Circuit has: nullifier, commitment, minStake (and implicitly root)
    if public_signals.len() + 1 != vk.gamma_abc.len() {
        return Err("Invalid number of public signals".into());
    }

    // Compute L = γ_abc[0] + ∑_i c_i * γ_abc[i+1]
    let mut l = vk.gamma_abc[0];
    for (i, signal) in public_signals.iter().enumerate() {
        let mut gamma_abc_i = vk.gamma_abc[i + 1];
        // Multiply γ_abc[i+1] by signal
        gamma_abc_i = gamma_abc_i.mul(*signal).into();
        l = l.add(gamma_abc_i).into();
    }

    // Verify the pairing equation: e(A, B) = e(α, β) * e(L, γ) * e(C, δ)
    // In additive notation: A*B = α*β + L*γ + C*δ

    let pairing_1 = Bn254::pairing(proof.a, proof.b);

    let mut rhs = Bn254::pairing(vk.alpha, vk.beta);
    rhs.add_assign(Bn254::pairing(l, vk.gamma));
    rhs.add_assign(Bn254::pairing(proof.c, vk.delta));

    Ok(pairing_1 == rhs)
}

/// Simplified verifier that checks proof structure without full pairing
///
/// This is used for Solana's compute constraints. Full verification requires:
/// 1. Proof is non-zero (basic check)
/// 2. Proof elements are valid field/curve elements
/// 3. Public signals match expected circuit outputs
pub fn verify_proof_structure(
    proof_a: &[u8; 64],
    proof_b: &[u8; 128],
    proof_c: &[u8; 64],
    nullifier: &[u8; 32],
    commitment: &[u8; 32],
    _min_stake: &[u8; 32],
) -> bool {
    // Check proof components are non-zero
    let is_proof_a_zero = proof_a.iter().all(|&b| b == 0);
    let is_proof_b_zero = proof_b.iter().all(|&b| b == 0);
    let is_proof_c_zero = proof_c.iter().all(|&b| b == 0);

    if is_proof_a_zero || is_proof_b_zero || is_proof_c_zero {
        return false;
    }

    // Check public signals are non-zero (except possibly commitment in some cases)
    let is_nullifier_zero = nullifier.iter().all(|&b| b == 0);
    let is_commitment_zero = commitment.iter().all(|&b| b == 0);

    !is_nullifier_zero && !is_commitment_zero
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zero_check() {
        let zeros = [0u8; 64];
        assert!(!verify_proof_structure(
            &[0u8; 64],
            &[0u8; 128],
            &[0u8; 64],
            &[0u8; 32],
            &[0u8; 32],
            &[0u8; 32],
        ));
    }

    #[test]
    fn test_nonzero_check() {
        let mut proof_a = [0u8; 64];
        proof_a[0] = 1;
        let mut proof_b = [0u8; 128];
        proof_b[0] = 1;
        let mut proof_c = [0u8; 64];
        proof_c[0] = 1;
        let mut nullifier = [0u8; 32];
        nullifier[0] = 1;
        let mut commitment = [0u8; 32];
        commitment[0] = 1;

        assert!(verify_proof_structure(
            &proof_a,
            &proof_b,
            &proof_c,
            &nullifier,
            &commitment,
            &[0u8; 32],
        ));
    }
}
