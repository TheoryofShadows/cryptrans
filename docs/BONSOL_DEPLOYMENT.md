# Bonsol Deployment Guide

## Overview

CrypTrans uses Bonsol to verify RISC Zero STARK proofs on-chain. This enables quantum-safe voting and Dilithium signature verification on Solana.

## Current Status

✅ **RISC Zero Guest Program**: Compiled and ready
- Image ID: `2bcf48fc03156687af1019e50e30731e5182211300a64e9e4b346af0bc89ce95`
- Binary size: 332 KB
- Quantum-safe: Uses SHA-256 hashing (no elliptic curves)

✅ **Bonsol Integration Module**: Implemented
- `programs/cryptrans/src/bonsol_integration.rs`
- `programs/cryptrans/src/dilithium.rs`
- CPI structure ready for Bonsol calls

⏳ **Bonsol Deployment**: Pending

## Deployment Steps

### Step 1: Get Bonsol Program ID

Contact Bonsol Labs or deploy Bonsol to your cluster:

```bash
# For Devnet
BONSOL_PROGRAM_ID="<bonsol-devnet-id>"

# For Mainnet (after audits)
BONSOL_PROGRAM_ID="<bonsol-mainnet-id>"
```

### Step 2: Update Program Constants

Edit `programs/cryptrans/src/bonsol_integration.rs`:

```rust
pub const BONSOL_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    // Update with actual Bonsol program ID bytes
]);
```

### Step 3: Compile RISC Zero Guest Programs

```bash
cd bonsol-guest
cargo build --release

# This generates the image ID - update in bonsol_integration.rs
# For Dilithium verification: create dilithium-guest/
# For STARK voting: update VOTING_IMAGE_ID
```

### Step 4: Deploy to Solana

```bash
# Devnet
anchor deploy --provider.cluster devnet

# Update the Bonsol program ID in environment variables
echo "BONSOL_PROGRAM_ID=$BONSOL_PROGRAM_ID" >> .env.devnet
```

### Step 5: Test Bonsol Integration

```bash
cargo test --all
anchor test --provider.cluster devnet
```

## Bonsol Architecture

```
User Signs Message
        ↓
RISC Zero Guest (off-chain)
    - Verify STARK proof
    - Compute public inputs
        ↓
Bonsol Wraps STARK in Groth16
        ↓
CrypTrans Program Verifies via CPI
    - Validate proof structure
    - Check public inputs
    - Update state
```

## Voting Flow with Bonsol

1. **Client**: Generate STARK proof using ZK circuit
2. **Bonsol**: Wrap proof in Groth16
3. **Chain**: CrypTrans verifies with ~200K compute units
4. **Result**: Quantum-safe anonymous vote recorded

## Dilithium with Bonsol

1. **Client**: Sign message with Dilithium key
2. **RISC Zero**: Verify Dilithium signature (heavy computation)
3. **Bonsol**: Wrap verification in STARK → Groth16
4. **Chain**: CrypTrans checks proof
5. **Result**: Quantum-safe treasury releases

## Environment Variables

```bash
# Required for Bonsol integration
BONSOL_PROGRAM_ID=...         # Bonsol program address
VOTING_IMAGE_ID=...            # RISC Zero voting circuit
DILITHIUM_IMAGE_ID=...         # RISC Zero dilithium verification
SOLANA_RPC_URL=...            # RPC endpoint
SOLANA_NETWORK=devnet         # devnet|testnet|mainnet
```

## Troubleshooting

**Issue**: Bonsol CPI call fails with "program not found"
- **Solution**: Verify BONSOL_PROGRAM_ID is correct for the network

**Issue**: Image ID mismatch error
- **Solution**: Recompile guest program and update IMAGE_ID constants

**Issue**: Proof verification takes too long
- **Solution**: Optimize RISC Zero circuit or use smaller inputs

## Next Steps

1. ✅ Design Bonsol integration (COMPLETED)
2. ✅ Implement on-chain verification (COMPLETED)
3. ⏳ Deploy Bonsol to devnet
4. ⏳ Test voting with STARK proofs
5. ⏳ Implement Dilithium guest program
6. ⏳ Deploy to mainnet (post-audit)

## References

- [Bonsol Documentation](https://github.com/solfarm/bonsol)
- [RISC Zero Documentation](https://dev.risczero.com/)
- [Quantum-Safe Voting Design](./QUANTUM_SAFE_UPGRADE.md)

---
**Last Updated**: December 3, 2025
**Status**: Ready for Bonsol Devnet Deployment
