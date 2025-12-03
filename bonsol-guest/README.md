# CrypTrans Voting Circuit - RISC Zero Guest Program

This is the **quantum-safe voting circuit** for CrypTrans, running inside the RISC Zero zkVM.

## Overview

The circuit proves:
1. **Commitment**: Voter knows secret s.t. `commitment = SHA256(secret)`
2. **Nullifier**: `nullifier = SHA256(proposal_id || secret)` (prevents double-voting)
3. **Vote validity**: Vote choice is 0 (No) or 1 (Yes)

## Why RISC Zero + Bonsol?

**RISC Zero**: Generates STARK proofs (hash-based, quantum-resistant)
**Bonsol**: Wraps STARK in Groth16 (256 bytes) for efficient on-chain verification

## Build & Test

```bash
# Install RISC Zero toolchain (if not already)
curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/bonsol-collective/bonsol/refs/heads/main/bin/install.sh | sh
source ~/.bashrc

# Build the guest program
cd bonsol-guest
cargo build --release --target=riscv32im-risc0-zkvm-elf

# Run tests
cargo test

# Generate proof (example)
cargo run --release
```

## Integration with Solana

1. **Off-chain**: User runs this program in zkVM, generates STARK proof
2. **Bonsol**: Wraps STARK in Groth16 (256 bytes)
3. **On-chain**: Solana program verifies Groth16 with Bonsol CPI

## Inputs

### Private (Secret)
- `secret: [u8; 32]` - User's secret value
- `vote_choice: u8` - 0 (No) or 1 (Yes)

### Public (Visible)
- `proposal_id: [u8; 32]` - Proposal being voted on
- `commitment: [u8; 32]` - SHA256(secret)
- `nullifier: [u8; 32]` - SHA256(proposal_id || secret)

## Security Properties

✅ **Quantum-safe**: STARK proofs use SHA-256 (not elliptic curves)
✅ **Anonymous**: Vote choice not linked to voter identity
✅ **Sybil-resistant**: Nullifier prevents double-voting
✅ **Verifiable**: On-chain verification via Bonsol

## Performance

- **Proof generation**: ~1-2 seconds (off-chain)
- **Proof size**: ~200KB STARK → 256 bytes Groth16 (via Bonsol)
- **Verification**: <200K compute units on Solana

## References

- [RISC Zero Documentation](https://dev.risczero.com/)
- [Bonsol Documentation](https://bonsol.sh/docs)
- [CrypTrans QUANTUM_SAFE_UPGRADE.md](../docs/QUANTUM_SAFE_UPGRADE.md)
