const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Generate proving and verification keys for the circuit
 * This performs a trusted setup using Groth16
 */

const PTAU_PATH = path.join(__dirname, 'powersOfTau28_hez_final_21.ptau');
const R1CS_PATH = path.join(__dirname, 'vote.r1cs');
const WASM_PATH = path.join(__dirname, 'vote_js', 'vote.wasm');
const ZKEY_0_PATH = path.join(__dirname, 'vote_0000.zkey');
const ZKEY_FINAL_PATH = path.join(__dirname, 'vote_final.zkey');
const VKEY_PATH = path.join(__dirname, 'verification_key.json');

async function setup() {
  console.log('🔧 Starting trusted setup for CrypTrans vote circuit...');
  console.log('');

  // Check if Powers of Tau exists
  if (!fs.existsSync(PTAU_PATH)) {
    console.error('❌ Powers of Tau file not found!');
    console.log('Run: npm run powers');
    process.exit(1);
  }

  // Check if circuit is compiled
  if (!fs.existsSync(R1CS_PATH)) {
    console.error('❌ Circuit not compiled!');
    console.log('Run: npm run compile');
    process.exit(1);
  }

  try {
    // Step 1: Generate initial zkey
    console.log('Step 1/5: Generating initial proving key...');
    await snarkjs.zKey.newZKey(R1CS_PATH, PTAU_PATH, ZKEY_0_PATH);
    console.log('✅ Initial zkey generated');
    console.log('');

    // Step 2: Contribute randomness (Phase 2 of trusted setup)
    console.log('Step 2/5: Contributing randomness to proving key...');
    console.log('Enter your name for attribution (or press Enter):');
    
    // For automated setup, use a default name
    // In production, you'd want multiple parties to contribute
    const contributorName = process.env.CONTRIBUTOR_NAME || 'CrypTrans Initial Setup';
    const contributorEntropy = Math.random().toString() + Date.now().toString();
    
    await snarkjs.zKey.contribute(
      ZKEY_0_PATH,
      ZKEY_FINAL_PATH,
      contributorName,
      contributorEntropy
    );
    console.log(`✅ Contribution added by: ${contributorName}`);
    console.log('');

    // Step 3: Export verification key
    console.log('Step 3/5: Exporting verification key...');
    const vKey = await snarkjs.zKey.exportVerificationKey(ZKEY_FINAL_PATH);
    fs.writeFileSync(VKEY_PATH, JSON.stringify(vKey, null, 2));
    console.log('✅ Verification key exported');
    console.log('');

    // Step 4: Verify the final zkey
    console.log('Step 4/5: Verifying proving key...');
    const verification = await snarkjs.zKey.verifyFromR1cs(R1CS_PATH, PTAU_PATH, ZKEY_FINAL_PATH);
    if (verification) {
      console.log('✅ Proving key verification passed!');
    } else {
      throw new Error('Proving key verification failed!');
    }
    console.log('');

    // Step 5: Print circuit information
    console.log('Step 5/5: Circuit information:');
    const { stdout } = await execAsync(`snarkjs r1cs info ${R1CS_PATH}`);
    console.log(stdout);

    // Cleanup intermediate file
    if (fs.existsSync(ZKEY_0_PATH)) {
      fs.unlinkSync(ZKEY_0_PATH);
    }

    console.log('');
    console.log('🎉 Setup complete!');
    console.log('');
    console.log('Generated files:');
    console.log(`  ✅ ${ZKEY_FINAL_PATH}`);
    console.log(`  ✅ ${VKEY_PATH}`);
    console.log(`  ✅ ${WASM_PATH}`);
    console.log('');
    console.log('⚠️  IMPORTANT: For production, you should:');
    console.log('1. Run a multi-party computation ceremony');
    console.log('2. Have multiple independent parties contribute randomness');
    console.log('3. Use at least 10+ contributors for security');
    console.log('');
    console.log('Next step: Test with npm run test');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

setup();

