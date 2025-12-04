# Security Status

## Summary

This document tracks the security vulnerabilities and their status for the CrypTrans project.

## Fixed Vulnerabilities ✅

### Critical: risc0-zkvm < 2.3.2
- **Status**: ✅ FIXED
- **Fixed Version**: 2.3.2
- **Location**: `bonsol-guest/Cargo.toml`
- **Impact**: Critical security vulnerability in RISC Zero VM
- **Verification**: Builds successfully with `cd bonsol-guest && cargo build --release`

### Critical: risc0-zkvm-platform < 2.1.0
- **Status**: ✅ FIXED
- **Fixed Version**: 2.2.1
- **Location**: `bonsol-guest/Cargo.toml`
- **Impact**: Platform support for RISC Zero VM

## Known Issues (No Fix Available) ⚠️

### High: bigint-buffer <= 1.1.5 (CVE-2025-3194)
- **Status**: ⚠️ NO FIX AVAILABLE
- **Current Version**: 1.1.5 (latest available on npm)
- **Location**: Transitive dependency via `@solana/spl-token`
- **CVEDetails**: Buffer Overflow in `toBigIntLE()` function
- **CVSS Score**: 7.5 (High)
- **Impact**: Denial of Service (DoS) only
- **Risk Assessment**: LIMITED
  - Affects only devDependencies (test environment)
  - Not used in production on-chain code
  - DoS impact only (no code execution)
  - Package last updated 2019, appears unmaintained
- **Mitigation**: Using latest available version (1.1.5)
- **Tracking**:
  - GitHub Issue: https://github.com/no2chem/bigint-buffer/issues/59
  - Will upgrade when patched version released
- **References**:
  - https://github.com/advisories/GHSA-3gc7-fjrx-p6mg
  - https://nvd.nist.gov/vuln/detail/CVE-2025-3194
  - https://security.snyk.io/vuln/SNYK-JS-BIGINTBUFFER-3364597

## Build Requirements

### Rust Dependencies
-System Rust: 1.90.0
- Solana BPF Toolchain: Managed via `cargo build-sbf`
- Anchor CLI: 0.30.1 (via `avm`)

### Installation
```bash
# Install Anchor Version Manager
cargo install --git https://github.com/coral-xyz/anchor avm --tag v0.31.1 --force

# Install Anchor 0.30.1
avm install 0.30.1
avm use 0.30.1

# Build bonsol-guest (RISC Zero)
cd bonsol-guest
cargo build --release

# Build Solana program
cd ..
anchor build
```

## Dependencies Overview

### Quantum-Safe Cryptography
- **RISC Zero STARK Proofs**: ✅ v2.3.2 (secure)
- **Dilithium (CRYSTALS-Dilithium)**: Off-chain verification via Bonsol CPI
- **Note**: pqcrypto-dilithium not used due to getrandom incompatibility with Solana BPF

### Node.js Dependencies
- `@solana/spl-token`: v0.4.14 (devDependency, contains vulnerable bigint-buffer)
- `@coral-xyz/anchor`: v0.30.1

## Security Best Practices

1. **Regular Updates**: Monitor and update dependencies regularly
2. **Audit Scans**: Run `npm audit` and `cargo audit` before each release
3. **Dev vs Prod**: Vulnerable dev dependencies don't affect production on-chain code
4. **Quantum Resistance**: Maintain RISC Zero and prepare for Dilithium integration

## Contact

For security concerns, please open an issue on GitHub with the `security` label.

## Last Updated

2025-12-04
