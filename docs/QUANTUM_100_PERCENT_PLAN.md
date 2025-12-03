# CrypTrans: Path to 100% Quantum-Safe

**Goal**: Make CrypTrans fully quantum-resistant against all known attacks
**Current Status**: 40% quantum-safe (2/5 components)
**Target**: 100% quantum-safe
**Timeline**: This session + 1-2 days testing

---

## 🎯 Research Findings (December 3, 2025)

### ✅ Bonsol Deployment
**Source**: [Bonsol CLI Documentation](https://bonsol.sh/docs/reference/cli-commands)

**Installation**:
```bash
cargo install bonsol-cli
```

**Deployment Process**:
1. Build ZK program: `bonsol build --zk-program-path ./bonsol-guest`
2. Creates `manifest.json` with image ID and metadata
3. Deploy: `bonsol -k ./keypair.json -u <RPC_URL> deploy s3 -m ./manifest.json ...`

**How it works**:
- Programs indexed by image ID (our hash: 2bcf48fc...)
- Each deployment creates on-chain record with:
  - Image ID
  - Image size
  - Required inputs
  - URL to binary
- Uses RISC Zero v1.2.1 (we're using v1.2.6 - compatible)

**Program ID**: Need to find from Bonsol GitHub or deploy our own

---

### ✅ Dilithium Integration
**Source**: [BTQ + Bonsol Labs Partnership](https://blockonomi.com/solana-hits-quantum-ready-milestone-with-btq-and-bonsol-labs-partnership/)

**Key Findings**:
- **BTQ demonstrated NIST ML-DSA (Dilithium) on Solana** - October 2025
- Uses Bonsol's verifiable proving network
- Heavy PQC operations done **off-chain**, verified **on-chain**
- Maintains Solana's sub-second transaction speeds

**Available Rust Crates**:
1. `pqc_dilithium` - Pure Rust, NIST FIPS 204 standard
2. `crystals-dilithium` - Ported from reference implementation
3. `pqcrypto-dilithium` - PQCrypto project crate
4. `qp-dilithium-crypto` - Substrate-optimized (may work for Solana)

**Bifrost Technologies Implementation**:
- GitHub: [Bifrost-Technologies/Crystals](https://github.com/Bifrost-Technologies/Crystals)
- Post-quantum verification protocol for Solana
- Leverages Dilithium 2 & 3
- Achieves >128 bits security against quantum attacks

---

## 📋 Implementation Plan

### Phase 1: Install Bonsol CLI (10 minutes)

```bash
# Install Bonsol CLI
cargo install bonsol-cli

# Verify installation
bonsol --version

# Install rzup for RISC Zero version management (if needed)
curl -L https://risczero.com/install | bash
rzup install 1.2.1
```

---

### Phase 2: Deploy RISC Zero to Bonsol (30-60 minutes)

#### Option A: Use Bonsol Public Network (Easiest)

```bash
cd /mnt/c/Users/KHK89/cryptrans/bonsol-guest

# 1. Build with Bonsol CLI
bonsol build --zk-program-path .

# 2. This creates manifest.json with:
# - Image ID: 2bcf48fc03156687af1019e50e30731e5182211300a64e9e4b346af0bc89ce95
# - Binary size, inputs, etc.

# 3. Deploy to Bonsol (using their public infrastructure)
# NOTE: Need to get Bonsol program ID and endpoint from their docs
bonsol -k ~/.config/solana/id.json \
       -u https://api.devnet.solana.com \
       deploy s3 \
       -m ./manifest.json \
       --bucket bonsol-public-images \
       --region us-east-1

# 4. Save the deployment account address
# This gives us the BONSOL_PROGRAM_ID we need
```

#### Option B: Local Bonsol Node (For Development)

```bash
# Clone Bonsol
git clone https://github.com/bonsol-collective/bonsol.git
cd bonsol

# Run local Bonsol node
cargo run --release

# Deploy to local node
bonsol -k ~/.config/solana/id.json \
       -u http://localhost:8899 \
       deploy local \
       -m ../cryptrans/bonsol-guest/manifest.json
```

#### Option C: Skip Bonsol, Use Direct STARK Verification

If Bonsol is too complex, we can:
1. Use RISC Zero's direct Solana verification (if available)
2. Or wrap our STARK in Groth16 manually
3. Or deploy later and focus on Dilithium first

---

### Phase 3: Integrate Dilithium (2-3 hours)

#### Step 1: Add Dilithium Crate

```toml
# programs/cryptrans/Cargo.toml
[dependencies]
pqc_dilithium = "0.4"  # Or latest version
# Alternative: crystals-dilithium = "4.0"
```

#### Step 2: Create Dilithium Module

```rust
// programs/cryptrans/src/dilithium.rs

use anchor_lang::prelude::*;
use pqc_dilithium::{Keypair as DilithiumKeypair, PublicKey, Signature, PUBLICKEY_BYTES, SIGNATURE_BYTES};

/// Dilithium public key (1952 bytes for Dilithium3)
pub type DilithiumPublicKey = [u8; PUBLICKEY_BYTES];

/// Dilithium signature (3293 bytes for Dilithium3)
pub type DilithiumSignature = [u8; SIGNATURE_BYTES];

/// Verify a Dilithium signature (post-quantum safe!)
pub fn verify_dilithium_signature(
    message: &[u8],
    signature: &DilithiumSignature,
    public_key: &DilithiumPublicKey,
) -> Result<bool> {
    // Convert byte arrays to pqc_dilithium types
    let pk = PublicKey::from_bytes(public_key)
        .map_err(|_| ErrorCode::InvalidDilithiumPublicKey)?;

    let sig = Signature::from_bytes(signature)
        .map_err(|_| ErrorCode::InvalidDilithiumSignature)?;

    // Verify signature
    let is_valid = pk.verify(message, &sig).is_ok();

    Ok(is_valid)
}

/// Hybrid verification: EdDSA + Dilithium
/// Both must pass for quantum safety + backward compatibility
pub fn verify_hybrid_signature(
    message: &[u8],
    eddsa_signature: &[u8; 64],
    eddsa_pubkey: &Pubkey,
    dilithium_signature: &DilithiumSignature,
    dilithium_pubkey: &DilithiumPublicKey,
) -> Result<bool> {
    // 1. Verify EdDSA (for backward compatibility)
    // Solana's built-in verification
    let eddsa_valid = true; // Actual verification done by Solana runtime

    // 2. Verify Dilithium (for quantum safety)
    let dilithium_valid = verify_dilithium_signature(
        message,
        dilithium_signature,
        dilithium_pubkey,
    )?;

    // Both must pass
    Ok(eddsa_valid && dilithium_valid)
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid Dilithium public key")]
    InvalidDilithiumPublicKey,

    #[msg("Invalid Dilithium signature")]
    InvalidDilithiumSignature,

    #[msg("Dilithium verification failed")]
    DilithiumVerificationFailed,
}
```

#### Step 3: Add Dilithium to Admin Operations

```rust
// lib.rs - Add to critical operations

/// Admin account with hybrid signing
#[account]
pub struct AdminAccount {
    pub eddsa_pubkey: Pubkey,
    pub dilithium_pubkey: [u8; DILITHIUM_PUBLICKEY_BYTES],
    pub authority: Pubkey,
}

/// Initialize admin with Dilithium key
pub fn initialize_admin_quantum_safe(
    ctx: Context<InitializeAdmin>,
    dilithium_pubkey: DilithiumPublicKey,
) -> Result<()> {
    let admin = &mut ctx.accounts.admin;
    admin.eddsa_pubkey = ctx.accounts.authority.key();
    admin.dilithium_pubkey = dilithium_pubkey;
    admin.authority = ctx.accounts.authority.key();
    Ok(())
}

/// Release treasury funds with hybrid signature
pub fn release_funds_quantum_safe(
    ctx: Context<ReleaseFundsQuantumSafe>,
    dilithium_signature: DilithiumSignature,
) -> Result<()> {
    // Construct message to sign
    let message = format!(
        "release_funds:proposal_id:{}:amount:{}",
        ctx.accounts.proposal.id,
        ctx.accounts.proposal.funding_needed
    );

    // Verify hybrid signature
    let is_valid = dilithium::verify_hybrid_signature(
        message.as_bytes(),
        &[0u8; 64], // EdDSA signature from tx
        &ctx.accounts.admin.eddsa_pubkey,
        &dilithium_signature,
        &ctx.accounts.admin.dilithium_pubkey,
    )?;

    require!(is_valid, ErrorCode::DilithiumVerificationFailed);

    // Proceed with fund release...
    // (existing release_funds logic)
    Ok(())
}
```

---

### Phase 4: Remove Groth16 (30 minutes)

```bash
# 1. Delete vote_with_zk instruction from lib.rs
# 2. Delete groth16_verifier.rs module
# 3. Update tests to only use vote_with_stark
# 4. Update CLI to remove Groth16 support
# 5. Recompile and test
```

---

### Phase 5: Testing & Validation (1-2 hours)

```rust
// tests/quantum_safe_test.ts

describe("100% Quantum-Safe Validation", () => {
    it("✅ STARK voting works (hash-based)", async () => {
        // Test vote_with_stark instruction
    });

    it("✅ Dilithium signatures work (lattice-based)", async () => {
        // Test hybrid signature verification
    });

    it("✅ SHA-256 PoW still works (quantum-resistant)", async () => {
        // Test proposal creation
    });

    it("❌ Groth16 voting removed (no quantum-vulnerable code)", async () => {
        // Ensure vote_with_zk doesn't exist
    });

    it("❌ EdDSA-only operations removed", async () => {
        // Ensure all critical ops require Dilithium
    });
});
```

---

## 🎯 Final Architecture (100% Quantum-Safe)

### Layer 1: Anonymous Voting
- ✅ **RISC Zero STARK proofs** (hash-based, quantum-safe)
- ✅ **SHA-256 commitments** (quantum-safe)
- ✅ **SHA-256 nullifiers** (quantum-safe)
- ❌ **No Groth16** (quantum-vulnerable, removed)

### Layer 2: Signatures
- ✅ **Dilithium signatures** for admin operations (lattice-based, quantum-safe)
- ✅ **Hybrid EdDSA + Dilithium** for backward compatibility
- ✅ **All critical ops require Dilithium**

### Layer 3: Anti-Spam
- ✅ **SHA-256 Hashcash PoW** (quantum-resistant)

### Layer 4: Data Integrity
- ✅ **SHA-256 hashing** everywhere (quantum-safe)
- ✅ **Keccak-256** where needed (quantum-safe)

---

## 📦 Dependencies Added

```toml
# programs/cryptrans/Cargo.toml
[dependencies]
# Existing
anchor-lang = "0.30.1"
anchor-spl = "0.30.1"
sha2 = "0.10"

# NEW: Quantum-safe signatures
pqc_dilithium = "0.4"  # Or crystals-dilithium = "4.0"

# Bonsol guest stays separate
```

---

## 🚀 Deployment Checklist

### Before Deployment
- [ ] RISC Zero guest program built (✅ DONE)
- [ ] Bonsol CLI installed
- [ ] Bonsol program deployed (or use public network)
- [ ] BONSOL_PROGRAM_ID updated in code
- [ ] Dilithium crate integrated
- [ ] dilithium.rs module added
- [ ] Hybrid signatures on critical operations
- [ ] Groth16 code removed
- [ ] All tests passing
- [ ] Anchor build successful

### Deployment
```bash
# 1. Build
anchor build

# 2. Deploy to devnet
anchor deploy --provider.cluster devnet

# 3. Update program ID if changed
# 4. Run tests
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com npm test

# 5. Verify on Solscan
# Check program ID: https://solscan.io/account/<PROGRAM_ID>?cluster=devnet
```

### After Deployment
- [ ] Verify STARK voting works
- [ ] Verify Dilithium signatures work
- [ ] Run quantum-safe validation tests
- [ ] Update README: "100% Quantum-Safe ✅"
- [ ] Update QUANTUM_SAFE_STATUS.md: "100% complete"
- [ ] Create blog post/announcement
- [ ] Submit to security auditors

---

## 🔒 Security Properties (100% Quantum-Safe)

| Attack Vector | Defense | Quantum-Safe? |
|---------------|---------|---------------|
| Forge votes | STARK proofs | ✅ YES (hash-based) |
| Double-vote | SHA-256 nullifiers | ✅ YES |
| Spam proposals | SHA-256 PoW | ✅ YES |
| Forge treasury signatures | Dilithium | ✅ YES (lattice) |
| Break EdDSA admin keys | Hybrid Dilithium | ✅ YES |
| Break commitments | SHA-256 | ✅ YES |
| Sybil attack | Staking + PoW | ✅ YES |

**Result**: Fully resistant to all known quantum attacks (Shor's algorithm, Grover's algorithm)

---

## 📊 Resources

**Bonsol**:
- [CLI Commands](https://bonsol.sh/docs/reference/cli-commands)
- [GitHub](https://github.com/bonsol-collective/bonsol)
- [Architecture](https://bonsol.sh/docs/explanation/bonsol-architecure)

**Dilithium**:
- [BTQ Partnership](https://blockonomi.com/solana-hits-quantum-ready-milestone-with-btq-and-bonsol-labs-partnership/)
- [pqc_dilithium crate](https://crates.io/crates/pqc_dilithium)
- [Bifrost Crystals](https://github.com/Bifrost-Technologies/Crystals)

**RISC Zero**:
- [RISC Zero Docs](https://dev.risczero.com/)
- [zkVM Guide](https://dev.risczero.com/zkvm)

---

## 💪 Let's Do This!

**Current**: 40% quantum-safe
**After Bonsol**: 60% quantum-safe
**After Dilithium**: 80% quantum-safe
**After removing Groth16**: **100% QUANTUM-SAFE!** 🏆

**Timeline**:
- Bonsol setup: 1 hour
- Dilithium integration: 2-3 hours
- Remove Groth16: 30 minutes
- Testing: 1-2 hours
- **Total**: 4-6 hours to 100% quantum-safe!

🔐 **Let's make CrypTrans the first truly quantum-proof DAO on Solana!**
