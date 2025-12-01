const snarkjs = require('snarkjs');
const { buildPoseidon } = require('circomlibjs');
const fs = require('fs');
const path = require('path');

/**
 * Proof generation utilities for CrypTrans anonymous voting
 */

const WASM_PATH = path.join(__dirname, 'vote_js', 'vote.wasm');
const ZKEY_PATH = path.join(__dirname, 'vote_final.zkey');
const VKEY_PATH = path.join(__dirname, 'verification_key.json');

// Cache Poseidon instance
let poseidon = null;

async function initPoseidon() {
  if (!poseidon) {
    poseidon = await buildPoseidon();
  }
  return poseidon;
}

/**
 * Hash a value using Poseidon (ZK-friendly hash)
 * @param {Array<BigInt|string|number>} inputs - Values to hash
 * @returns {string} - Hash as decimal string
 */
async function poseidonHash(inputs) {
  const p = await initPoseidon();
  const hash = p(inputs.map(x => BigInt(x)));
  return p.F.toString(hash);
}

/**
 * Generate a commitment from a secret
 * @param {string|BigInt} secret - User's secret key
 * @returns {string} - Commitment as decimal string
 */
async function generateCommitment(secret) {
  return poseidonHash([BigInt(secret)]);
}

/**
 * Generate a nullifier for a proposal
 * @param {string|BigInt} secret - User's secret key
 * @param {string|BigInt} proposalId - Proposal ID
 * @returns {string} - Nullifier as decimal string
 */
async function generateNullifier(secret, proposalId) {
  return poseidonHash([BigInt(secret), BigInt(proposalId)]);
}

/**
 * Generate a ZK proof for anonymous voting
 * @param {Object} inputs
 * @param {string|BigInt} inputs.secret - User's secret key
 * @param {string|BigInt} inputs.stakeAmount - User's stake amount
 * @param {string|BigInt} inputs.proposalId - Proposal ID
 * @param {string|BigInt} inputs.minStake - Minimum stake required
 * @param {string|BigInt} [inputs.root] - Merkle root (optional, defaults to 0)
 * @returns {Promise<Object>} - Proof and public signals
 */
async function generateProof(inputs) {
  console.log('Generating ZK proof...');

  // Calculate nullifier and commitment
  const nullifier = await generateNullifier(inputs.secret, inputs.proposalId);
  const commitment = await generateCommitment(inputs.secret);

  // Prepare circuit inputs
  const circuitInputs = {
    secret: inputs.secret.toString(),
    stakeAmount: inputs.stakeAmount.toString(),
    proposalId: inputs.proposalId.toString(),
    nullifier: nullifier,
    commitment: commitment,
    minStake: inputs.minStake.toString(),
    root: (inputs.root || 0).toString(),
  };

  console.log('Circuit inputs prepared:', {
    ...circuitInputs,
    secret: '[HIDDEN]',
    stakeAmount: '[HIDDEN]',
  });

  try {
    // Generate witness and proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInputs,
      WASM_PATH,
      ZKEY_PATH
    );

    console.log('✅ Proof generated successfully!');

    return {
      proof: {
        pi_a: [proof.pi_a[0], proof.pi_a[1]],
        pi_b: [
          [proof.pi_b[0][0], proof.pi_b[0][1]],
          [proof.pi_b[1][0], proof.pi_b[1][1]]
        ],
        pi_c: [proof.pi_c[0], proof.pi_c[1]],
      },
      publicSignals: {
        nullifier: publicSignals[0],
        commitment: publicSignals[1],
        minStake: publicSignals[2],
        root: publicSignals[3],
        isValid: publicSignals[4],
      },
      // Include raw for debugging
      raw: {
        proof,
        publicSignals,
      }
    };

  } catch (error) {
    console.error('❌ Proof generation failed:', error);
    throw error;
  }
}

/**
 * Verify a proof locally (for testing)
 * @param {Object} proof - The proof object
 * @param {Array} publicSignals - Public signals array
 * @returns {Promise<boolean>} - True if valid
 */
async function verifyProof(proof, publicSignals) {
  try {
    const vKey = JSON.parse(fs.readFileSync(VKEY_PATH, 'utf8'));
    
    const isValid = await snarkjs.groth16.verify(
      vKey,
      publicSignals,
      proof
    );

    console.log(isValid ? '✅ Proof valid!' : '❌ Proof invalid!');
    return isValid;

  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

/**
 * Export proof to Solana-compatible format
 * @param {Object} proof - Proof from generateProof
 * @returns {Object} - Solana-compatible proof format
 */
function formatProofForSolana(proof) {
  // Convert proof elements to format expected by Solana program
  return {
    a: proof.proof.pi_a,
    b: proof.proof.pi_b,
    c: proof.proof.pi_c,
    nullifier: Array.from(Buffer.from(proof.publicSignals.nullifier.slice(0, 32))),
    commitment: Array.from(Buffer.from(proof.publicSignals.commitment.slice(0, 32))),
  };
}

/**
 * Generate a random secret for a new user
 * @returns {string} - Random secret as decimal string
 */
function generateRandomSecret() {
  const crypto = require('crypto');
  const randomBytes = crypto.randomBytes(31); // 31 bytes to stay within field
  return BigInt('0x' + randomBytes.toString('hex')).toString();
}

module.exports = {
  generateProof,
  verifyProof,
  generateCommitment,
  generateNullifier,
  poseidonHash,
  formatProofForSolana,
  generateRandomSecret,
};

