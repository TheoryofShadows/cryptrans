#!/bin/bash

# Script to create governance token
echo "🪙 Creating CrypTrans Governance Token..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Ensure we're on devnet
solana config set --url devnet

# Create token
echo -e "${YELLOW}Creating token mint...${NC}"
MINT=$(spl-token create-token --decimals 9 | grep -oP 'Creating token \K\w+')

if [ -z "$MINT" ]; then
    echo "Failed to create token!"
    exit 1
fi

echo -e "${GREEN}✓ Token created: ${MINT}${NC}"

# Create account
echo -e "${YELLOW}Creating token account...${NC}"
spl-token create-account $MINT

# Mint tokens
echo -e "${YELLOW}Minting 1,000,000,000 tokens...${NC}"
spl-token mint $MINT 1000000000

echo -e "${GREEN}✓ Tokens minted successfully!${NC}"
echo -e "\n${YELLOW}Update this in app/src/App.js:${NC}"
echo "const MINT_ADDRESS = new PublicKey('${MINT}');"

