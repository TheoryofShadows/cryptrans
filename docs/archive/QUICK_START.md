# ⚡ CrypTrans Quick Start Guide

**Get up and running in 15 minutes!**

---

## 🎯 Prerequisites Check

Run these commands to verify you have everything installed:

```bash
node --version    # Need: v20+
rust --version    # Need: 1.70+
solana --version  # Need: 1.18+
anchor --version  # Need: 0.30+
```

❌ **Missing something?** See [DEPLOYMENT.md](./DEPLOYMENT.md) for installation instructions.

---

## 🚀 5-Step Deployment

### Step 1: Setup Wallet (2 min)

```bash
# Create wallet
solana-keygen new

# Switch to devnet
solana config set --url devnet

# Get free SOL
solana airdrop 2

# Verify balance
solana balance
```

### Step 2: Build & Deploy Program (3 min)

```bash
# Build
anchor build

# Deploy to devnet
anchor deploy

# Save the Program ID that's displayed!
```

### Step 3: Create Token (2 min)

```bash
# Create governance token
spl-token create-token --decimals 9
# Save the Mint Address!

# Create account
spl-token create-account <YOUR_MINT_ADDRESS>

# Mint 1 billion tokens
spl-token mint <YOUR_MINT_ADDRESS> 1000000000
```

### Step 4: Configure Frontend (3 min)

```bash
# Copy IDL
cp target/idl/cryptrans.json app/src/idl/

# Edit app/src/App.js - Update these lines:
# const PROGRAM_ID = new PublicKey('YOUR_PROGRAM_ID');
# const MINT_ADDRESS = new PublicKey('YOUR_MINT_ADDRESS');
```

### Step 5: Launch App (5 min)

```bash
cd app
npm install
npm start

# App opens at http://localhost:3000
# Connect your wallet and test!
```

---

## 🧪 Testing (5 min)

1. **Connect Wallet**: Click "Connect Wallet" (use Phantom or Solflare on devnet)
2. **Initialize Stake**: Click "Initialize Stake Account"
3. **Stake Tokens**: Enter amount and stake
4. **Create Proposal**: 
   - Enter description (e.g., "Fund BCI Research")
   - Enter funding amount
   - Click "Generate Proof of Work" (wait ~10-30 sec)
   - Click "Create Proposal" - Save the ID!
5. **Vote**: Enter proposal ID and vote anonymously

---

## 🌐 Deploy to Production (10 min)

### Deploy Frontend to Vercel

```bash
cd app

# Install Vercel
npm i -g vercel

# Deploy
vercel

# Follow prompts, then:
vercel --prod
```

**That's it!** Your app is live at `https://your-app.vercel.app`

---

## 📊 What You Just Built

✅ **Solana Smart Contract** with:
- Proof of Work anti-spam
- ZK-proof anonymous voting
- Stake-based governance
- Demurrage mechanism

✅ **React Frontend** with:
- Wallet integration (Phantom/Solflare)
- PoW generator
- Anonymous voting
- Modern UI

---

## 🐛 Troubleshooting

### "Insufficient funds"
```bash
solana airdrop 2
```

### "anchor: command not found"
```bash
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
```

### "Wallet not connecting"
- Install Phantom or Solflare browser extension
- Switch wallet to Devnet
- Refresh page

### "PoW taking too long"
Edit `app/src/App.js`:
```javascript
const POW_DIFFICULTY = 3; // Reduce from 4 to 3
```

---

## 📚 Next Steps

- 📖 Read full docs: [README.md](./README.md)
- 🚀 Detailed deployment: [DEPLOYMENT.md](./DEPLOYMENT.md)
- 🐙 Push to GitHub: [GITHUB_SETUP.md](./GITHUB_SETUP.md)
- 🧪 Add tests in `tests/`
- 🎨 Customize UI in `app/src/App.css`
- 🔐 Get security audit before mainnet!

---

## 🎯 Command Cheat Sheet

```bash
# Build & Deploy
anchor build                    # Build program
anchor deploy                   # Deploy to devnet
anchor test                     # Run tests

# Solana
solana config get              # Show configuration
solana balance                 # Check balance
solana airdrop 2               # Get devnet SOL
solana logs PROGRAM_ID         # View logs

# SPL Token
spl-token create-token         # Create token mint
spl-token balance MINT         # Check balance
spl-token transfer MINT AMT TO # Transfer tokens

# Frontend
cd app && npm start            # Run dev server
npm run build                  # Build for production
vercel --prod                  # Deploy to Vercel
```

---

## 💡 Pro Tips

1. **Save IDs**: Keep Program ID and Mint Address in a safe place
2. **Test First**: Always test on devnet before mainnet
3. **Git Commits**: Commit after each working step
4. **Check Explorer**: View transactions at [Solana Explorer](https://explorer.solana.com/?cluster=devnet)
5. **Monitor Logs**: Keep `solana logs` running in separate terminal

---

## ⏱️ Time Breakdown

- ✅ Prerequisites: Already installed
- ⏱️ Wallet setup: 2 min
- ⏱️ Build & deploy: 3 min
- ⏱️ Create token: 2 min
- ⏱️ Configure frontend: 3 min
- ⏱️ Launch & test: 5 min
- ⏱️ Deploy to Vercel: 10 min

**Total: ~25 minutes** (excluding prerequisites)

---

## 🎉 Success Checklist

- [ ] Wallet created and funded
- [ ] Program deployed to devnet
- [ ] Token created and minted
- [ ] Frontend configured with IDs
- [ ] App running locally
- [ ] Can stake tokens
- [ ] Can create proposal (PoW works)
- [ ] Can vote anonymously
- [ ] Deployed to Vercel/Netlify

---

## 🆘 Need Help?

- 📖 Full docs: [README.md](./README.md)
- 🐛 Issues: [GitHub Issues](https://github.com/YOUR_USERNAME/cryptrans/issues)
- 💬 Discord: [Your Discord Link]

---

**Welcome to the cypherpunk revolution! 🔐⚡**

*Built with 💙 for a decentralized future*

