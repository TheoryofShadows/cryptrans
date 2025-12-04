#!/usr/bin/env node

/**
 * CrypTrans Devnet Testing Script
 * Tests basic functionality after deployment
 */

const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const fs = require('fs');

async function testDevnetDeployment() {
    console.log('🧪 CrypTrans Devnet Testing');
    console.log('===========================');

    // Connect to devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    console.log('✅ Connected to Solana Devnet');

    // Check program account
    const programId = new PublicKey('57wFcRcKLeU2WuUbadwXR56TtdgijAFQX8X73PqDURVn');

    try {
        const accountInfo = await connection.getAccountInfo(programId);
        if (accountInfo) {
            console.log('✅ Program deployed successfully!');
            console.log(`   Program ID: ${programId.toString()}`);
            console.log(`   Executable: ${accountInfo.executable}`);
            console.log(`   Owner: ${accountInfo.owner.toString()}`);
            console.log(`   Lamports: ${accountInfo.lamports / 1e9} SOL`);
            console.log(`   Data length: ${accountInfo.data.length} bytes`);
        } else {
            console.log('❌ Program not found on devnet');
            return;
        }
    } catch (error) {
        console.error('❌ Error checking program:', error.message);
        return;
    }

    // Test basic connection
    try {
        const slot = await connection.getSlot();
        console.log(`✅ Current slot: ${slot}`);
    } catch (error) {
        console.error('❌ Error getting slot:', error.message);
    }

    // Test wallet connection (if keypair exists)
    try {
        if (fs.existsSync(process.env.HOME + '/.config/solana/id.json')) {
            const keypairData = JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf8'));
            const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
            console.log(`✅ Wallet loaded: ${keypair.publicKey.toString()}`);

            const balance = await connection.getBalance(keypair.publicKey);
            console.log(`💰 Wallet balance: ${balance / 1e9} SOL`);
        }
    } catch (error) {
        console.log('⚠️  Wallet not available for testing');
    }

    console.log('');
    console.log('🎉 Devnet deployment verification complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Update API config to use devnet');
    console.log('2. Deploy API and frontend');
    console.log('3. Test governance flows with SDK/CLI');
}

// Run the test
testDevnetDeployment().catch(console.error);
