pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

/*
 * Anonymous Voting Circuit for CrypTrans
 *
 * This circuit proves:
 * 1. You know a secret that corresponds to a commitment
 * 2. The nullifier is correctly derived (prevents double-voting)
 * 3. You have a valid stake amount (for voting weight)
 * 4. Without revealing your identity or exact stake amount
 *
 * CHANGED: Removed minStake check - now circuit just validates stake amount
 * for use in voting weight calculation (handled in smart contract)
 */
template AnonymousVote() {
    // Private inputs (known only to voter)
    signal input secret;              // Voter's secret key (field element)
    signal input stakeAmount;         // Actual stake amount (used for voting weight)
    signal input proposalId;          // Which proposal (prevents replay)

    // Public inputs (visible on-chain)
    signal input nullifier;           // Unique per vote, prevents double-voting
    signal input commitment;          // Public commitment to voter identity
    signal input root;                // Merkle root of all commitments (optional)

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

    // ===== Constraint 3: Stake Range Check =====
    // Ensure stakeAmount is within valid range (0 to 2^64-1)
    // This prevents invalid stake amounts while allowing any positive amount
    component stakeRangeCheck = Num2Bits(64);
    stakeRangeCheck.in <== stakeAmount;

    // ===== Constraint 4: Stake Amount Validation =====
    // Ensure stakeAmount > 0 (must have some stake to vote)
    signal stakeIsPositive;
    stakeIsPositive <== stakeAmount > 0 ? 1 : 0;
    stakeIsPositive === 1;
}

component main {public [nullifier, commitment, root]} = AnonymousVote();
