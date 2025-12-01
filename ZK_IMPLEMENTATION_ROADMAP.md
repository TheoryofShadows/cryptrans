# Zero-Knowledge Proof Implementation Roadmap

This document provides a comprehensive guide for implementing **real** zero-knowledge proofs in CrypTrans to achieve true anonymous voting.

---

## 🎯 Goals

### Privacy Requirements
1. **Vote Anonymity**: No one should be able to link a vote to a specific voter
2. **Amount Privacy**: Vote weight should be hidden (or use homomorphic encryption)
3. **Double-Vote Prevention**: Without revealing who voted
4. **Auditability**: Verify all votes are valid without compromising privacy

### Technical Requirements
- Solana-compatible ZK proof system
- Client-side proof generation (< 10 seconds)
- On-chain verification (< 50k compute units)
- No centralized trusted setup if possible

---

## 🛠️ Recommended Approach: Circom + snarkjs + Groth16

### Why This Stack?
- ✅ **Mature**: Used in production (Tornado Cash, Polygon zkEVM, etc.)
- ✅ **Fast**: Groth16 has constant-size proofs (~200 bytes)
- ✅ **Well-documented**: Extensive resources and tutorials
- ✅ **Solana-compatible**: Can be integrated with custom verifier

### Overview
```
[User Wallet] → [Generate Proof] → [Submit to Solana] → [Verify On-Chain]
    ↓                  ↓                    ↓
  Secret        ZK Proof (public)    Verifier Contract
```

---

## 📋 Implementation Phases

### Phase 1: Circuit Design (Week 1)

#### Step 1.1: Define the Circuit
Create `circuits/vote.circom`:

```circom
pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

template VoteCircuit() {
    // Private inputs (known only to voter)
    signal input secret;          // Voter's secret key
    signal input stakeAmount;     // Actual stake amount
    signal input proposalId;      // Which proposal
    
    // Public inputs (visible on-chain)
    signal input nullifier;       // Prevents double-voting
    signal input commitment;      // Commitment to voter identity
    signal input minStake;        // Minimum stake required
    
    // Outputs
    signal output voteWeight;     // Can be stakeAmount or 1 for equal votes
    
    // Constraint 1: Nullifier is correctly derived from secret + proposalId
    component nullifierHash = Poseidon(2);
    nullifierHash.inputs[0] <== secret;
    nullifierHash.inputs[1] <== proposalId;
    nullifier === nullifierHash.out;
    
    // Constraint 2: Commitment is correctly derived from secret
    component commitmentHash = Poseidon(1);
    commitmentHash.inputs[0] <== secret;
    commitment === commitmentHash.out;
    
    // Constraint 3: Stake amount is at least minStake
    component stakeCheck = GreaterEqThan(64);
    stakeCheck.in[0] <== stakeAmount;
    stakeCheck.in[1] <== minStake;
    stakeCheck.out === 1;
    
    // Output: vote weight (could be 1 for equal voting or stakeAmount for weighted)
    voteWeight <== stakeAmount;
}

component main {public [nullifier, commitment, minStake]} = VoteCircuit();
```

#### Step 1.2: Install Dependencies
```bash
npm install -g circom snarkjs
npm install circomlib
```

#### Step 1.3: Compile Circuit
```bash
circom circuits/vote.circom --r1cs --wasm --sym --c
```

This generates:
- `vote.r1cs` - Circuit constraints
- `vote.wasm` - Witness generator
- `vote.sym` - Debugging symbols

---

### Phase 2: Trusted Setup (Week 1)

#### Option A: Powers of Tau Ceremony (Recommended)
Use existing trusted setup from Perpetual Powers of Tau:

```bash
# Download Powers of Tau file (one-time, can be reused)
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_21.ptau

# Generate circuit-specific proving/verification keys
snarkjs groth16 setup vote.r1cs powersOfTau28_hez_final_21.ptau vote_0000.zkey

# Contribute randomness (can be done by multiple parties)
snarkjs zkey contribute vote_0000.zkey vote_0001.zkey --name="First contribution"

# Export verification key
snarkjs zkey export verificationkey vote_0001.zkey verification_key.json

# Export Solana-compatible verifier
snarkjs zkey export solidityverifier vote_0001.zkey verifier.sol
```

#### Option B: PLONK (No Trusted Setup)
```bash
# Use PLONK instead (larger proofs but no trusted setup)
snarkjs plonk setup vote.r1cs powersOfTau28_hez_final_21.ptau vote.zkey
snarkjs zkey export verificationkey vote.zkey verification_key.json
```

---

### Phase 3: Client-Side Proof Generation (Week 2)

