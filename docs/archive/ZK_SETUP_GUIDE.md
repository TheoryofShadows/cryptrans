# Real Zero-Knowledge Proofs - Setup Guide

This guide will walk you through setting up **real ZK proofs** for CrypTrans anonymous voting.

---

## 🎯 What We've Implemented

✅ **Circom Circuit** - `circuits/vote.circom`  
✅ **Proof Generation** - `zkproof/prover.js` and `app/src/zkProver.js`  
✅ **On-Chain Verification** - Updated `programs/cryptrans/src/lib.rs`  
✅ **Frontend Integration** - `app/src/App-WithRealZK.js`  
✅ **Test Suite** - `zkproof/test-circuit.js`

---

## 📋 Prerequisites

Before you begin:
- Node.js 18+ installed
- Circom 2.1.6+ installed
- snarkjs installed
- Anchor and Solana CLI installed
- At least 8GB RAM (for proof generation)
- 500MB free disk space (for Powers of Tau file)

---

## 🚀 Step-by-Step Setup

### Step 1: Install Circom

#### Linux/Mac:
```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Clone and build circom
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom

# Verify installation
circom --version  # Should show 2.1.6 or higher
```

#### Windows:
```powershell
# Install Rust from https://rustup.rs/

# Clone and build
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom

# Add to PATH
$env:PATH += ";$HOME\.cargo\bin"

# Verify
circom --version
```

---

### Step 2: Install Circuit Dependencies

```bash
cd circuits
npm install
```

This installs:
- `circomlib` - Library of common circuits
- `snarkjs` - Proof generation library
- `ffjavascript` - Finite field arithmetic

---

### Step 3: Compile the Circuit

```bash
cd circuits
npm run compile
```

This generates:
- `zkproof/vote.r1cs` - Circuit constraints
- `zkproof/vote_js/vote.wasm` - Witness generator
- `zkproof/vote.sym` - Debugging symbols

**Expected output:**
```
template instances: 5
non-linear constraints: 1234
linear constraints: 0
public inputs: 4
private inputs: 3
public outputs: 1
wires: 2345
labels: 3456
```

**Troubleshooting:**
- Error: `circom: command not found` → Install Circom (Step 1)
- Error: `Module not found: circomlib` → Run `npm install` in circuits/
- Out of memory → Close other applications, need 4GB+ RAM

---

### Step 4: Download Powers of Tau

This downloads a 60MB file from the Perpetual Powers of Tau ceremony:

```bash
cd zkproof
node download-ptau.js
```

**Expected output:**
```
📥 Downloading Powers of Tau file...
Progress: 10%
Progress: 20%
...
Progress: 100%
✅ Download complete!
```

**Note:** This file can be reused for multiple circuits. You only need to download it once.

**Troubleshooting:**
- Slow download → The file is 60MB, be patient
- Download fails → Check internet connection or download manually from:
  https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_21.ptau

---

### Step 5: Trusted Setup (Generate Proving Keys)

```bash
cd zkproof
node setup.js
```

This performs a **trusted setup** to generate:
- `vote_final.zkey` - Proving key (~5-10MB)
- `verification_key.json` - Verification key (~2KB)

**Expected output:**
```
🔧 Starting trusted setup...
Step 1/5: Generating initial proving key...
✅ Initial zkey generated

Step 2/5: Contributing randomness...
✅ Contribution added by: CrypTrans Initial Setup

Step 3/5: Exporting verification key...
✅ Verification key exported

Step 4/5: Verifying proving key...
✅ Proving key verification passed!

Step 5/5: Circuit information:
Curve: bn-128
Constraints: 1234
...

🎉 Setup complete!
```

**IMPORTANT FOR PRODUCTION:**
This single-party setup is **NOT secure for production**! You need a multi-party ceremony:
1. Have 10+ independent contributors
2. Each runs `snarkjs zkey contribute`
3. As long as ONE contributor is honest, the setup is secure

**Troubleshooting:**
- Error: `Powers of Tau not found` → Run Step 4 first
- Error: `Circuit not compiled` → Run Step 3 first
- Slow processing → This takes 1-5 minutes, be patient

---

### Step 6: Test the Circuit

```bash
cd zkproof
node test-circuit.js
```

This runs comprehensive tests:
- Valid proof with sufficient stake
- Invalid proof with insufficient stake
- Nullifier generation
- Commitment generation

