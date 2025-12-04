#!/bin/bash

# CrypTrans API Deployment Script
# Deploys API to Vercel

set -e

echo "🚀 Deploying CrypTrans API to Vercel"
echo "===================================="

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

cd api

echo "📦 Building API..."
npm run build

echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ API deployed successfully!"
echo ""
echo "Next: Deploy frontend and test end-to-end"
