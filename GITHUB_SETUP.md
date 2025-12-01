# 📦 GitHub Repository Setup Guide

## Step-by-Step GitHub Setup

### 1. Create GitHub Repository

1. Go to [GitHub](https://github.com)
2. Click the **+** icon in top right
3. Select **New repository**
4. Fill in details:
   - **Repository name**: `cryptrans`
   - **Description**: `CrypTrans: Embodying Cypherpunk and Extropian Visions - A decentralized governance platform on Solana`
   - **Visibility**: Public or Private
   - **DO NOT** initialize with README (we already have one)
5. Click **Create repository**

### 2. Initialize Local Git Repository

Open terminal in your project directory (`C:\Users\KHK89\cryptrans`) and run:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: CrypTrans - Cypherpunk governance platform"
```

### 3. Connect to GitHub

Replace `YOUR_USERNAME` with your actual GitHub username:

```bash
# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/cryptrans.git

# Verify remote
git remote -v
```

### 4. Push to GitHub

```bash
# Push to main branch
git branch -M main
git push -u origin main
```

If you're prompted for credentials:
- **Username**: Your GitHub username
- **Password**: Use a [Personal Access Token](https://github.com/settings/tokens) instead of password

### 5. Configure GitHub Repository Settings

#### Enable GitHub Pages (Optional)
1. Go to repository **Settings** > **Pages**
2. Source: Select `gh-pages` branch (after deploying frontend)
3. Save

#### Add Topics
1. Go to repository main page
2. Click ⚙️ (gear icon) next to About
3. Add topics: `solana`, `blockchain`, `web3`, `cypherpunk`, `governance`, `defi`, `cryptocurrency`

#### Create Description
Add this to repository description:
```
🔐 Decentralized governance platform embodying cypherpunk & extropian ideals | Built on Solana | ZK-proofs | PoW anti-spam | Smart contracts
```

### 6. Set Up Repository Protection (Recommended)

1. Go to **Settings** > **Branches**
2. Add branch protection rule for `main`:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass
   - ✅ Include administrators

### 7. Add GitHub Secrets (For CI/CD)

1. Go to **Settings** > **Secrets and variables** > **Actions**
2. Add these secrets (click **New repository secret**):
   - `SOLANA_DEVNET_PRIVATE_KEY`: Your deployment wallet private key (base58)
   - `VERCEL_TOKEN`: Your Vercel token (for automated deployments)

⚠️ **NEVER commit private keys to the repository!**

---

## Complete Setup Commands

```bash
# Navigate to project directory
cd C:\Users\KHK89\cryptrans

# Initialize git
git init

# Add all files
git add .

# Initial commit
git commit -m "Initial commit: CrypTrans - Embodying Cypherpunk & Extropian Visions

- Solana smart contracts with PoW anti-spam
- ZK-proof anonymous voting
- React frontend with wallet integration
- Demurrage mechanism for ethical token circulation
- Transhuman project focus: longevity, augmentation, expansion"

# Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/cryptrans.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Creating GitHub Personal Access Token

If you need a token for authentication:

1. Go to [GitHub Settings](https://github.com/settings/tokens)
2. Click **Generate new token** > **Generate new token (classic)**
3. Name: `CrypTrans Deployment`
4. Select scopes:
   - ✅ `repo` (full control of private repositories)
   - ✅ `workflow` (if using GitHub Actions)
5. Click **Generate token**
6. **COPY THE TOKEN IMMEDIATELY** (you won't see it again)
7. Use this token as your password when pushing

---

## Setting Up SSH (Alternative to HTTPS)

For easier authentication without tokens:

### 1. Generate SSH Key
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Press Enter to accept default location
# Enter passphrase (or leave empty)
```

### 2. Add to SSH Agent
```bash
# Windows (PowerShell)
Start-Service ssh-agent
ssh-add ~/.ssh/id_ed25519

# Mac/Linux
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

### 3. Add SSH Key to GitHub
```bash
# Copy public key to clipboard
# Windows
cat ~/.ssh/id_ed25519.pub | clip

# Mac
pbcopy < ~/.ssh/id_ed25519.pub

# Linux
cat ~/.ssh/id_ed25519.pub
```

Then:
1. Go to [GitHub SSH Settings](https://github.com/settings/keys)
2. Click **New SSH key**
3. Title: `CrypTrans Development`
4. Paste key
5. Click **Add SSH key**

### 4. Change Remote to SSH
```bash
git remote set-url origin git@github.com:YOUR_USERNAME/cryptrans.git
```

---

## .gitignore Best Practices

The project includes a comprehensive `.gitignore`. Verify it includes:

```
# Never commit these!
*.json  # Except specific ones (package.json, tsconfig.json, etc.)
.env
.env.local
*.key
id.json
*-keypair.json

# Build artifacts
target/
node_modules/
build/
dist/

# IDE
.vscode/
.idea/
```

---

## GitHub Actions CI/CD (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy CrypTrans

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm install
      - name: Build program
        run: anchor build
      - name: Run tests
        run: anchor test
```

---

## Branch Strategy

### Recommended Branches

1. **main** - Production-ready code
2. **develop** - Integration branch for features
3. **feature/*** - New features
4. **hotfix/*** - Emergency fixes

### Workflow

```bash
# Create feature branch
git checkout -b feature/new-voting-mechanism

# Make changes and commit
git add .
git commit -m "Add weighted voting mechanism"

# Push feature branch
git push origin feature/new-voting-mechanism

# Create Pull Request on GitHub
# After review, merge to main
```

---

## Repository README Badge Ideas

Add these to your README.md for a professional look:

```markdown
![Solana](https://img.shields.io/badge/Solana-14F195?style=for-the-badge&logo=solana&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Web3](https://img.shields.io/badge/Web3-F16822?style=for-the-badge&logo=web3.js&logoColor=white)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/YOUR_USERNAME/cryptrans.svg?style=social&label=Star)](https://github.com/YOUR_USERNAME/cryptrans)
```

---

## Updating Repository Information

After deployment, create a file `DEPLOYED_INFO.md`:

```markdown
# Deployment Information

## Devnet
- **Program ID**: `YOUR_PROGRAM_ID`
- **Token Mint**: `YOUR_MINT_ADDRESS`
- **Frontend**: https://cryptrans-devnet.vercel.app
- **Deployed**: 2025-11-30

## Mainnet
- **Program ID**: `TBD`
- **Token Mint**: `TBD`
- **Frontend**: https://cryptrans.app
- **Deployed**: TBD
```

---

## Quick Reference

### First Time Setup
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/cryptrans.git
git push -u origin main
```

### Regular Updates
```bash
git add .
git commit -m "Description of changes"
git push
```

### Check Status
```bash
git status
git log --oneline
```

---

## Next Steps After GitHub Setup

1. ✅ Repository created and pushed
2. [ ] Update README with actual GitHub username
3. [ ] Add GitHub badges
4. [ ] Set up GitHub Pages (if desired)
5. [ ] Configure branch protection
6. [ ] Add contributors (if team project)
7. [ ] Create first release/tag after testing
8. [ ] Share with community!

---

**Your GitHub repository will be at:**
`https://github.com/YOUR_USERNAME/cryptrans`

Remember to replace `YOUR_USERNAME` with your actual GitHub username throughout the repository!

