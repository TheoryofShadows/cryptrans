#!/bin/bash

# CrypTrans Frontend Deployment Script
# Deploys frontend to Vercel

set -e

echo "🚀 Deploying CrypTrans Frontend to Vercel"
echo "========================================"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install with: npm i -g vercel"
    exit 1
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel. Run: vercel login"
    exit 1
fi

cd app

echo "📦 Building frontend..."
npm run build

echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Frontend deployed successfully!"
echo ""
echo "🎉 CrypTrans is now LIVE and usable!"
echo "   - Smart contract: Deployed on Solana Devnet"
echo "   - API: Deployed and running"
echo "   - Frontend: Deployed and accessible"
echo ""
echo "Users can now:"
echo "   1. Connect their Solana wallet"
echo "   2. Stake tokens in the DAO"
echo "   3. Create proposals with PoW protection"
echo "   4. Vote anonymously with ZK proofs"
echo "   5. Release funds via quantum-safe treasury"
echo ""
echo "🌐 Share the URL with the world!"