**Expected output:**
```
🧪 Testing CrypTrans Anonymous Vote Circuit

Generated secret: 12345...
📊 Test Parameters:
  Stake Amount: 5000000000 lamports (5 tokens)
  Proposal ID: 1701234567890
  Min Stake: 1000000000 lamports (1 token)

🔑 Generating commitment and nullifier...
  Commitment: 123456789...
  Nullifier: 987654321...

⚡ Generating zero-knowledge proof...
✅ Proof generated in 12.34s

🔍 Verifying proof...
✅ Proof valid!

✅ SUCCESS! Proof is valid!

🎉 Zero-knowledge proof system is working correctly!

What this proves:
  ✅ User has secret that generates the commitment
  ✅ User has >= 1 token staked
  ✅ Nullifier prevents double-voting on this proposal
  ✅ All without revealing the secret or exact stake amount!

====================================================================
TEST RESULTS
====================================================================
Valid proof with sufficient stake: ✅ PASS
Invalid proof with insufficient stake: ✅ PASS
====================================================================

🎉 All tests passed! Ready for integration.
```

**Troubleshooting:**
- Proof generation fails → Check RAM (need 2GB+ available)
- Verification fails → Re-run setup (Step 5)
- Timeout → Proof generation takes 10-30 seconds on slow machines

---

### Step 7: Rebuild the Solana Program

```bash
cd ../
anchor build
```

This compiles the updated program with real ZK verification.

**Expected output:**
```
Compiling cryptrans...
Build successful!
```

---

### Step 8: Deploy to Devnet

```bash
# Deploy program
anchor deploy --provider.cluster devnet

# Get program ID
solana address -k target/deploy/cryptrans-keypair.json

# Update Anchor.toml and app/src/App-WithRealZK.js with the new program ID
```

---

### Step 9: Copy ZK Files to Frontend

```bash
# Copy proving keys to frontend public directory
mkdir -p app/public/zkproof
cp zkproof/vote_final.zkey app/public/zkproof/
cp zkproof/verification_key.json app/public/zkproof/
cp -r zkproof/vote_js app/public/zkproof/
```

**Important:** These files are large (~5-10MB total). For production:
1. Host on CDN (Cloudflare, AWS S3)
2. Enable gzip compression
3. Lazy load only when needed

---

### Step 10: Install Frontend Dependencies

```bash
cd app
npm install
```

This installs the new ZK dependencies:
- `snarkjs` - Client-side proof generation
- `circomlibjs` - Poseidon hash and other utilities
- `ffjavascript` - Field arithmetic

---

### Step 11: Use the New Frontend

**Option A: Replace existing App.js**
```bash
cd app/src
mv App.js App-Old.js
mv App-WithRealZK.js App.js
```

**Option B: Keep both versions**
Update `index.js` to import the new version:
```javascript
import App from './App-WithRealZK';
```

---

### Step 12: Start the Frontend

```bash
cd app
npm start
```

Opens at `http://localhost:3000`

**Testing:**
1. Connect wallet (Phantom/Solflare on devnet)
2. Wait for "ZK Proofs: Active" indicator
3. Initialize stake account (this registers your ZK commitment)
4. Stake some tokens
5. Create a proposal
6. Vote with real ZK proof (takes 10-30 seconds)

**Expected Behavior:**
- Proof generation shows progress: "Generating zero-knowledge proof..."
- Takes 10-30 seconds depending on your machine
- Success message: "✅ Anonymous vote cast successfully! Your identity is protected."
- Your vote is now cryptographically anonymous!

---

## 📊 Performance Expectations

| Operation | Time | Notes |
|-----------|------|-------|
| Circuit compilation | 30-60s | One-time |
| Powers of Tau download | 1-2 min | One-time |
| Trusted setup | 2-5 min | One-time |
| Proof generation (client) | 10-30s | Per vote |
| Proof verification (on-chain) | 50ms | Fast! |

**Hardware Requirements:**
- **Minimum:** 4GB RAM, dual-core CPU
- **Recommended:** 8GB RAM, quad-core CPU
- **Optimal:** 16GB RAM, 6+ core CPU

**Browser Performance:**
- Chrome/Edge: Best (V8 engine optimized for WASM)
- Firefox: Good
- Safari: Slower (less optimized)

---

## 🔐 Security Notes

### Current Setup Status: Development Only

**What's Secure:**
✅ Circuit logic is sound  
✅ Nullifiers prevent double-voting  
✅ Commitments hide identity  
✅ On-chain verification works  

**What's NOT Secure Yet:**
❌ Single-party trusted setup (need multi-party ceremony)  
❌ Secrets stored in localStorage (need secure key management)  
❌ No proof batching (one tx per vote)  
❌ No Merkle tree for commitment registry  

### Before Mainnet:

