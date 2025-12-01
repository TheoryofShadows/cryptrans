#!/bin/bash
# CrypTrans GitHub Initialization Script for Unix/Mac/Linux

echo "========================================"
echo "  CrypTrans GitHub Setup"
echo "========================================"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "ERROR: Git is not installed!"
    echo "Please install Git from: https://git-scm.com/"
    exit 1
fi

echo "[1/5] Initializing Git repository..."
git init || { echo "ERROR: Failed to initialize repository"; exit 1; }

echo "[2/5] Adding all files..."
git add . || { echo "ERROR: Failed to add files"; exit 1; }

echo "[3/5] Creating initial commit..."
git commit -m "Initial commit: CrypTrans - Embodying Cypherpunk and Extropian Visions" || { echo "ERROR: Failed to commit"; exit 1; }

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Create repository on GitHub:"
echo "   https://github.com/new"
echo "   Name: cryptrans"
echo "   Description: CrypTrans: Embodying Cypherpunk and Extropian Visions"
echo ""
echo "2. Add remote and push:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/cryptrans.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. Start development:"
echo "   See QUICK_START.md for deployment instructions"
echo ""

