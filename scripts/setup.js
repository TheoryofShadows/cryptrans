const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up CrypTrans project...\n');

// Check if Solana CLI is installed
try {
  execSync('solana --version', { stdio: 'ignore' });
  console.log('✓ Solana CLI found');
} catch (error) {
  console.error('✗ Solana CLI not found. Please install from: https://docs.solana.com/cli/install-solana-cli-tools');
  process.exit(1);
}

// Check if Anchor is installed
try {
  execSync('anchor --version', { stdio: 'ignore' });
  console.log('✓ Anchor CLI found');
} catch (error) {
  console.error('✗ Anchor CLI not found. Please install from: https://www.anchor-lang.com/docs/installation');
  process.exit(1);
}

// Check wallet
try {
  const walletPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');
  if (fs.existsSync(walletPath)) {
    console.log('✓ Solana wallet found');
  } else {
    console.log('⚠ No wallet found. Creating new wallet...');
    execSync('solana-keygen new --no-bip39-passphrase', { stdio: 'inherit' });
  }
} catch (error) {
  console.log('⚠ Could not check wallet:', error.message);
}

// Set to devnet
try {
  execSync('solana config set --url devnet', { stdio: 'inherit' });
  console.log('✓ Network set to devnet');
} catch (error) {
  console.error('Error setting network:', error.message);
}

// Request airdrop
console.log('\n💰 Requesting devnet airdrop...');
try {
  execSync('solana airdrop 2', { stdio: 'inherit' });
  console.log('✓ Airdrop successful');
} catch (error) {
  console.log('⚠ Airdrop failed. You may need to request manually or wait a few minutes.');
}

console.log('\n✅ Setup complete! Next steps:');
console.log('1. Run "anchor build" to compile the program');
console.log('2. Run "anchor deploy" to deploy to devnet');
console.log('3. Run "npm run copy-idl" to copy IDL to frontend');
console.log('4. Update program ID and mint address in app/src/App.js');
console.log('5. cd app && npm install && npm start\n');

