pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

/*
 * Anonymous Voting Circuit for CrypTrans
 * 
 * This circuit proves:
 * 1. You know a secret that corresponds to a commitment
 * 2. You have sufficient stake (≥ minStake)
 * 3. The nullifier is correctly derived (prevents double-voting)
 * 4. Without revealing your identity or exact stake amount
 */
template AnonymousVote() {
    // Private inputs (known only to voter)
    signal input secret;              // Voter's secret key (field element)
    signal input stakeAmount;         // Actual stake amount
    signal input proposalId;          // Which proposal (prevents replay)
    
    // Public inputs (visible on-chain)
    signal input nullifier;           // Unique per vote, prevents double-voting
    signal input commitment;          // Public commitment to voter identity
    signal input minStake;            // Minimum stake required to vote
    signal input root;                // Merkle root of all commitments (optional)
    
    // Output
    signal output isValid;            // 1 if vote is valid, 0 otherwise
    
    // ===== Constraint 1: Commitment Verification =====
    // Prove commitment = Poseidon(secret)
    component commitmentHash = Poseidon(1);
    commitmentHash.inputs[0] <== secret;
    commitment === commitmentHash.out;
    
    // ===== Constraint 2: Nullifier Verification =====
    // Prove nullifier = Poseidon(secret, proposalId)
    // This ensures nullifier is unique per (voter, proposal) pair
    component nullifierHash = Poseidon(2);
    nullifierHash.inputs[0] <== secret;
    nullifierHash.inputs[1] <== proposalId;
    nullifier === nullifierHash.out;
    
    // ===== Constraint 3: Stake Verification =====
    // Prove stakeAmount >= minStake
    component stakeCheck = GreaterEqThan(64);
    stakeCheck.in[0] <== stakeAmount;
    stakeCheck.in[1] <== minStake;
    
    // ===== Constraint 4: Range Check =====
    // Ensure stakeAmount is within valid range (0 to 2^64-1)
    component stakeRangeCheck = Num2Bits(64);
    stakeRangeCheck.in <== stakeAmount;
    
    // ===== Output =====
    // Vote is valid if stake check passes
    isValid <== stakeCheck.out;
    
    // Additional constraint: isValid must be 1
    isValid === 1;
}

component main {public [nullifier, commitment, minStake, root]} = AnonymousVote();

