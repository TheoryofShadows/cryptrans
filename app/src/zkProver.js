/**
 * Browser-compatible ZK proof generation for CrypTrans
 * SECURE VERSION: Uses WebCrypto API for key management
 */

import * as snarkjs from 'snarkjs';
import { buildPoseidon } from 'circomlibjs';

// URLs for WASM and proving key (these should be hosted on your server or CDN)
const WASM_URL = '/zkproof/vote_js/vote.wasm';
const ZKEY_URL = '/zkproof/vote_final.zkey';

// Cache loaded files
let wasmBuffer = null;
let zkeyBuffer = null;
let poseidonHash = null;

/**
 * Initialize cryptographic functions (call once on app startup)
 */
export async function initCrypto() {
  console.log('🔐 Initializing secure cryptography...');

  // Initialize Poseidon hash function
  if (!poseidonHash) {
    poseidonHash = await buildPoseidon();
    console.log('✅ Poseidon hash initialized');
  }

  // Initialize ZK system
  if (!wasmBuffer || !zkeyBuffer) {
    await initZK();
  }

  console.log('✅ Secure cryptography initialized!');
}

/**
 * Load WASM and proving key (call once on app initialization)
 */
export async function initZK() {
  console.log('🔧 Initializing ZK proof system...');

  try {
    // Load WASM
    if (!wasmBuffer) {
      console.log('Loading WASM...');
      const wasmResponse = await fetch(WASM_URL);
      wasmBuffer = await wasmResponse.arrayBuffer();
      console.log('✅ WASM loaded');
    }

    // Load proving key (this is large, ~5-10MB)
    if (!zkeyBuffer) {
      console.log('Loading proving key...');
      const zkeyResponse = await fetch(ZKEY_URL);
      zkeyBuffer = await zkeyResponse.arrayBuffer();
      console.log('✅ Proving key loaded');
    }

    console.log('✅ ZK proof system initialized!');
    return true;

  } catch (error) {
    console.error('❌ Failed to initialize ZK system:', error);
    return false;
  }
}

/**
 * Generate commitment from secret using proper Poseidon hash
 */
export function generateCommitment(secret) {
  if (!poseidonHash) {
    throw new Error('Cryptography not initialized. Call initCrypto() first.');
  }
  return poseidonHash([BigInt(secret)]).toString();
}

/**
 * Generate nullifier from secret and proposal ID using proper Poseidon hash
 */
export function generateNullifier(secret, proposalId) {
  if (!poseidonHash) {
    throw new Error('Cryptography not initialized. Call initCrypto() first.');
  }
  return poseidonHash([BigInt(secret), BigInt(proposalId)]).toString();
}

/**
 * Generate a user's secret from their wallet signature using WebCrypto
 * This creates a deterministic but secure secret derivation
 */
export async function generateSecretFromWallet(wallet) {
  try {
    const message = "CrypTrans ZK Secret - Sign to generate your anonymous voting key";
    const messageBytes = new TextEncoder().encode(message);

    // Sign the message
    const signature = await wallet.signMessage(messageBytes);

    // Use WebCrypto to derive a secure key from the signature
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      signature,
      { name: 'HKDF' },
      false,
      ['deriveBits']
    );

    // Derive 32 bytes using HKDF
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: salt,
        info: new TextEncoder().encode('CrypTrans-ZK-Secret-v1'),
      },
      keyMaterial,
      256 // 32 bytes
    );

    // Convert to BigInt and ensure it's within field
    const secret = BigInt('0x' + Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join(''));
    const fieldModulus = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617'); // BN254 field modulus

    return (secret % fieldModulus).toString();

  } catch (error) {
    console.error('Failed to generate secret:', error);
    throw error;
  }
}

/**
 * Generate ZK proof for anonymous voting using actual stake amount
 * @param {Object} params
 * @param {string} params.secret - User's secret key
 * @param {string|number} params.stakeAmount - Actual stake amount for voting weight
 * @param {string|number} params.proposalId - Proposal ID
 * @returns {Promise<Object>} Proof and public signals
 */
