# CrypTrans Deployment Guide

## Quick Start (Devnet Testing)

### Prerequisites
- Node.js 16+
- Solana CLI
- Anchor Framework
- Phantom/Solflare wallet with devnet SOL

### Step 1: Deploy Smart Contract

```bash
# 1. Build the Solana program
cd programs/cryptrans
cargo build-sbf  # or cargo build-bpf on older Solana versions

# 2. Set up wallet and airdrop
solana config set --url devnet
solana config set --keypair ~/.config/solana/id.json

# If no keypair exists, create one:
# solana-keygen new

# Airdrop devnet SOL
solana airdrop 10

# 3. Deploy to devnet
solana program deploy target/sbf-solana-solana/release/cryptrans.so

# Note the Program ID from deployment output
# Example: Program Id: B4Cq9PHn4wXA7k4mHdqeYVuRRQvZTGh9S6wqaiiSA1yK
```

### Step 2: Initialize Global Config

```bash
# Update the program ID in programs/cryptrans/src/lib.rs if needed
# Then use Anchor to call initialize_config

cd ../../

# Create initialization script (suggested)
cat > scripts/initialize.ts << 'EOF'
import * as anchor from "@coral-xyz/anchor";
import { Cryptrans } from "../target/types/cryptrans";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Cryptrans as Program<Cryptrans>;
  const admin = provider.wallet.publicKey;

  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const tx = await program.methods
    .initializeConfig(
      new anchor.BN(1_000_000_000),    // voting_threshold: 1 SOL
      new anchor.BN(200),               // demurrage_rate: 2%
      new anchor.BN(604800),            // proposal_duration: 1 week
      2                                 // pow_difficulty: 2
    )
    .accounts({
      config: configPda,
      admin: admin,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("✅ Config initialized! Tx:", tx);
}

main().catch(console.error);
EOF

# Run the script
anchor run initialize
```

### Step 3: Deploy Frontend

```bash
# 1. Navigate to frontend
cd app

# 2. Install dependencies
npm install

# 3. Create .env file
cat > .env << 'EOF'
REACT_APP_PROGRAM_ID=<paste-your-program-id-here>
REACT_APP_NETWORK=devnet
EOF

# 4. Copy ZK proof files (if you have them)
# These files should be in public/zkproof/:
# - vote.wasm
# - vote_final.zkey
# - verification_key.json

# If you don't have these, the app will run in fallback mode
# (you won't be able to generate real proofs yet)

# 5. Build
npm run build

# 6. Start development server
npm start

# 7. Open http://localhost:3000 in your browser
```

### Step 4: Test the Application

1. **Connect Wallet**
   - Click "Connect Wallet" and select Phantom/Solflare
   - Approve the connection request

2. **Create Stake Account**
   - Go to "Stake" tab
   - You need tokens in your wallet first
   - If needed, get a test token mint

3. **Stake Tokens**
   - Enter an amount (e.g., 1 SOL)
   - Click "Stake Tokens"
   - Wait for transaction confirmation

