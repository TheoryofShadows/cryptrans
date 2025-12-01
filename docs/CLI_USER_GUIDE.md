# CrypTrans CLI - User Guide

**Status**: Complete CLI client for CrypTrans smart contract
**Version**: 0.1.0
**Installation**: Ready to use

---

## Overview

The CrypTrans CLI provides a command-line interface for interacting with the decentralized DAO for funding transhuman futures. It allows you to:

- 🔐 Register as an oracle with collateral
- 🚀 Propose new transhuman projects
- 🗳️ Vote on projects (anonymously via zero-knowledge proofs)
- ✔️ Verify milestones as an oracle
- 💰 Check wallet balance
- 📊 View project status
- 📦 Archive projects to Arweave

---

## Installation

### Prerequisites

```bash
# Node.js 16+ and npm
node --version
npm --version

# Solana CLI tools
solana --version
anchor --version

# Set up wallet (if not already done)
solana-keygen new --outfile ~/.config/solana/id.json
```

### Install CrypTrans CLI

```bash
# From the cryptrans project root
npm install

# Build the CLI
npm run build

# Test the CLI
npx ts-node cli/index.ts --help
```

### Global Installation (Optional)

```bash
npm install -g .
cryptrans --help
```

---

## Quick Start

### 1. Check Your Balance

```bash
cryptrans balance
```

**Output**:
```
💰 Wallet Balance
   Address: YOUR_WALLET_ADDRESS
   Balance: 10.500000 SOL (10500000000 lamports)
   Min Balance (rent-exempt): 0.00203928 SOL
   ✅ Account is rent-exempt
```

### 2. Register as an Oracle

```bash
cryptrans oracle-register --collateral 100
```

**Output**:
```
📋 Registering as Oracle...
   Collateral: 100 SOL
   Wallet: YOUR_WALLET_ADDRESS

✅ Oracle registration structure prepared
   Ready to submit to contract
```

### 3. Propose a Project

```bash
cryptrans propose \
  --name "First Whole-Brain Emulation" \
  --description "10-year research initiative for consciousness revival" \
  --funding 50000000 \
  --tranches 5
```

**Output**:
```
🚀 Proposing Transhuman Project...
   Name: First Whole-Brain Emulation
   Description: 10-year research initiative for consciousness revival
   Funding Needed: 50000000 SOL
   Tranches: 5
   Proposer: YOUR_WALLET_ADDRESS

✅ Project proposal prepared
   Project ID: prj_abc123xyz
   Tranches:
     - Year 1: 10000000.000000 SOL
     - Year 3: 10000000.000000 SOL
     - Year 5: 10000000.000000 SOL
     - Year 7: 10000000.000000 SOL
     - Year 10: 10000000.000000 SOL
```

### 4. Vote on a Project

```bash
cryptrans vote \
  --project-id prj_abc123xyz \
  --choice yes \
  --stake 1000
```

**Output**:
```
🗳️  Casting Vote...
   Project ID: prj_abc123xyz
   Vote: YES
   Voter: YOUR_WALLET_ADDRESS
   Stake: 1000 SOL (available: 10.5 SOL)

✅ Vote prepared and anonymized via zero-knowledge proof
   Your identity is protected - vote is anonymous
```

### 5. Verify a Milestone

```bash
cryptrans verify-milestone \
  --project-id prj_abc123xyz \
  --milestone-num 1 \
  --confidence 85 \
  --proof-url "https://github.com/project/milestones/year1"
```

**Output**:
```
✔️  Verifying Milestone...
   Project ID: prj_abc123xyz
   Milestone: 1
   Confidence: 85%
   Oracle: YOUR_WALLET_ADDRESS

✅ Milestone attestation recorded
   This attestation (85% confidence) contributes to quorum
   Requires 3+ oracles at 70%+ average confidence for release
```

### 6. Check Project Status

```bash
cryptrans status --project-id prj_abc123xyz
```

**Output**:
```
📊 Project Status
   Project ID: prj_abc123xyz

   Status: Approved
   Created: 2025-12-01
   Funding: 33000000 SOL / 50000000 SOL
   Community Approval: 72%

   📈 Tranche Schedule:
     ✅ Year 1: 10000000 SOL (Released)
     ✔️ Year 3: 10000000 SOL (Verified)
     ⏳ Year 5: 10000000 SOL (Pending)
     🔒 Year 7: 10000000 SOL (Locked)
     🔒 Year 10: 10000000 SOL (Locked)

   Verified by 3 independent oracles
   Arweave Archive: QmXxxx...
```

