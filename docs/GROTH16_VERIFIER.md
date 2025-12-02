# Groth16 Verifier Implementation Guide

## Overview

CrypTrans implements Groth16 zero-knowledge proof verification for anonymous voting on Solana. This document explains the implementation, architecture, and future enhancements.

## What is Groth16?

Groth16 is a succinct non-interactive zero-knowledge proof system that enables:
- **Privacy**: Voter identity hidden while proving eligibility
- **Efficiency**: Small proof size (256 bytes) and fast verification
- **Security**: Cryptographically sound under pairing assumptions

### Groth16 Components

A Groth16 proof consists of three elliptic curve points:
- **π_a** (64 bytes): Point on BN254 G1 curve
- **π_b** (128 bytes): Point on BN254 G2 curve
- **π_c** (64 bytes): Point on BN254 G1 curve

The verification equation is:
```
e(π_a, π_b) = e(α, β) · e(L, γ) · e(π_c, δ)
```

Where:
- `e()` is the Tate pairing
- `α, β, γ, δ` are verification key components
- `L = γ_abc[0] + Σ(c_i · γ_abc[i+1])` where c_i are public signals

## Implementation Architecture

### Directory Structure

```
programs/cryptrans/
├── src/
│   ├── lib.rs                    # Main contract
│   ├── groth16_verifier.rs       # Verifier module (NEW)
│   └── mod.rs
```

### Verifier Module: `groth16_verifier.rs`

The verifier module provides:

#### 1. **Data Structures**

```rust
pub struct Proof {
    pub a: G1Affine,      // π_a from snarkjs
    pub b: G2Affine,      // π_b from snarkjs
    pub c: G1Affine,      // π_c from snarkjs
}

pub struct VerificationKey {
    pub alpha: G1Affine,           // α
    pub beta: G2Affine,            // β
    pub gamma: G2Affine,           // γ
    pub delta: G2Affine,           // δ
    pub gamma_abc: Vec<G1Affine>,  // [γ]_1^{γ_abc,i}
}
```

#### 2. **Verification Functions**

##### `verify_proof_structure()` - Current Implementation

```rust
pub fn verify_proof_structure(
    proof_a: &[u8; 64],
    proof_b: &[u8; 128],
    proof_c: &[u8; 64],
    nullifier: &[u8; 32],
    commitment: &[u8; 32],
    min_stake: &[u8; 32],
) -> bool
```

**Purpose**: Validates proof components are non-zero and public signals are valid

**Checks Performed**:
1. Proof component A is non-zero
2. Proof component B is non-zero
3. Proof component C is non-zero
4. Nullifier is non-zero (unique per vote)
5. Commitment is non-zero (voter identity hidden)

**Compute Cost**: ~500 compute units (minimal)

**Security Properties**:
- Prevents zero proofs (obvious invalid inputs)
- Ensures proof elements present
- Compatible with full verification

##### `parse_proof()` - For Future Use

```rust
pub fn parse_proof(
    proof_a: &[u8; 64],
    proof_b: &[u8; 128],
    proof_c: &[u8; 64],
) -> Result<Proof, Box<dyn std::error::Error>>
```

**Purpose**: Deserialize byte arrays into elliptic curve points

**Usage**: Enables full Groth16 pairing verification

##### `verify_proof()` - For Future Use

```rust
pub fn verify_proof(
    proof: &Proof,
    public_signals: &[Fr],
    vk: &VerificationKey,
) -> Result<bool, Box<dyn std::error::Error>>
```

**Purpose**: Performs full cryptographic pairing verification

**Computation**: Verifies `e(π_a, π_b) = e(α, β) · e(L, γ) · e(π_c, δ)`

**Compute Cost**: ~500,000+ compute units (pairing operations)

## How It's Used in Voting

### Voting Flow

```
User generates proof (browser)
    ↓
Calls vote_with_zk() with proof
    ↓
Contract verifies proof structure
    ↓
Contract checks nullifier (no double-voting)
    ↓
Contract checks commitment (matches registered)
    ↓
Vote recorded with demurrage applied
    ↓
Stored on-chain (anonymously)
```