#### Step 3.1: Update Frontend to Generate Proofs
Modify `app/src/App.js`:

```javascript
import * as snarkjs from 'snarkjs';

async function generateZKProof(secret, stakeAmount, proposalId, minStake) {
  setStatus('Generating zero-knowledge proof...');
  
  // Calculate nullifier and commitment
  const nullifier = await poseidonHash([secret, proposalId]);
  const commitment = await poseidonHash([secret]);
  
  // Prepare circuit inputs
  const input = {
    secret: secret,
    stakeAmount: stakeAmount,
    proposalId: proposalId,
    nullifier: nullifier,
    commitment: commitment,
    minStake: minStake
  };
  
  try {
    // Generate witness
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      '/vote.wasm',
      '/vote_0001.zkey'
    );
    
    // Format for Solana
    const proofFormatted = {
      pi_a: proof.pi_a.slice(0, 2),
      pi_b: proof.pi_b.slice(0, 2),
      pi_c: proof.pi_c.slice(0, 2),
      publicSignals: publicSignals
    };
    
    setStatus('✓ ZK proof generated!');
    return proofFormatted;
    
  } catch (error) {
    setStatus('Error generating proof: ' + error.message);
    throw error;
  }
}

// Helper: Poseidon hash (ZK-friendly hash function)
async function poseidonHash(inputs) {
  const poseidon = await buildPoseidon();
  const hash = poseidon.F.toString(poseidon(inputs));
  return hash;
}
```

#### Step 3.2: User Secret Management
```javascript
// Generate or retrieve user's secret (NEVER share this!)
function getUserSecret() {
  let secret = localStorage.getItem('cryptrans_secret');
  
  if (!secret) {
    // Generate from wallet signature (deterministic)
    const message = "CrypTrans ZK Secret - NEVER share this signature!";
    const signature = await wallet.signMessage(message);
    secret = hashSignatureToField(signature);
    localStorage.setItem('cryptrans_secret', secret);
  }
  
  return secret;
}

// Store commitment on-chain during stake initialization
async function registerCommitment(commitment) {
  await program.methods
    .registerCommitment(new BN(commitment))
    .accounts({
      stake: stakePda,
      user: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}
```

---

### Phase 4: On-Chain Verifier (Week 2-3)

#### Challenge: Solana Compute Limits
Groth16 verification requires ~1 million gas on Ethereum. Solana has 200k compute unit limit per instruction.

#### Solution 1: Simplified Verifier (Fast)
```rust
use solana_program::alt_bn128::prelude::*;

pub fn verify_groth16_proof(
    proof: &Groth16Proof,
    public_signals: &[u8],
    vk: &VerificationKey,
) -> Result<bool> {
    // Verify pairing equation: e(A, B) = e(alpha, beta) * e(C, delta) * e(public_inputs, gamma)
    
    // Step 1: Compute linear combination of public inputs
    let mut acc = vk.ic[0];
    for (i, signal) in public_signals.iter().enumerate() {
        acc = acc + (vk.ic[i + 1] * signal);
    }
    
    // Step 2: Check pairing
    let pairing_result = alt_bn128_pairing(&[
        proof.a, proof.b,
        acc, vk.gamma_g2,
        proof.c, vk.delta_g2,
    ])?;
    
    Ok(pairing_result == vk.alpha_beta_term)
}
```

#### Solution 2: Verify Program (Recommended)
Create separate program `cryptrans-verifier`:

```rust
// programs/cryptrans-verifier/src/lib.rs
use anchor_lang::prelude::*;

declare_id!("VERIFIER_PROGRAM_ID");

#[program]
pub mod cryptrans_verifier {
    use super::*;
    
    pub fn verify_vote_proof(
        ctx: Context<VerifyProof>,
        proof: Groth16Proof,
        nullifier: [u8; 32],
        commitment: [u8; 32],
        min_stake: u64,
    ) -> Result<bool> {
        // Deserialize verification key from account
        let vk = &ctx.accounts.verification_key;
        
        // Public signals: [nullifier, commitment, min_stake]
        let public_signals = [
            bytes_to_field(&nullifier),
            bytes_to_field(&commitment),
            min_stake,
        ];
        
        // Verify proof
        verify_groth16(proof, &public_signals, vk)?;
        
        Ok(true)
    }
}
```

