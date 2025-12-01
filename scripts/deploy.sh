#!/bin/bash

# CrypTrans Deployment Script
echo "🚀 Deploying CrypTrans to Solana..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Build the program
echo -e "${YELLOW}Building program...${NC}"
anchor build

if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

# Deploy to devnet
echo -e "${YELLOW}Deploying to devnet...${NC}"
anchor deploy --provider.cluster devnet

if [ $? -ne 0 ]; then
    echo "Deployment failed!"
    exit 1
fi

# Copy IDL
echo -e "${YELLOW}Copying IDL to frontend...${NC}"
node scripts/copy-idl.js

# Get program ID
PROGRAM_ID=$(solana address -k target/deploy/cryptrans-keypair.json)
echo -e "${GREEN}✓ Program deployed!${NC}"
echo -e "${GREEN}Program ID: ${PROGRAM_ID}${NC}"

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Update PROGRAM_ID in app/src/App.js to: ${PROGRAM_ID}"
echo "2. Create and mint SPL token"
echo "3. Update MINT_ADDRESS in app/src/App.js"
echo "4. cd app && npm install && npm start"