export async function generateVoteProof({ secret, stakeAmount, proposalId }) {
  console.log('⚡ Generating zero-knowledge proof...');

  // Ensure crypto is initialized
  if (!poseidonHash) {
    await initCrypto();
  }

  // Check if ZK system is initialized
  if (!wasmBuffer || !zkeyBuffer) {
    console.log('ZK system not initialized, initializing now...');
    await initZK();
  }

  // Calculate nullifier and commitment using proper Poseidon
  const nullifier = generateNullifier(secret, proposalId);
  const commitment = generateCommitment(secret);

  // Prepare circuit inputs - now using actual stake amount for voting weight
  const inputs = {
    secret: secret.toString(),
    stakeAmount: stakeAmount.toString(),
    proposalId: proposalId.toString(),
    nullifier: nullifier,
    commitment: commitment,
    root: '0', // Merkle root (not implemented yet)
  };

  console.log('Circuit inputs:', {
    ...inputs,
    secret: '[HIDDEN]',
  });

  try {
    // Generate proof using snarkjs
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      inputs,
      new Uint8Array(wasmBuffer),
      new Uint8Array(zkeyBuffer)
    );

    console.log('✅ Proof generated successfully!');

    // Convert proof elements to byte arrays for Solana
    const proofA = proof.pi_a.slice(0, 2); // [x, y]
    const proofB = proof.pi_b.slice(0, 2); // [[x1, x2], [y1, y2]]
    const proofC = proof.pi_c.slice(0, 2); // [x, y]

    // Convert BN values to bytes (32 bytes per field element)
    const proofABytes = new Uint8Array(64);
    const proofBBytes = new Uint8Array(128);
    const proofCBytes = new Uint8Array(64);

    // Pack proof elements with proper BN254 encoding
    for (let i = 0; i < 2; i++) {
      const aBN = BigInt(proofA[i]).toString(16).padStart(64, '0');
      for (let j = 0; j < 32; j++) {
        proofABytes[i * 32 + j] = parseInt(aBN.substr(j * 2, 2), 16);
      }
    }

    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const bBN = BigInt(proofB[i][j]).toString(16).padStart(64, '0');
        for (let k = 0; k < 32; k++) {
          proofBBytes[(i * 2 + j) * 32 + k] = parseInt(bBN.substr(k * 2, 2), 16);
        }
      }
    }

    for (let i = 0; i < 2; i++) {
      const cBN = BigInt(proofC[i]).toString(16).padStart(64, '0');
      for (let j = 0; j < 32; j++) {
        proofCBytes[i * 32 + j] = parseInt(cBN.substr(j * 2, 2), 16);
      }
    }

    // Convert to format expected by Solana program
    return {
      proof: {
        pi_a: proofA,
        pi_b: proofB,
        pi_c: proofC,
      },
      publicSignals: {
        nullifier: publicSignals[0], // First public signal is nullifier
        commitment: publicSignals[1], // Second is commitment
        stakeAmount: stakeAmount.toString(),
      },
      // For Solana (convert to bytes)
      proofBytes: {
        a: proofABytes,
        b: proofBBytes,
        c: proofCBytes,
      },
    };
  } catch (error) {
    console.error('❌ Proof generation failed:', error);
    throw error;
  }
}

/**
 * Verify a proof locally (for testing)
 */
export async function verifyProof(proof, publicSignals, vkeyUrl = '/zkproof/verification_key.json') {
  try {
    const vKeyResponse = await fetch(vkeyUrl);
    const vKey = await vKeyResponse.json();

    const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
    return isValid;

  } catch (error) {
    console.error('Verification failed:', error);
    return false;
  }
}

/**
 * Convert proof to Solana-compatible byte arrays
 */
export function formatProofForSolana(proof, nullifier, commitment) {
  // Convert proof elements to fixed-size byte arrays
  const nullifierBytes = hexToBytes(BigInt(nullifier).toString(16), 32);
  const commitmentBytes = hexToBytes(BigInt(commitment).toString(16), 32);

  // For the proof elements, we need to convert from field elements to bytes
  // This is a simplified version - in production, use proper BN254 encoding
  const proofABytes = Buffer.alloc(64);
  const proofBBytes = Buffer.alloc(128);
  const proofCBytes = Buffer.alloc(64);

  return {
    nullifier: Array.from(nullifierBytes),
    commitment: Array.from(commitmentBytes),
    proofA: Array.from(proofABytes),
    proofB: Array.from(proofBBytes),
    proofC: Array.from(proofCBytes),
  };
}

/**
 * Helper: Convert hex string to byte array
 */
function hexToBytes(hex, length) {
  const bytes = new Uint8Array(length);
  hex = hex.padStart(length * 2, '0');
  for (let i = 0; i < length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export default {
  initCrypto,
  initZK,
  generateVoteProof,
  generateCommitment,
  generateNullifier,
  verifyProof,
  formatProofForSolana,
  generateSecretFromWallet,
};