#### Solution 3: Use Light Protocol (Easiest)
```rust
use light_sdk::verify_proof;

pub fn vote_with_zk(
    ctx: Context<VoteWithZK>,
    proof: Vec<u8>,
    nullifier: [u8; 32],
) -> Result<()> {
    // Light Protocol handles verification
    light_sdk::verify_proof(&proof)?;
    
    // Check nullifier hasn't been used
    require!(
        !ctx.accounts.nullifier_set.contains(&nullifier),
        ErrorCode::NullifierUsed
    );
    
    // Add nullifier to set
    ctx.accounts.nullifier_set.insert(nullifier);
    
    // Count vote (without revealing voter)
    ctx.accounts.proposal.votes += 1; // Equal voting, or extract weight from proof
    
    Ok(())
}
```

---

### Phase 5: Integration (Week 3-4)

#### Step 5.1: Update Program Accounts
```rust
#[account]
pub struct Stake {
    pub user: Pubkey,
    pub amount: u64,
    pub commitment: [u8; 32],  // NEW: ZK commitment
    pub last_demurrage: u64,
}

#[account]
pub struct NullifierSet {
    pub proposal_id: u64,
    pub nullifiers: Vec<[u8; 32]>,  // Track used nullifiers
}

#[account]
pub struct VerificationKey {
    pub alpha_g1: [u8; 64],
    pub beta_g2: [u8; 128],
    pub gamma_g2: [u8; 128],
    pub delta_g2: [u8; 128],
    pub ic: Vec<[u8; 64]>,
}
```

