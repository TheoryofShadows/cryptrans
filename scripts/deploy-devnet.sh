#!/bin/bash

# CrypTrans Devnet Deployment Script
# This script deploys CrypTrans to Solana Devnet

set -e

echo "🚀 CrypTrans Devnet Deployment"
echo "================================"

# Check if we're on devnet
echo "📋 Current Solana config:"
solana config get

# Check balance
echo "💰 Checking SOL balance..."
BALANCE=$(solana balance | awk '{print $1}')
echo "Current balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 1.0" | bc -l) )); then
    echo "❌ Insufficient SOL balance. Need at least 1 SOL for deployment."
    echo "💡 Request devnet SOL: solana airdrop 2"
    echo "   Or visit: https://faucet.solana.com/"
    exit 1
fi

echo "✅ Sufficient balance for deployment"

# Deploy the program
echo "📦 Deploying CrypTrans program to devnet..."
solana program deploy \
    --program-id target/deploy/cryptrans-keypair.json \
    target/deploy/cryptrans.so

echo "✅ Deployment successful!"

# Verify deployment
echo "🔍 Verifying deployment..."
sleep 10
solana program show 57wFcRcKLeU2WuUbadwXR56TtdgijAFQX8X73PqDURVn

echo "🎉 CrypTrans deployed to devnet!"
echo "Program ID: 57wFcRcKLeU2WuUbadwXR56TtdgijAFQX8X73PqDURVn"
echo ""
echo "Next steps:"
echo "1. Update API config with devnet program ID"
echo "2. Test basic functionality with CLI/SDK"
echo "3. Deploy API and frontend"
echo "4. Test end-to-end governance flow"
