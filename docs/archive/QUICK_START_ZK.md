# Quick Start - Real Zero-Knowledge Proofs

Get CrypTrans running with **real ZK proofs** in under 30 minutes!

---

## 📋 Prerequisites

- [x] Circom 2.1.6+ installed
- [x] Node.js 18+ installed
- [x] Anchor & Solana CLI installed
- [x] 8GB+ RAM available
- [x] 500MB+ free disk space

---

## 🚀 Quick Setup (Copy & Paste)

### Step 1: Install Circom
```bash
# Install Rust if not already installed
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Circom
cargo install --git https://github.com/iden3/circom

# Verify
circom --version
```

### Step 2: Compile Circuit & Setup Keys
```bash
# Install dependencies
cd circuits
npm install

# Compile circuit
npm run compile

# Download Powers of Tau (60MB - be patient!)
cd ../zkproof
node download-ptau.js

# Generate proving keys (takes 2-5 minutes)
node setup.js

# Test everything works
node test-circuit.js
```

**Expected:** All tests pass ✅

### Step 3: Rebuild Solana Program
```bash
cd ..
anchor build
```

### Step 4: Deploy to Devnet
```bash
anchor deploy --provider.cluster devnet

# Copy the Program ID and update these files:
# - Anchor.toml
# - app/src/App-WithRealZK.js
```

### Step 5: Setup Frontend
```bash
# Copy ZK files to public directory
mkdir -p app/public/zkproof
cp zkproof/vote_final.zkey app/public/zkproof/
cp zkproof/verification_key.json app/public/zkproof/
cp -r zkproof/vote_js app/public/zkproof/

# Install dependencies
cd app
npm install

# Switch to ZK-enabled frontend
mv src/App.js src/App-Old.js
mv src/App-WithRealZK.js src/App.js

# Start the app
npm start
```

---

## 🧪 Test It Out

1. **Open** http://localhost:3000
2. **Connect** Phantom/Solflare wallet (set to devnet)
3. **Wait** for "🔒 ZK Proofs: Active" indicator
4. **Initialize** stake account (registers your ZK commitment)
5. **Stake** some tokens
6. **Create** a proposal (with PoW)
7. **Vote** anonymously (proof generation takes 10-30 seconds)
8. **Success!** Your vote is now cryptographically anonymous! 🎉

---

## ⚡ Quick Commands Reference

```bash
# Test circuit
cd zkproof && node test-circuit.js

# Rebuild program
anchor build

# Run Anchor tests
anchor test

# Start frontend
cd app && npm start

# Check ZK files are in place
ls app/public/zkproof/
# Should see: vote_final.zkey, verification_key.json, vote_js/
```

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| `circom: command not found` | Run: `cargo install --git https://github.com/iden3/circom` |
| `Cannot find module 'circomlib'` | Run: `cd circuits && npm install` |
| Proof generation slow | Normal! Takes 10-30s. Close other apps for faster generation |
| ZK system not initializing | Check browser console for errors. Make sure ZK files are in `app/public/zkproof/` |
| `CommitmentMismatch` error | Make sure you initialized stake AFTER enabling real ZK |

---

## 📊 What to Expect

| Operation | Time |
|-----------|------|
| Circuit compilation | 30-60s |
| Powers of Tau download | 1-2 min |
| Trusted setup | 2-5 min |
| First proof generation | 10-30s |
| Subsequent proofs | 10-30s |

**Total setup time:** 15-30 minutes (excluding downloads)

---

## ✅ Verification Checklist

After setup, verify these work:
- [ ] Circuit tests pass
- [ ] Program builds without errors
- [ ] Frontend shows "ZK Proofs: Active"
- [ ] Can initialize stake with commitment
- [ ] Can generate proofs (takes 10-30s)
- [ ] Can submit votes with ZK proof
- [ ] Double-voting is prevented
- [ ] Vote is recorded anonymously

---

## 🎉 You're Done!

You now have **real zero-knowledge proofs** running!

**What's Next?**
- Read `REAL_ZK_IMPLEMENTATION_SUMMARY.md` for details
- See `ZK_SETUP_GUIDE.md` for troubleshooting
- Follow `SECURITY.md` for mainnet preparation

---

**Questions?** Check the full documentation or open an issue on GitHub.

**Last Updated:** November 30, 2025

