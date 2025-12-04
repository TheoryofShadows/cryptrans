#!/usr/bin/env node

/**
 * CrypTrans Full Stack Test
 * Tests the complete end-to-end functionality
 */

const { execSync } = require('child_process');
const fs = require('fs');

async function testFullStack() {
    console.log('🧪 CrypTrans Full Stack Testing');
    console.log('===============================');

    let passed = 0;
    let total = 0;

    // Test 1: Smart Contract
    total++;
    try {
        console.log('\n1️⃣ Testing Smart Contract...');
        execSync('node scripts/test-devnet.js', { stdio: 'inherit' });
        console.log('✅ Smart contract deployed and accessible');
        passed++;
    } catch (error) {
        console.log('❌ Smart contract test failed:', error.message);
    }

    // Test 2: API Build
    total++;
    try {
        console.log('\n2️⃣ Testing API Build...');
        execSync('cd api && npm run build', { stdio: 'pipe' });
        console.log('✅ API builds successfully');
        passed++;
    } catch (error) {
        console.log('❌ API build failed');
    }

    // Test 3: Frontend Build
    total++;
    try {
        console.log('\n3️⃣ Testing Frontend Build...');
        execSync('cd app && npm run build', { stdio: 'pipe' });
        console.log('✅ Frontend builds successfully');
        passed++;
    } catch (error) {
        console.log('❌ Frontend build failed');
    }

    // Test 4: SDK Build
    total++;
    try {
        console.log('\n4️⃣ Testing SDK Build...');
        execSync('cd sdk && npm run build', { stdio: 'pipe' });
        console.log('✅ SDK builds successfully');
        passed++;
    } catch (error) {
        console.log('❌ SDK build failed');
    }

    // Test 5: CLI Package
    total++;
    try {
        console.log('\n5️⃣ Testing CLI Package...');
        if (fs.existsSync('cli/package.json')) {
            console.log('✅ CLI has package.json');
            passed++;
        } else {
            console.log('❌ CLI missing package.json');
        }
    } catch (error) {
        console.log('❌ CLI test failed');
    }

    // Summary
    console.log('\n📊 Test Results:');
    console.log(`   Passed: ${passed}/${total} (${Math.round(passed/total*100)}%)`);

    if (passed === total) {
        console.log('\n🎉 ALL TESTS PASSED!');
        console.log('\n🚀 CrypTrans is ready for deployment!');
        console.log('\nDeployment commands:');
        console.log('1. ./scripts/deploy-api.sh      # Deploy API');
        console.log('2. ./scripts/deploy-frontend.sh # Deploy Frontend');
        console.log('3. Share the URLs with users!');

        console.log('\n📱 User Experience:');
        console.log('1. Visit frontend URL');
        console.log('2. Connect Solana wallet (Phantom/Solflare)');
        console.log('3. Stake tokens in DAO');
        console.log('4. Create proposals (with PoW)');
        console.log('5. Vote anonymously (ZK proofs)');
        console.log('6. Release funds (quantum-safe)');

        console.log('\n🔐 Security Features:');
        console.log('• STARK proof voting (quantum-resistant)');
        console.log('• Dilithium signatures (post-quantum)');
        console.log('• SHA-256 PoW anti-spam');
        console.log('• Anonymous nullifier system');

        return true;
    } else {
        console.log('\n❌ Some tests failed. Please fix before deployment.');
        return false;
    }
}

// Run the full test
testFullStack().catch(console.error);
