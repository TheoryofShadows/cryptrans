# CrypTrans: Multi-Party Computation (MPC) Ceremony Plan

**Purpose**: Generate trusted setup parameters for Groth16 ZK proofs
**Method**: PLONK universal ceremony (snarkjs)
**Participants**: 5-10 independent contributors
**Timeline**: 2-3 days
**Status**: Planning phase

---

## 🎯 WHY MPC CEREMONY?

**Current Risk**: Single-party trusted setup
- If the "toxic waste" (random parameters) is compromised, proofs can be forged
- Current Groth16 verifier uses hardcoded parameters (unknown origin)

**MPC Solution**: Multi-party trusted setup
- Requires **all participants** to collude to forge proofs
- Even 1 honest participant = secure system
- Industry standard (Zcash Sapling, Filecoin, Tornado Cash)

---

## 🔬 TECHNICAL BACKGROUND

### Groth16 vs PLONK

**Groth16** (current):
- Circuit-specific setup (one ceremony per circuit)
- Smallest proof size (256 bytes)
- Fastest verification (<200K CU)
- Needs MPC ceremony for each circuit change

**PLONK** (alternative):
- Universal setup (one ceremony for all circuits)
- Larger proofs (~400-600 bytes)
- Slower verification (~400K CU)
- More flexible (can update circuit without new ceremony)

**Our Choice**: Start with Groth16 (already deployed), migrate to PLONK if needed

---

## 📋 CEREMONY PROCEDURE

### Phase 1: Preparation (Day 1)

**1.1 Define Circuit**
```bash
cd zk-circuit
npm install snarkjs circom

# Create voting circuit in Circom
cat > voting.circom <<'EOF'
pragma circom 2.0.0;

include "node_modules/circomlib/circuits/sha256/sha256.circom";

template Voting() {
    // Private inputs
    signal input secret[256];      // 32 bytes as bits
    signal input vote;             // 0 or 1

    // Public inputs
    signal input proposal_id[256]; // 32 bytes as bits

    // Outputs
    signal output commitment[256]; // SHA256(secret)
    signal output nullifier[256];  // SHA256(proposal_id || secret)

    // Commitment = SHA256(secret)
    component commitment_hasher = Sha256(256);
    for (var i = 0; i < 256; i++) {
        commitment_hasher.in[i] <== secret[i];
    }
    for (var i = 0; i < 256; i++) {
        commitment[i] <== commitment_hasher.out[i];
    }

    // Nullifier = SHA256(proposal_id || secret)
    component nullifier_hasher = Sha256(512);
    for (var i = 0; i < 256; i++) {
        nullifier_hasher.in[i] <== proposal_id[i];
        nullifier_hasher.in[i + 256] <== secret[i];
    }
    for (var i = 0; i < 256; i++) {
        nullifier[i] <== nullifier_hasher.out[i];
    }

    // Vote must be 0 or 1
    vote * (vote - 1) === 0;
}

component main = Voting();
EOF

# Compile circuit
circom voting.circom --r1cs --wasm --sym
```

**1.2 Invite Participants**

Reach out to:
- Security researchers (Trail of Bits, OtterSec)
- Solana core developers
- Cypherpunk community members
- Longevity/transhumanism advocates
- ZK experts from Zcash, Aztec, zkSync

Minimum: 5 participants
Ideal: 10 participants

**1.3 Set Up Infrastructure**

```bash
# Install snarkjs globally
npm install -g snarkjs

# Create ceremony directory
mkdir -p ceremony/contributions
cd ceremony
```

### Phase 2: Powers of Tau (Universal Setup)

**Step 1: Start Ceremony**
```bash
# Generate initial parameters (power of 20 = 1M constraints)
snarkjs powersoftau new bn128 20 pot20_0000.ptau -v

# Contribute randomness (participant 1)
snarkjs powersoftau contribute pot20_0000.ptau pot20_0001.ptau \
  --name="Participant 1" -v
```

**Step 2: Collect Contributions**

Each participant:
1. Downloads previous contribution (`pot20_000X.ptau`)
2. Adds randomness:
   ```bash
   snarkjs powersoftau contribute pot20_000X.ptau pot20_000Y.ptau \
     --name="Participant Name" -v
   ```
3. **Destroys their random seed** (critical!)
4. Uploads new contribution
5. Posts hash to social media (proof of participation)

**Example Tweet**:
```
I just contributed to the @CrypTrans_DAO MPC ceremony!

My contribution hash:
f7a3b9c4e5d6...

Ceremony: https://cryptrans.io/ceremony
Contribution: 3/10

#ZKProof #Solana #Cypherpunk
```

**Step 3: Finalize Phase 1**
```bash
# After all contributions
snarkjs powersoftau prepare phase2 pot20_final.ptau pot20_final_prep.ptau -v
```

### Phase 3: Circuit-Specific Setup

**Step 1: Generate Circuit Keys**
```bash
# Generate proving and verification keys
snarkjs groth16 setup voting.r1cs pot20_final_prep.ptau voting_0000.zkey

# Contribute to circuit-specific setup
snarkjs zkey contribute voting_0000.zkey voting_0001.zkey \
  --name="Participant 1" -v
```

**Step 2: Collect Circuit Contributions**

Repeat with all participants (similar to Phase 2)

**Step 3: Export Verification Key**
```bash
# Export verification key for Solana program
snarkjs zkey export verificationkey voting_final.zkey verification_key.json

# Export Solana-compatible verifier
snarkjs zkey export solidityverifier voting_final.zkey verifier.sol
# Note: We'll convert Solidity to Rust for Solana
```

