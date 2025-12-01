# Deployment Guide

## Devnet Deployment

### Step 1: Build Smart Contract

```bash
cd programs/cryptrans
cargo build-sbf
```

Check for any build errors. The contract should compile without warnings.

### Step 2: Deploy Contract

```bash
# Ensure you have devnet SOL
solana balance

# If needed, get more SOL
solana airdrop 5

# Deploy
solana program deploy target/sbf-solana-solana/release/cryptrans.so
```

**Save your Program ID** - it will be displayed in the output.

### Step 3: Initialize Config

Update the Program ID in `Anchor.toml`, then:

```bash
cd ../..
anchor run initialize
```

This sets up default governance parameters:
- voting_threshold: 1 SOL
- demurrage_rate: 2% annually
- proposal_duration: 1 week
- pow_difficulty: 2

### Step 4: Deploy Frontend

```bash
cd app

# Create environment file
cat > .env << EOF
REACT_APP_PROGRAM_ID=<your-program-id>
REACT_APP_NETWORK=devnet
EOF

# Install dependencies
npm install

# Build
npm run build

# Test locally
npm start
```

## Frontend Hosting

### Option 1: Vercel (Recommended)

```bash
cd app

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

Follow the prompts and select React as your framework.

### Option 2: Netlify

```bash
cd app

npm run build
npm install -g netlify-cli
netlify deploy --prod --dir=build
```

### Option 3: GitHub Pages

```bash
cd app

# Update package.json: add "homepage": "https://username.github.io/cryptrans"
npm run build
npm install -g gh-pages
gh-pages -d build
```

## Production Deployment

⚠️ **Before deploying to mainnet:**

1. ✅ Pass professional security audit
2. ✅ Test extensively on devnet
3. ✅ Implement Groth16 verifier
4. ✅ Legal compliance review
5. ✅ Setup emergency pause mechanism

### Mainnet Steps

```bash
# Switch to mainnet
solana config set --url mainnet-beta

# Ensure sufficient SOL (~10 SOL for deployment)
solana balance

# Deploy contract
solana program deploy target/sbf-solana-solana/release/cryptrans.so

# Update configuration with mainnet values
# (adjust voting_threshold, demurrage_rate, etc.)

# Deploy frontend to production domain
vercel --prod
```

## Configuration Management

### Update Governance Parameters

```bash
# Edit parameters
anchor run update-config \
  --voting-threshold 1000000000 \
  --demurrage-rate 200 \
  --proposal-duration 604800 \
  --pow-difficulty 3
```

### Monitor On-Chain

```bash
# View program logs
solana logs <PROGRAM_ID>

# Check account sizes
solana account <PROGRAM_ID>

# View transaction details
solana tx <TRANSACTION_SIGNATURE>
```

## Troubleshooting

### Build Errors

**Error**: `cannot find type 'Program' in module 'anchor_lang'`
- Solution: Update Anchor: `cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked`

**Error**: `failed to resolve: use of undeclared crate`
- Solution: Run `cargo update` and rebuild

### Deployment Errors

**Error**: `insufficient balance`
- Solution: Request more SOL via airdrop

**Error**: `program already exists`
- Solution: Use a different program ID or account

### Frontend Issues

**Error**: `can't find module 'idl'`
- Solution: Copy IDL: `cp target/idl/cryptrans.json app/src/idl/`

**Error**: `REACT_APP_PROGRAM_ID is undefined`
- Solution: Create `.env` file with correct Program ID

## Monitoring

### Health Checks

```bash
# Test program can be called
anchor test --skip-local-validator

# Check frontend connectivity
curl http://localhost:3000

# Verify wallet connectivity
# Try connecting wallet in UI
```

### Common Metrics to Monitor

- Transaction success rate
- Average proposal creation time
- Vote submission latency
- Treasury balance
- Active proposal count
- Total stake in system

## Rollback Procedure

If issues occur:

1. **Stop accepting transactions** - Update frontend to disable voting
2. **Analyze issue** - Check logs and blockchain explorer
3. **Fix contract** - If needed, deploy new version to new program ID
4. **Update frontend** - Point to fixed program
5. **Notify users** - Explain changes

## Security Checklist

- [ ] Code reviewed by security expert
- [ ] Audit completed and passed
- [ ] Test coverage > 80%
- [ ] All error codes documented
- [ ] Admin keys stored securely
- [ ] Emergency pause tested
- [ ] Monitoring setup in place
- [ ] Incident response plan created

## Maintenance

### Regular Tasks

- Monitor transaction success rates
- Review voting patterns
- Update PoW difficulty if needed
- Archive old proposals
- Backup configuration
- Check for security updates

### Quarterly Review

- Audit proposal execution
- Review governance parameters
- Update documentation
- Security assessment
- Performance analysis

## Support

For deployment issues:
1. Check logs: `solana logs <PROGRAM_ID>`
2. Review error documentation
3. Visit [Solana Discord](https://discord.gg/solana)
4. Open GitHub issue with error details
