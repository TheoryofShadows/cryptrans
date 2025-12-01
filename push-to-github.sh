#!/bin/bash

echo "=========================================="
echo "CrypTrans - Push to GitHub"
echo "=========================================="
echo ""
echo "This script will help you push your code to GitHub."
echo ""
echo "STEP 1: Create a new repository on GitHub"
echo "----------------------------------------"
echo "1. Go to: https://github.com/new"
echo "2. Repository name: cryptrans"
echo "3. Description: CrypTrans: Zero-Knowledge Solana Governance Platform with Circom Proofs"
echo "4. Make it PUBLIC"
echo "5. DO NOT initialize with README, gitignore, or license"
echo "6. Click 'Create repository'"
echo ""
read -p "Press Enter after you've created the repository on GitHub..."
echo ""
echo "STEP 2: Enter your GitHub username"
echo "----------------------------------------"
read -p "Your GitHub username: " USERNAME
echo ""
echo "STEP 3: Pushing to GitHub"
echo "----------------------------------------"

# Add remote
echo "Adding remote..."
git remote add origin https://github.com/$USERNAME/cryptrans.git 2>/dev/null || git remote set-url origin https://github.com/$USERNAME/cryptrans.git

# Rename branch to main
echo "Renaming branch to main..."
git branch -M main

# Push to GitHub
echo "Pushing to GitHub..."
git push -u origin main

echo ""
echo "=========================================="
echo "✅ SUCCESS!"
echo "=========================================="
echo ""
echo "Your repository is now available at:"
echo "https://github.com/$USERNAME/cryptrans"
echo ""
echo "Next steps:"
echo "1. Visit your repository on GitHub"
echo "2. Share it with others!"
echo "3. Follow ZK_SETUP_GUIDE.md to set up ZK proofs"
echo ""
