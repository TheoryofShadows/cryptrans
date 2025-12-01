const { generateProof, verifyProof, generateCommitment, generateNullifier, generateRandomSecret } = require('./prover');

/**
 * Test the ZK circuit with sample inputs
 */

async function testCircuit() {
  console.log('🧪 Testing CrypTrans Anonymous Vote Circuit\n');

  // Generate a random secret for the test user
  const secret = generateRandomSecret();
  console.log('Generated secret:', secret.substring(0, 20) + '...');

  // Test parameters
  const stakeAmount = BigInt(5_000_000_000); // 5 tokens
  const proposalId = BigInt(1701234567890); // Timestamp-based ID
  const minStake = BigInt(1_000_000_000); // 1 token minimum

  console.log('\n📊 Test Parameters:');
  console.log('  Stake Amount:', stakeAmount.toString(), 'lamports (5 tokens)');
  console.log('  Proposal ID:', proposalId.toString());
  console.log('  Min Stake:', minStake.toString(), 'lamports (1 token)');

  // Generate commitment and nullifier
  console.log('\n🔑 Generating commitment and nullifier...');
  const commitment = await generateCommitment(secret);
  const nullifier = await generateNullifier(secret, proposalId);
  
  console.log('  Commitment:', commitment.substring(0, 40) + '...');
  console.log('  Nullifier:', nullifier.substring(0, 40) + '...');

  // Generate proof
  console.log('\n⚡ Generating zero-knowledge proof...');
  const startTime = Date.now();
  
  try {
    const result = await generateProof({
      secret,
      stakeAmount,
      proposalId,
      minStake,
      root: 0,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Proof generated in ${elapsed}s`);

    // Verify the proof
    console.log('\n🔍 Verifying proof...');
    const isValid = await verifyProof(
      result.raw.proof,
      result.raw.publicSignals
    );

    if (isValid) {
      console.log('\n✅ SUCCESS! Proof is valid!\n');
      console.log('Public Signals:');
      console.log('  Nullifier:', result.publicSignals.nullifier);
      console.log('  Commitment:', result.publicSignals.commitment);
      console.log('  Min Stake:', result.publicSignals.minStake);
      console.log('  Is Valid:', result.publicSignals.isValid);
      
      console.log('\n📝 Proof size:', JSON.stringify(result.proof).length, 'bytes');
      
      console.log('\n🎉 Zero-knowledge proof system is working correctly!');
      console.log('\nWhat this proves:');
      console.log('  ✅ User has secret that generates the commitment');
      console.log('  ✅ User has >= 1 token staked');
      console.log('  ✅ Nullifier prevents double-voting on this proposal');
      console.log('  ✅ All without revealing the secret or exact stake amount!');
      
      return true;
    } else {
      console.error('\n❌ FAILED! Proof is invalid!');
      return false;
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    return false;
  }
}

// Test with insufficient stake
async function testInsufficientStake() {
  console.log('\n\n🧪 Testing with INSUFFICIENT stake (should fail)...\n');

  const secret = generateRandomSecret();
  const stakeAmount = BigInt(500_000_000); // 0.5 tokens (INSUFFICIENT)
  const proposalId = BigInt(Date.now());
  const minStake = BigInt(1_000_000_000); // 1 token required

  console.log('  Stake Amount:', stakeAmount.toString(), 'lamports (0.5 tokens)');
  console.log('  Min Stake:', minStake.toString(), 'lamports (1 token)');
  console.log('  Expected: Should FAIL constraint check\n');

  try {
    await generateProof({
      secret,
      stakeAmount,
      proposalId,
      minStake,
      root: 0,
    });

    console.log('❌ UNEXPECTED: Proof generated (should have failed!)');
    return false;

  } catch (error) {
    console.log('✅ EXPECTED: Proof generation failed (stake too low)');
    console.log('   Error:', error.message.substring(0, 100) + '...');
    return true;
  }
}

// Run tests
async function main() {
  const test1 = await testCircuit();
  const test2 = await testInsufficientStake();

  console.log('\n\n' + '='.repeat(60));
  console.log('TEST RESULTS');
  console.log('='.repeat(60));
  console.log('Valid proof with sufficient stake:', test1 ? '✅ PASS' : '❌ FAIL');
  console.log('Invalid proof with insufficient stake:', test2 ? '✅ PASS' : '❌ FAIL');
  console.log('='.repeat(60));

  if (test1 && test2) {
    console.log('\n🎉 All tests passed! Ready for integration.\n');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Please review.\n');
    process.exit(1);
  }
}

main();