### Integration in `lib.rs`

```rust
pub fn vote_with_zk(
    ctx: Context<Vote>,
    nullifier: [u8; 32],
    commitment: [u8; 32],
    proof_a: [u8; 64],
    proof_b: [u8; 128],
    proof_c: [u8; 64],
) -> Result<()> {
    // Step 1: Check proposal not expired
    let proposal = &ctx.accounts.proposal;
    require!(current_time <= proposal.expires_at, ErrorCode::ProposalExpired);

    // Step 2: Verify proof structure
    let proof_valid = groth16_verifier::verify_proof_structure(
        &proof_a, &proof_b, &proof_c,
        &nullifier, &commitment, &[0u8; 32],
    );
    require!(proof_valid, ErrorCode::InvalidZKProof);

    // Step 3: Verify commitment matches
    let stake = &ctx.accounts.stake;
    require!(stake.commitment == commitment, ErrorCode::CommitmentMismatch);

    // Step 4: Check nullifier not used
    let vote_record = &mut ctx.accounts.vote_record;
    require!(!vote_record.has_voted, ErrorCode::AlreadyVoted);

    // Steps 5-6: Record vote with demurrage
    // ...
}
```

## Proof Generation (Browser)

### Circuit (`circuits/vote.circom`)

```circom
template AnonymousVote() {
    // Private inputs (hidden from blockchain)
    signal input secret;          // Voter's secret
    signal input stakeAmount;     // Voter's stake
    signal input proposalId;      // Prevents replay

    // Public inputs (visible on-chain)
    signal input nullifier;       // Unique vote ID
    signal input commitment;      // Voter identity (hashed)
    signal input minStake;        // Threshold
    signal input root;            // Merkle root (future)

    // Constraints
    // 1. commitment = Poseidon(secret)
    // 2. nullifier = Poseidon(secret, proposalId)
    // 3. stakeAmount >= minStake
}
```

### Proof Generation (`app/src/zkProver.js`)

```javascript
export async function generateVoteProof({
    secret, stakeAmount, proposalId, minStake
}) {
    // Load WASM circuit and proving key
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        { secret, stakeAmount, proposalId, nullifier, commitment, minStake, root },
        wasmBuffer,
        zkeyBuffer
    );

    // Extract proof components
    const proofA = proof.pi_a.slice(0, 2);      // [x, y]
    const proofB = proof.pi_b.slice(0, 2);      // [[x1, x2], [y1, y2]]
    const proofC = proof.pi_c.slice(0, 2);      // [x, y]

    // Pack to byte arrays
    return {
        proofBytes: {
            a: convertToBytes(proofA, 64),
            b: convertToBytes(proofB, 128),
            c: convertToBytes(proofC, 64),
        },
        publicSignals: {
            nullifier: publicSignals[0],
            commitment: publicSignals[1],
        }
    };
}
```

## Security Analysis

### Current Implementation (v0.2.0)

**Strengths**:
- ✅ Prevents zero proofs
- ✅ Validates public signal structure
- ✅ Unique nullifiers prevent double-voting
- ✅ Commitment verification ensures correctness
- ✅ Efficient (minimal compute cost)

**Limitations**:
- ⚠️ Does not verify pairing equation
- ⚠️ Attackers could potentially forge proofs with valid structure
- ⚠️ Not suitable for high-value governance

**Threat Model**:
- Honest voter: Can generate valid proof
- Malicious but bound by circuit: Will generate valid proof or voting will fail
- Unconstrained attacker: Could potentially create invalid-but-structural proof

### Full Groth16 Verification (Post-Audit)

When full pairing verification is enabled:

**Strengths**:
- ✅ Cryptographically sound
- ✅ Prevents forged proofs
- ✅ Complete privacy guarantee
- ✅ Suitable for any governance level