4. **Create a Proposal**
   - Go to "Create" tab
   - Enter description, funding amount, and PoW nonce
   - For testing, use nonce "0" (you may get "Invalid PoW" error - that's expected)
   - This is where PoW difficulty matters

5. **Vote Anonymously**
   - Go to "Proposals" tab
   - Click on any proposal
   - Click "Vote Yes (ANONYMOUS)"
   - Watch as ZK proof is generated and vote is submitted

6. **Check Blockchain Explorer**
   - View transactions at https://explorer.solana.com?cluster=devnet
   - Confirm proposal and vote records are created

---

## Important Notes

### Proof of Work Difficulty
The current `pow_difficulty` is set to 2, meaning the hash must start with "00" (2 leading zeros).

To generate a valid nonce:
```javascript
function generatePoW(description, difficulty) {
  let nonce = 0;
  while (true) {
    const data = `${description}${nonce}`;
    const hash = sha256(data);
    if (hash.startsWith("0".repeat(difficulty))) {
      return nonce;
    }
    nonce++;
  }
}

// Example:
const nonce = generatePoW("Build a space elevator", 2);
```

### Token Setup
If you want to properly test staking:

```bash
# 1. Create a test token mint
spl-token create-token

# 2. Create a token account
spl-token create-account <TOKEN_MINT>

# 3. Mint tokens to yourself
spl-token mint <TOKEN_MINT> 1000

# 4. Update the token mint address in App.js line 264
```

### ZK Proof System
Currently, the app generates simplified ZK proofs. For production:

1. Compile the Circom circuit:
```bash
cd circuits
circom vote.circom --r1cs --wasm --sym
```

2. Generate trusted setup (Powers of Tau):
```bash
# Download if not already present
npm run download-ptau

# Run trusted setup
npm run setup
```

3. The generated files go in `zkproof/`:
- `vote_final.zkey`
- `verification_key.json`
- `vote.wasm`

---

## Troubleshooting

### Issue: "Program Not Found"
**Solution**: Verify the Program ID matches what was deployed.
```bash
solana program show <PROGRAM_ID> --url devnet
```

### Issue: "Invalid PoW"
**Solution**: The nonce doesn't produce a hash with enough leading zeros.
Use the `generatePoW()` function above or simplify by changing `pow_difficulty` to 0.

### Issue: "Insufficient Treasury Balance"
**Solution**: This error means the proposal was funded but the treasury doesn't have enough tokens.
Create the proposal again or seed the treasury with tokens.

### Issue: "Proof Generation Failed"
**Solution**: ZK files (vote.wasm, vote_final.zkey) might not be available.
Check that they're in `app/public/zkproof/`

### Issue: "Cannot read property 'all' of undefined"
**Solution**: IDL might not be loaded. Ensure `app/src/idl/cryptrans.json` exists.
```bash
# Regenerate IDL from contract:
cd programs/cryptrans && anchor build
# This generates target/idl/cryptrans.json, copy to app/src/idl/
```

---

## Monitoring & Debugging

### Check Devnet Status
```bash
solana cluster-version --url devnet
solana balance --url devnet
```

### View Program Accounts
```bash
solana account <PROGRAM_ID> --url devnet
```

### Watch Proposal Creation
```bash
solana logs <PROGRAM_ID> --url devnet
```

This will show all program execution details as transactions come in.

### Check Browser Console
Open DevTools (F12) → Console to see:
- ZK proof generation logs
- Anchor transaction details
- Error messages

---

## Next: Production Deployment

Once you're satisfied with devnet testing:

### 1. Auditing
- Have the contract audited by security professionals
- Test all edge cases
- Load test the frontend

### 2. Mainnet Preparation
- Update `.env` to use `REACT_APP_NETWORK=mainnet-beta`
- Deploy program to mainnet
- Initialize config with mainnet parameters

### 3. Frontend Hosting
```bash
# Build for production
npm run build

# Deploy to Vercel (recommended):
vercel deploy

# Or to Netlify:
netlify deploy --prod --dir=build

# Or to traditional hosting:
scp -r build/* user@your-server:/var/www/cryptrans/
```

### 4. Domain & HTTPS
- Point your domain to the hosting service
- Enable HTTPS (required for wallet connections)
- Update wallet security policies if needed

---

## Architecture Reminder

```
┌─────────────────────┐
│   React Frontend    │
│  (localhost:3000)   │
└──────────┬──────────┘
           │
           │ Anchor + web3.js
           │
┌──────────▼──────────┐
│  Solana Devnet RPC  │
│(api.devnet.solana)  │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Smart Contract     │
│  (Program ID: B4...) │
│                     │
│  ├─ GlobalConfig    │
│  ├─ Stake Accounts  │
│  ├─ Proposals       │
│  └─ Vote Records    │
└─────────────────────┘
```

---

**Last Updated**: December 1, 2024
**Version**: 1.0
**Status**: Ready for Devnet Testing