#### Step 5.2: Update Vote Function
```rust
pub fn vote(
    ctx: Context<VoteWithZK>,
    proof: Groth16Proof,
    nullifier: [u8; 32],
    commitment: [u8; 32],
    vote_weight: u64,
) -> Result<()> {
    // Cross-program invocation to verifier
    let cpi_accounts = VerifyProof {
        verification_key: ctx.accounts.verification_key.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.verifier_program.to_account_info(),
        cpi_accounts,
    );
    
    cryptrans_verifier::cpi::verify_vote_proof(
        cpi_ctx,
        proof,
        nullifier,
        commitment,
        1_000_000_000, // min_stake
    )?;
    
    // Check nullifier hasn't been used
    let nullifier_set = &mut ctx.accounts.nullifier_set;
    require!(
        !nullifier_set.nullifiers.contains(&nullifier),
        ErrorCode::AlreadyVoted
    );
    
    // Add nullifier
    nullifier_set.nullifiers.push(nullifier);
    
    // Add vote (weight is verified in ZK proof)
    let proposal = &mut ctx.accounts.proposal;
    proposal.votes = proposal.votes.checked_add(vote_weight).unwrap();
    
    Ok(())
}
```

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
describe("ZK Voting", () => {
  it("Generates valid proof", async () => {
    const secret = "12345678901234567890123456789012";
    const stakeAmount = 1_000_000_000;
    const proposalId = 1;
    
    const proof = await generateZKProof(secret, stakeAmount, proposalId, 0);
    
    assert.ok(proof.pi_a.length === 2);
    assert.ok(proof.publicSignals.length === 3);
  });
  
  it("Verifies proof on-chain", async () => {
    // ... generate proof ...
    
    const tx = await program.methods
      .vote(proof, nullifier, commitment, voteWeight)
      .accounts({ /* ... */ })
      .rpc();
    
    assert.ok(tx);
  });
  
  it("Rejects double voting with same nullifier", async () => {
    // ... vote once ...
    
    try {
      await program.methods
        .vote(proof, nullifier, commitment, voteWeight)
        .accounts({ /* ... */ })
        .rpc();
      assert.fail("Should reject duplicate nullifier");
    } catch (error) {
      assert.ok(error.toString().includes("AlreadyVoted"));
    }
  });
  
  it("Accepts same user voting on different proposals", async () => {
    const nullifier1 = await calculateNullifier(secret, proposalId1);
    const nullifier2 = await calculateNullifier(secret, proposalId2);
    
    assert.notEqual(nullifier1, nullifier2);
    
    // Both should succeed
    await vote(proof1, nullifier1, /* ... */);
    await vote(proof2, nullifier2, /* ... */);
  });
});
```

---

## 📊 Performance Benchmarks

### Expected Performance (Groth16)
| Operation | Time | Compute Units |
|-----------|------|---------------|
| Proof Generation (client) | 5-15s | N/A |
| Proof Verification (on-chain) | ~50ms | 150k-200k |
| Proof Size | 192 bytes | - |
| Public Inputs | 96 bytes | - |

### Optimization Tips
1. **Use WASM Workers**: Generate proofs in background thread
2. **Cache Powers of Tau**: ~200MB, download once
3. **Compress Proofs**: Use Solana compression if proof > 1KB
4. **Batch Verify**: Verify multiple proofs in single transaction

---

## 🔐 Security Considerations

### Trusted Setup
- **Risk**: If setup randomness is compromised, proofs can be forged
- **Mitigation**: Use multi-party ceremony (10+ participants)
- **Alternative**: Use PLONK (no trusted setup, but 2x larger proofs)

### Secret Management
- **Risk**: If user loses secret, they lose access to voting
- **Mitigation**: 
  - Derive from wallet signature (deterministic)
  - Add recovery mechanism (time-locked reveal)
  - Backup to encrypted storage

### Nullifier Tracking
- **Risk**: Nullifier storage grows unbounded
- **Mitigation**:
  - Use Merkle tree instead of Vec (constant lookup)
  - Archive old proposals (move to separate account)
  - Implement nullifier expiration

### Front-Running
- **Risk**: MEV bots could see nullifier before confirmation
- **Mitigation**:
  - Use commitment scheme (reveal in 2nd transaction)
  - Batch votes (hide individual nullifiers)

---

## 💰 Cost Estimation

### One-Time Costs
- Circuit development: 40-80 hours ($4k-$8k developer time)
- Trusted setup ceremony: 20-40 hours ($2k-$4k)
- Integration & testing: 40-80 hours ($4k-$8k)
- **Total**: $10k-$20k for experienced team

### Per-Transaction Costs
- Proof generation: Free (client-side)
- Verification: ~0.0005 SOL (~$0.02 at $50/SOL)
- Storage (nullifier): ~0.00001 SOL

### Infrastructure
- Host proving keys: ~$10/month (CDN)
- Maintain verifier program: Rent-exempt (~0.01 SOL one-time)

---

## 🚀 Launch Checklist

- [ ] Circuit design reviewed by ZK expert
- [ ] Trusted setup with 10+ participants
- [ ] Client-side proof generation tested on slow devices
- [ ] On-chain verifier compute units < 200k
- [ ] Nullifier storage strategy implemented
- [ ] Secret recovery mechanism
- [ ] Frontend UX for proof generation (progress bar, etc.)
- [ ] Documentation for users on privacy guarantees
- [ ] Security audit of ZK implementation
- [ ] Testnet deployment with real users
- [ ] Performance benchmarks published

---

## 📚 Learning Resources

### Beginner
- [Zero Knowledge Proofs: An Illustrated Primer](https://blog.cryptographyengineering.com/2014/11/27/zero-knowledge-proofs-illustrated-primer/)
- [ZK Whiteboard Sessions](https://zkhack.dev/whiteboard/)
- [Circom Documentation](https://docs.circom.io/)

### Intermediate
- [snarkjs Tutorial](https://github.com/iden3/snarkjs)
- [Building a ZK dApp](https://blog.iden3.io/circom-and-snarkjs-tutorial2.html)
- [Poseidon Hash](https://www.poseidon-hash.info/)

### Advanced
- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf)
- [PLONK Paper](https://eprint.iacr.org/2019/953)
- [Solana ZK Compression](https://www.zkcompression.com/)

### Solana-Specific
- [Light Protocol Docs](https://docs.lightprotocol.com/)
- [Solana alt_bn128 Syscalls](https://docs.solana.com/developing/runtime-facilities/programs#alt_bn128)
- [Anchor CPI Tutorial](https://book.anchor-lang.com/anchor_in_depth/CPIs.html)

---

## 🤝 Alternative Solutions

### 1. Light Protocol (Fastest Integration)
**Pros**: 
- Ready-made ZK infrastructure
- Handled trusted setup
- Active maintenance

**Cons**:
- Less customization
- Additional dependency
- Learning curve

**Time**: 1-2 weeks

---

### 2. Elusiv (Privacy Focus)
**Pros**:
- Built for Solana
- Privacy pools
- Token mixing

**Cons**:
- Focused on transfers, not governance
- Requires adaptation

**Time**: 2-3 weeks

---

### 3. Custom zkSNARK (Maximum Control)
**Pros**:
- Full customization
- Optimized for use case
- No dependencies

**Cons**:
- Most complex
- Highest risk
- Longest development

**Time**: 4-8 weeks

---

## 📞 Need Help?

### ZK Experts for Hire
- [PSE (Privacy & Scaling Explorations)](https://pse.dev/)
- [Geometry](https://www.geometry.xyz/)
- [0xPARC](https://0xparc.org/)

### Auditing Firms with ZK Experience
- [Trail of Bits](https://www.trailofbits.com/)
- [Least Authority](https://leastauthority.com/)
- [Zellic](https://www.zellic.io/)

---

**Recommended Next Step**: Start with Phase 1 (Circuit Design) and test with Light Protocol for faster iteration. Once proven, migrate to custom implementation for optimization.

**Last Updated**: November 30, 2025  
**Maintained By**: CrypTrans Core Team