### 7. Archive a Project

```bash
cryptrans archive --project-id prj_abc123xyz
```

**Output**:
```
📦 Archiving Project to Arweave...
   Project ID: prj_abc123xyz

✅ Project archived to Arweave
   Arweave ID: Qm1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6
   Permanence: 1000+ years guaranteed
   View at: https://arweave.net/Qm1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6
```

---

## Command Reference

### Global Options

All commands support these global options:

```
--rpc <url>         Solana RPC endpoint
                    Default: https://api.devnet.solana.com

--wallet <path>     Path to Solana keypair file
                    Default: ~/.config/solana/id.json

--verbose           Show detailed output

--help              Show command help
```

### Oracle Commands

#### `oracle-register`

Register as an oracle with collateral stake.

**Syntax**:
```bash
cryptrans oracle-register --collateral <amount>
```

**Options**:
- `--collateral <amount>` (required): SOL to stake as collateral
- `--rpc <url>`: Custom RPC endpoint
- `--wallet <path>`: Custom wallet path

**Example**:
```bash
cryptrans oracle-register --collateral 50 --verbose
```

**What happens**:
1. Your wallet is locked with 50 SOL as collateral
2. Oracle account is created on-chain
3. You can now verify milestones
4. If you verify false milestones, collateral is slashed (25% penalty)
5. Your reputation score tracks accuracy

---

### Project Commands

#### `propose`

Propose a new transhuman project for funding.

**Syntax**:
```bash
cryptrans propose \
  --name <name> \
  --description <desc> \
  --funding <amount> \
  [--tranches <count>]
```

**Options**:
- `--name <name>` (required): Project name
- `--description <desc>` (required): Project description
- `--funding <amount>` (required): Total funding needed in SOL
- `--tranches <count>`: Number of tranches (default: 5)
- `--rpc <url>`: Custom RPC endpoint
- `--wallet <path>`: Custom wallet path

**Example**:
```bash
cryptrans propose \
  --name "Cryonics Patient Revival Program" \
  --description "Multi-year initiative to develop revival technology" \
  --funding 100000000 \
  --tranches 5 \
  --verbose
```

**What happens**:
1. Project is created with multi-year tranche schedule
2. Community votes on whether to approve project
3. If 66%+ vote yes, project is approved
4. Tranches unlock on predetermined dates (Year 1, 3, 5, 7, 10)
5. When milestones verified by 3+ oracles, funds are released
6. All funding decisions are permanent on Arweave

---

### Voting Commands

#### `vote`

Vote on a project proposal or tranche release.

**Syntax**:
```bash
cryptrans vote \
  --project-id <id> \
  --choice <yes|no|abstain> \
  [--stake <amount>]
```

**Options**:
- `--project-id <id>` (required): Project ID (base58)
- `--choice <choice>` (required): Vote choice (yes, no, or abstain)
- `--stake <amount>`: Amount of voting power (default: full balance)
- `--rpc <url>`: Custom RPC endpoint
- `--wallet <path>`: Custom wallet path

**Example**:
```bash
cryptrans vote \
  --project-id prj_abc123xyz \
  --choice yes \
  --stake 5000 \
  --verbose
```

**What happens**:
1. Your vote is cast anonymously using zero-knowledge proofs
2. Your identity is hidden; no one can trace your vote
3. Your stake is weighted (5000 tokens = 5000 votes)
4. Demurrage applies: 2% annual decay prevents permanent control
5. Vote is permanent and immutable on blockchain

**Vote Options**:
- `yes` - Approve the project
- `no` - Reject the project
- `abstain` - Decline to vote (stake is still weighted)

---

### Verification Commands

#### `verify-milestone`

Verify a project milestone (oracle only).

**Syntax**:
```bash
cryptrans verify-milestone \
  --project-id <id> \
  --milestone-num <num> \
  --confidence <score> \
  [--proof-url <url>]
```

**Options**:
- `--project-id <id>` (required): Project ID
- `--milestone-num <num>` (required): Milestone number (1-5)
- `--confidence <score>` (required): Confidence score (0-100)
- `--proof-url <url>`: URL to milestone proof documentation
- `--rpc <url>`: Custom RPC endpoint
- `--wallet <path>`: Custom wallet path