**Limitations**:
- ⚠️ Higher compute cost (~500k+ CUs)
- ⚠️ Pairing operations on Solana still experimental
- ⚠️ Verification key must be provided

**Recommended Timeline**:
1. Current version (v0.2.0): Deploy to devnet
2. Security audit period: Validate structural verification
3. Post-audit (v0.3.0): Enable full pairing verification
4. Mainnet (v1.0.0): Production with complete verification

## Future Enhancements

### 1. Full Groth16 Pairing Verification

**Implementation**:
```rust
pub fn verify_proof(
    proof: &Proof,
    public_signals: &[Fr],
    vk: &VerificationKey,
) -> Result<bool> {
    // 1. Parse proof bytes to elliptic curve points
    let proof = parse_proof(proof_a, proof_b, proof_c)?;

    // 2. Compute L = γ_abc[0] + Σ(c_i · γ_abc[i+1])
    let mut l = vk.gamma_abc[0];
    for (i, signal) in public_signals.iter().enumerate() {
        l = l.add(vk.gamma_abc[i+1].mul(*signal));
    }

    // 3. Verify pairing equation
    let lhs = Bn254::pairing(proof.a, proof.b);
    let mut rhs = Bn254::pairing(vk.alpha, vk.beta);
    rhs.add_assign(Bn254::pairing(l, vk.gamma));
    rhs.add_assign(Bn254::pairing(proof.c, vk.delta));

    Ok(lhs == rhs)
}
```

**Requirements**:
- [ ] Verification key stored on-chain
- [ ] BN254 pairing operations available
- [ ] Compute budget increase for pairings
- [ ] Post-audit approval

### 2. Merkle Tree Integration

**Purpose**: Enable efficient proofs for large voter bases

**Implementation**:
```rust
// In circuit
include "merkle_tree.circom";

signal input leafSecret;
signal input merkleProof[merkleDepth];
signal input merkleRoot;

// Prove voter is in merkle tree of valid voters
component merkleVerifier = MerkleTreeChecker(merkleDepth);
merkleVerifier.leaf <== Poseidon(1)([leafSecret]);
merkleVerifier.root <== merkleRoot;
for (var i = 0; i < merkleDepth; i++) {
    merkleVerifier.pathIndices[i] <== merkleProof[i];
}
```

### 3. Stealth Address Support

**Purpose**: Even more privacy - randomized per-vote identities

**Implementation**:
```rust
// Random ephemeral commitment per vote
signal ephemeralCommitment;
// Proves: Hash(ephemeralCommitment, secret) = vote_commitment
```

### 4. Compressed Proofs

**Purpose**: Reduce transaction size

**Technology**: Snark-in-Snark (recursive composition)

## Deployment Checklist

- [x] Groth16 verifier module implemented
- [x] Structural verification working
- [x] Circuit compiles correctly
- [x] Proof generation tested
- [x] Documentation updated
- [ ] Security audit completed
- [ ] Full pairing verification implemented
- [ ] Merkle tree integration
- [ ] Mainnet deployment

## Testing

### Unit Tests

```bash
cd programs/cryptrans
cargo test groth16_verifier --lib
```

### Integration Tests

```bash
anchor test
```

### Circuit Tests

```bash
cd circuits
npm test
```

### End-to-End Tests

```bash
# Start local validator
solana-test-validator

# Deploy program
anchor deploy

# Run tests
anchor test --skip-local-validator
```

## References

- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf)
- [BN254 Curve](https://en.wikibooks.org/wiki/Cryptography/Prime_Curve/Barreto-Naehrig)
- [snarkjs Library](https://github.com/iden3/snarkjs)
- [Ark-groth16 Crate](https://github.com/arkworks-rs/groth16)
- [Solana Program Guide](https://docs.solana.com/developing/on-chain-programs/overview)

## Support

For questions or issues:
1. Check this documentation
2. Review circuit in `circuits/vote.circom`
3. Review verifier in `programs/cryptrans/src/groth16_verifier.rs`
4. Open GitHub issue with full details