### Phase 4: Verification & Integration

**Step 1: Verify Ceremony Integrity**
```bash
# Verify final zkey
snarkjs zkey verify voting.r1cs pot20_final_prep.ptau voting_final.zkey

# Check contribution hashes
cat ceremony_transcript.txt
```

**Step 2: Generate Test Proof**
```typescript
// test-proof.ts
import { groth16 } from "snarkjs";

const input = {
  secret: [42, ...Array(255).fill(0)],  // 32 bytes as 256 bits
  vote: 1,                               // Yes vote
  proposal_id: [1, ...Array(255).fill(0)]
};

const { proof, publicSignals } = await groth16.fullProve(
  input,
  "voting.wasm",
  "voting_final.zkey"
);

console.log("Proof:", proof);
console.log("Public signals:", publicSignals);

// Verify proof
const vKey = JSON.parse(fs.readFileSync("verification_key.json"));
const res = await groth16.verify(vKey, publicSignals, proof);
console.log("Verification result:", res); // Should be true
```

**Step 3: Update Solana Program**
```rust
// Update programs/cryptrans/src/zk_verifier.rs
use anchor_lang::prelude::*;

pub const VERIFICATION_KEY: [u8; 256] = [
    // Insert parameters from verification_key.json
    // Converted to Rust array format
];

pub fn verify_groth16(
    proof: &[u8; 256],
    public_inputs: &[[u8; 32]],
) -> Result<bool> {
    // Update with new verification key
    // ...
}
```

---

## 👥 PARTICIPANT RESPONSIBILITIES

### Before Contributing

- [ ] Install snarkjs (`npm install -g snarkjs`)
- [ ] Verify previous contribution hash
- [ ] Generate strong random seed (e.g., `openssl rand -hex 64`)

### During Contribution

- [ ] Download previous `.ptau` file
- [ ] Add randomness: `snarkjs powersoftau contribute ...`
- [ ] Record contribution hash
- [ ] **Delete random seed** (critical for security!)
- [ ] Upload new `.ptau` file

### After Contributing

- [ ] Post contribution hash to Twitter/social media
- [ ] Verify next participant's hash includes your contribution
- [ ] Store contribution hash for future reference

---

## 🔒 SECURITY BEST PRACTICES

### For Participants

1. **Generate entropy offline**: Use dice, coin flips, atmospheric noise
2. **Air-gapped machine**: Disconnect from internet during contribution
3. **Destroy randomness**: Overwrite random seed with zeros, then delete
4. **Hash verification**: Always verify previous participant's hash
5. **Social proof**: Post contribution hash publicly

### For Coordinator

1. **Public transcript**: Publish all contribution hashes
2. **Continuous verification**: Verify each contribution before accepting next
3. **Diverse participants**: Ensure geographic/organizational diversity
4. **Backup everything**: Store all `.ptau` files securely
5. **Video proof**: Optional: Record contribution process

---

## 📊 TIMELINE

### Week 1: Preparation
- **Day 1-2**: Define circuit, compile to R1CS
- **Day 3-4**: Recruit participants (5-10)
- **Day 5-7**: Set up infrastructure, test ceremony flow

### Week 2: Ceremony
- **Day 1**: Powers of Tau (5-10 contributions, ~2 hours each)
- **Day 2**: Circuit-specific setup (5-10 contributions)
- **Day 3**: Verification, testing, integration

### Week 3: Deployment
- **Day 1-2**: Update Solana program with new keys
- **Day 3-4**: Test on devnet
- **Day 5**: Deploy to mainnet

---

## 🎯 SUCCESS CRITERIA

Ceremony is successful when:

1. ✅ **5+ participants** (more = better)
2. ✅ **All hashes verified** (transcript valid)
3. ✅ **Test proof verifies** (on-chain)
4. ✅ **Public attestations** (social media posts)
5. ✅ **Integration complete** (program updated)

---

## 🚀 ALTERNATIVE: BONSOL (Future)

**Note**: Once Bonsol STARK integration is complete, we may not need Groth16 MPC ceremony.

STARK proofs use:
- Hash-based commitments (SHA-256)
- No trusted setup required!
- Already quantum-safe

**Migration path**:
1. Complete Groth16 MPC ceremony (security now)
2. Deploy Bonsol STARK integration (quantum-safety)
3. Deprecate Groth16 (after testing)
4. Remove trusted setup dependency

---

## 📚 REFERENCES

- [snarkjs Documentation](https://github.com/iden3/snarkjs)
- [Circom Documentation](https://docs.circom.io/)
- [Zcash Sapling MPC](https://z.cash/technology/paramgen/)
- [Tornado Cash MPC](https://tornado-cash.medium.com/)
- [Powers of Tau](https://github.com/weijiekoh/perpetualpowersoftau)

---

## 📢 CALL FOR PARTICIPANTS

**Interested in contributing to the CrypTrans MPC ceremony?**

We're looking for 5-10 independent participants to help generate trusted setup parameters for our quantum-safe, privacy-preserving DAO.

**Requirements**:
- Technical expertise (understand MPC/ZK)
- Commitment to destroy random seeds
- Public attestation (Twitter/social media)

**Compensation**:
- Recognition in CrypTrans documentation
- NFT proof of participation
- Early access to DAO governance

**Contact**: ceremony@cryptrans.io (or Twitter DM @CrypTrans_DAO)

---

**"Trust, but verify. Better yet: Multi-party computation."**

🤖 Generated with [Claude Code](https://claude.com/claude-code)