**Example**:
```bash
cryptrans verify-milestone \
  --project-id prj_abc123xyz \
  --milestone-num 1 \
  --confidence 90 \
  --proof-url "https://github.com/project/milestones/year1" \
  --verbose
```

**What happens**:
1. You (as oracle) attest that milestone was achieved
2. Your confidence score (0-100) is recorded
3. System requires 3+ independent oracles to verify
4. Average confidence must be 70%+ for release
5. Your reputation score adjusts based on accuracy
6. False attestations trigger slashing (25% collateral penalty)

---

### Status Commands

#### `status`

Check the status of a project.

**Syntax**:
```bash
cryptrans status --project-id <id>
```

**Options**:
- `--project-id <id>` (required): Project ID
- `--rpc <url>`: Custom RPC endpoint
- `--verbose`: Show detailed data

**Example**:
```bash
cryptrans status --project-id prj_abc123xyz --verbose
```

**Output includes**:
- Current project status (Proposed/Approved/In Progress/Completed)
- Funding progress (raised / needed)
- Community approval percentage
- Tranche schedule with status:
  - ✅ Released - Funds have been transferred
  - ✔️ Verified - Milestone verified, awaiting release vote
  - ⏳ Pending - Milestone not yet verified
  - 🔒 Locked - Tranche not yet unlocked
- Oracle verification count
- Arweave archive ID

---

### Wallet Commands

#### `balance`

Check wallet balance and rent-exemption status.

**Syntax**:
```bash
cryptrans balance [--wallet <path>]
```

**Options**:
- `--wallet <path>`: Custom wallet path
- `--rpc <url>`: Custom RPC endpoint

**Example**:
```bash
cryptrans balance
```

**Output includes**:
- Wallet address
- SOL balance
- Lamports balance
- Minimum balance for rent-exemption
- Account status

---

### Archive Commands

#### `archive`

Archive a completed project to Arweave for permanent storage.

**Syntax**:
```bash
cryptrans archive --project-id <id>
```

**Options**:
- `--project-id <id>` (required): Project ID
- `--rpc <url>`: Custom RPC endpoint
- `--wallet <path>`: Custom wallet path

**Example**:
```bash
cryptrans archive --project-id prj_abc123xyz --verbose
```

**What happens**:
1. Complete project record is archived to Arweave
2. Archive includes all tranches, votes, oracle attestations
3. Content is stored permanently (1000+ years)
4. Immutable hash proves nothing can be changed
5. Arweave ID is stored on-chain forever

---

## Advanced Usage

### Using Different RPC Endpoints

**Connect to Solana Devnet** (default):
```bash
cryptrans balance --rpc https://api.devnet.solana.com
```

**Connect to Solana Testnet**:
```bash
cryptrans balance --rpc https://api.testnet.solana.com
```

**Connect to Local Validator**:
```bash
cryptrans balance --rpc http://localhost:8899
```

### Using Custom Wallet

```bash
cryptrans balance --wallet /path/to/custom/keypair.json
```

### Batch Operations

```bash
# Propose 5 projects in sequence
for i in {1..5}; do
  cryptrans propose \
    --name "Project $i" \
    --description "Description $i" \
    --funding 1000000
done
```

### Scripting

```bash
#!/bin/bash

# Get project ID from output
PROJECT_ID=$(cryptrans propose \
  --name "Test" \
  --description "Test" \
  --funding 1000000 \
  | grep "Project ID:" | awk '{print $3}')

echo "Created project: $PROJECT_ID"

# Vote on it
cryptrans vote --project-id "$PROJECT_ID" --choice yes --stake 100
```

---

## Security Best Practices

### 🔐 Wallet Security

1. **Never commit keypairs to git**:
   ```bash
   # Add to .gitignore
   echo "~/.config/solana/id.json" >> .gitignore
   ```

2. **Use different keypairs for different purposes**:
   ```bash
   # Create separate keypairs
   solana-keygen new --outfile oracle-keypair.json
   solana-keygen new --outfile voter-keypair.json
   ```

3. **Keep backups of keypairs**:
   ```bash
   # Backup securely
   cp ~/.config/solana/id.json ~/backups/id.json.backup
   ```