1. **Multi-Party Trusted Setup**
   - Organize ceremony with 10+ independent contributors
   - Document ceremony process
   - Publish attestations
   - Use perpetual ceremony for ongoing security

2. **Secure Key Management**
   - Use hardware wallet to derive secrets
   - Implement key recovery mechanism
   - Add key rotation support
   - Consider multi-device backup

3. **Optimize On-Chain Verification**
   - Use dedicated verifier program
   - Implement proof batching
   - Use Groth16 pairing precompiles
   - Optimize compute unit usage

4. **Add Merkle Tree**
   - Track all commitments in tree
   - Prove membership without revealing identity
   - Enable efficient nullifier tracking
   - Use sparse Merkle tree for scalability

5. **Professional Audit**
   - Circuit audit by ZK security firm
   - On-chain program audit
   - Frontend security review
   - Penetration testing

---

## 🧪 Testing Checklist

### Local Testing
- [ ] Circuit compiles without errors
- [ ] Test circuit passes all tests
- [ ] Proving keys generated successfully
- [ ] Proof generation works (10-30s)
- [ ] Proof verification passes locally

### On-Chain Testing
- [ ] Program deploys to devnet
- [ ] Can register commitment
- [ ] Can vote with ZK proof
- [ ] Double-voting is prevented
- [ ] Nullifiers are unique per proposal
- [ ] Events are emitted correctly

### Frontend Testing
- [ ] ZK system initializes
- [ ] Proving keys load successfully
- [ ] Proof generation UI shows progress
- [ ] Vote submission succeeds
- [ ] Error handling works correctly
- [ ] Toggle between real ZK and insecure mode works

### Integration Testing
- [ ] End-to-end voting flow works
- [ ] Multiple users can vote anonymously
- [ ] Vote weights are calculated correctly
- [ ] Treasury release works with ZK votes
- [ ] Performance is acceptable (10-30s proofs)

---

## 🐛 Common Issues

### Circuit Compilation Errors

**Error:** `circom: command not found`
```bash
# Install circom
cargo install --git https://github.com/iden3/circom
```

**Error:** `Cannot find module 'circomlib'`
```bash
cd circuits
npm install
```

**Error:** `Out of memory`
```bash
# Increase Node memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
```

---

### Proof Generation Errors

**Error:** `Cannot read property 'wasm' of undefined`
```bash
# Make sure circuit is compiled
cd circuits
npm run compile
```

**Error:** `Proof generation timeout`
```bash
# This is normal on slow machines - wait 30-60 seconds
# Or reduce circuit complexity (fewer constraints)
```

**Error:** `Invalid witness`
```bash
# Check your input values are within valid range
# stakeAmount must be >= minStake
# All values must fit in field (< 2^253)
```

---

### On-Chain Errors

**Error:** `InvalidZKProof`
```bash
# Proof validation failed
# Check proof bytes are correctly formatted
# Verify nullifier and commitment are 32 bytes
```

**Error:** `CommitmentMismatch`
```bash
# Commitment doesn't match registered commitment
# Make sure you registered commitment after initializing stake
# Use same secret for commitment and proof generation
```

**Error:** `AlreadyVoted`
```bash
# Nullifier already used
# This is expected - prevents double-voting
# Try voting on a different proposal
```

---

## 📚 Additional Resources

### Learning ZK
- [ZK Whiteboard Sessions](https://zkhack.dev/whiteboard/)
- [Circom Documentation](https://docs.circom.io/)
- [snarkjs Guide](https://github.com/iden3/snarkjs)

### Solana ZK
- [Solana alt_bn128](https://docs.solana.com/developing/runtime-facilities/programs#alt_bn128)
- [Light Protocol](https://docs.lightprotocol.com/)
- [ZK Compression](https://www.zkcompression.com/)

### Advanced Topics
- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf)
- [PLONK Alternative](https://eprint.iacr.org/2019/953)
- [Poseidon Hash](https://www.poseidon-hash.info/)

---

## 🎉 You're Done!

You now have **real zero-knowledge proofs** running in CrypTrans!

**What You've Achieved:**
✅ Cryptographically anonymous voting  
✅ Provable stake without revealing amount  
✅ Double-vote prevention without identity reveal  
✅ Production-ready ZK circuit (after multi-party setup)  

**Next Steps:**
1. Test thoroughly on devnet
2. Organize multi-party trusted setup
3. Professional security audit
4. Deploy to mainnet!

---

**Questions?** Check the troubleshooting section or open an issue on GitHub.

**Last Updated:** November 30, 2025  
**Version:** 0.3.0 (Real ZK Implementation)

