# 🪟 Windows-Specific Setup for CrypTrans

## Issue: Anchor Doesn't Work Well on Windows

Anchor Framework has limited Windows support. Here are your options:

---

## ✅ **Option A: Use WSL (Windows Subsystem for Linux) - RECOMMENDED**

### Step 1: Install WSL

Open PowerShell as Administrator and run:

```powershell
wsl --install
```

Restart your computer when prompted.

### Step 2: Open Ubuntu (WSL)

1. Open **Ubuntu** from Start Menu (installed with WSL)
2. Set up username and password when prompted

### Step 3: Install Dependencies in WSL

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Solana
sh -c "$(curl -sSfL https://release.solana.com/v1.18.17/install)"
export PATH="/home/$USER/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked

# Install build essentials
sudo apt-get install -y build-essential pkg-config libssl-dev libudev-dev
```

### Step 4: Access Your Project in WSL

```bash
# Navigate to your Windows files
cd /mnt/c/Users/KHK89/cryptrans

# Now you can use Anchor commands
anchor build
anchor deploy
```

---

## 🔄 **Option B: Use Docker**

### Step 1: Install Docker Desktop

Download from: https://www.docker.com/products/docker-desktop/

### Step 2: Create Dockerfile

Already created in your project. Run:

```powershell
cd C:\Users\KHK89\cryptrans
docker build -t cryptrans .
docker run -it -v ${PWD}:/workspace cryptrans
```

---

## 🌐 **Option C: Deploy Frontend Only (Skip Anchor)**

If you just want to test the frontend with a pre-deployed program:

### Step 1: Use Test Program ID

The project already has a placeholder program ID. You can:

1. Skip building the Solana program for now
2. Focus on the frontend development
3. Test with the existing configuration

### Step 2: Run Frontend

```powershell
cd C:\Users\KHK89\cryptrans\app
npm install
npm start
```

**Note**: Without deploying the program, transactions won't work, but you can develop the UI.

---

## 🚀 **Option D: Use GitHub Codespaces / Gitpod (Cloud Development)**

### GitHub Codespaces

1. Push your project to GitHub
2. Open in Codespaces (cloud Linux environment)
3. All tools work perfectly
4. Free tier available

### Gitpod

1. Push to GitHub
2. Open: `https://gitpod.io/#https://github.com/YOUR_USERNAME/cryptrans`
3. Full Linux environment in browser
4. Free tier available

---

## 📋 **Current Status & Next Steps**

Based on your terminal output:

✅ **Completed:**
- Solana wallet exists
- Network set to devnet  
- Token created: `4yurBrXdRttHjqMV2zBCeX69cGiwTWiYVHf7cMmh8NfH`

❌ **Issues:**
- Anchor not working on Windows
- Airdrop failed (network issue)
- Wrong directory for commands

### **Immediate Next Steps:**

#### 1. Navigate to Correct Directory
```powershell
cd C:\Users\KHK89\cryptrans
```

#### 2. Complete Token Setup
```powershell
# Create account for your token
spl-token create-account 4yurBrXdRttHjqMV2zBCeX69cGiwTWiYVHf7cMmh8NfH

# Mint 1 billion tokens
spl-token mint 4yurBrXdRttHjqMV2zBCeX69cGiwTWiYVHf7cMmh8NfH 1000000000

# Check balance
spl-token balance 4yurBrXdRttHjqMV2zBCeX69cGiwTWiYVHf7cMmh8NfH
```

#### 3. Fix Airdrop (if still needed)
```powershell
# Try again
solana airdrop 2

# Or use the web faucet:
# https://faucet.solana.com/
```

#### 4. Choose WSL or Cloud Option for Anchor

**For WSL (Recommended):**
```powershell
# Install WSL
wsl --install
# Restart computer
# Then open Ubuntu and follow Step 3 above
```

**For Cloud (Easiest):**
1. Push to GitHub first
2. Use Gitpod or Codespaces
3. Everything works out of the box

---

## 🔍 **Detailed Commands for Your Specific Situation**

### Fix #1: You Already Have a Wallet
Your wallet path: `C:\Users\KHK89\NFTSol\temp-keypair.json`

```powershell
# Check your wallet address
solana address

# Check balance
solana balance
```

### Fix #2: Network Airdrop Issues
If `solana airdrop` fails, use the web faucet:

1. Get your address: `solana address`
2. Go to: https://faucet.solana.com/
3. Paste your address
4. Request airdrop

### Fix #3: Build Without Anchor (Temporary)

For now, you can:
1. Use the pre-configured IDL in the project
2. Focus on frontend development
3. Deploy the program later via WSL/Cloud

```powershell
cd C:\Users\KHK89\cryptrans\app

# Update App.js with your token mint
# Line 15: const MINT_ADDRESS = new PublicKey('4yurBrXdRttHjqMV2zBCeX69cGiwTWiYVHf7cMmh8NfH');

npm install
npm start
```

---

## 🎯 **Recommended Path for Windows Users**

### **Best Option: WSL**

1. Install WSL: `wsl --install` (in Admin PowerShell)
2. Restart computer
3. Open Ubuntu
4. Install all tools in Ubuntu (follow Step 3 above)
5. Access your project: `cd /mnt/c/Users/KHK89/cryptrans`
6. Run Anchor commands in Ubuntu
7. Run frontend in Windows (it works fine)

### **Fastest Option: Cloud**

1. Push project to GitHub
2. Open in Gitpod: `https://gitpod.io/#YOUR_GITHUB_REPO_URL`
3. Everything works immediately
4. Deploy from cloud

---

## 🆘 **Quick Help**

### Check What You Have

```powershell
# Check Solana
solana --version
solana config get
solana balance

# Check tokens
spl-token --version
spl-token accounts

# Check Node
node --version
npm --version
```

### Your Token Info

**Mint Address**: `4yurBrXdRttHjqMV2zBCeX69cGiwTWiYVHf7cMmh8NfH`

Save this! You'll need it for the frontend configuration.

---

## 📞 **Need More Help?**

- **For WSL**: https://learn.microsoft.com/en-us/windows/wsl/install
- **For Docker**: https://docs.docker.com/desktop/install/windows-install/
- **For Gitpod**: https://www.gitpod.io/docs/introduction

---

**Next Action**: Choose WSL (best) or Cloud (easiest) and continue from there!