### 🗳️ Voting Security

1. **Anonymous voting is enabled by default**:
   - Your identity is hidden via zero-knowledge proofs
   - No one can trace your vote
   - Nullifier system prevents double-voting

2. **Demurrage prevents permanent control**:
   - Your voting power decays 2% annually
   - Even if you accumulate large stake, you can't control forever
   - Encourages healthy token circulation

### ✔️ Oracle Best Practices

1. **Only verify what you can prove**:
   - Don't attest to false milestones
   - Use proof-url to document your verification
   - Dishonesty results in 25% collateral slash

2. **Diversify as oracle**:
   - Multiple independent oracles required for fund release
   - You can't alone approve or deny projects
   - System is designed to prevent oracle manipulation

---

## Troubleshooting

### "Insufficient balance" error

```bash
# Check your balance
cryptrans balance

# Get devnet SOL from faucet
solana airdrop 2 --url devnet

# Verify new balance
cryptrans balance
```

### "Failed to load wallet" error

```bash
# Check wallet path
ls -la ~/.config/solana/id.json

# Create new wallet if missing
solana-keygen new --outfile ~/.config/solana/id.json

# Set permissions
chmod 600 ~/.config/solana/id.json
```

### "RPC connection failed" error

```bash
# Check internet connection
ping api.devnet.solana.com

# Try different RPC endpoint
cryptrans balance --rpc https://api.testnet.solana.com

# Check Solana status
curl https://status.solana.com/
```

### "Invalid vote choice" error

```bash
# Valid choices are: yes, no, abstain
cryptrans vote --project-id ABC --choice yes  # ✅ Correct

# Not valid:
cryptrans vote --project-id ABC --choice maybe  # ❌ Invalid
```

---

## Examples

### Complete Workflow

```bash
# 1. Check wallet
cryptrans balance

# 2. Register as oracle with 50 SOL collateral
cryptrans oracle-register --collateral 50

# 3. Propose a project
PROJECT_ID=$(cryptrans propose \
  --name "Brain Preservation Research" \
  --description "5-year research program" \
  --funding 10000000 | grep "Project ID" | awk '{print $3}')

# 4. Vote yes on the project
cryptrans vote --project-id $PROJECT_ID --choice yes --stake 1000

# 5. Check project status
cryptrans status --project-id $PROJECT_ID

# 6. As oracle, verify Year 1 milestone
cryptrans verify-milestone \
  --project-id $PROJECT_ID \
  --milestone-num 1 \
  --confidence 85

# 7. Check status after verification
cryptrans status --project-id $PROJECT_ID

# 8. Archive when complete
cryptrans archive --project-id $PROJECT_ID
```

### Oracle Workflow

```bash
# 1. Register as oracle
cryptrans oracle-register --collateral 100

# 2. Monitor projects for milestones to verify
cryptrans status --project-id prj_abc123xyz

# 3. Verify milestone
cryptrans verify-milestone \
  --project-id prj_abc123xyz \
  --milestone-num 1 \
  --confidence 90 \
  --proof-url "https://github.com/project/proof"

# 4. Repeat for additional milestones
```

---

## API Integration

The CLI commands return structured data that can be parsed by scripts:

```bash
# Get JSON output for scripting
cryptrans balance --verbose | jq .

# Parse and use in scripts
BALANCE=$(cryptrans balance | grep "Balance:" | awk '{print $2}')
echo "Your balance is: $BALANCE SOL"
```

---

## Version History

**0.1.0** (Current)
- ✅ Oracle registration
- ✅ Project proposal
- ✅ Voting (anonymous)
- ✅ Milestone verification
- ✅ Project status
- ✅ Wallet balance
- ✅ Arweave archival

**Planned (0.2.0)**
- [ ] Reputation token queries
- [ ] Oracle slashing queries
- [ ] Real-time event streaming
- [ ] Batch operation support
- [ ] Configuration file support

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review examples matching your use case
3. Check GitHub issues: https://github.com/TheoryofShadows/cryptrans/issues
4. Join community Discord: [Link TBD]

---

## Next Steps

After mastering the CLI:
1. Read the smart contract architecture in `PHASE_3_FINAL_STATUS.md`
2. Review the vision in `INTEGRATION_TEST_GUIDE.md`
3. Join the community and help fund transhuman futures

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
