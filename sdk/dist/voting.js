"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VotingClient = void 0;
const web3_js_1 = require("@solana/web3.js");
class VotingClient {
    constructor(client) {
        this.client = client;
    }
    async voteWithSTARK(proposalId, voter, proof, imageId) {
        try {
            const program = this.client.getProgram();
            if (!program) {
                throw new Error('Program not initialized - IDL not loaded');
            }
            const [proposalPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('proposal'), Buffer.from([proposalId])], program.programId);
            const [stakePda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('stake'), voter.toBuffer()], program.programId);
            const [voteRecordPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('vote'), Buffer.from([proposalId]), voter.toBuffer()], program.programId);
            const tx = await program.methods
                .voteWithStark(Array.from(imageId))
                .accounts({
                proposal: proposalPda,
                stake: stakePda,
                voteRecord: voteRecordPda,
                voter
            })
                .transaction();
            return await this.client.sendTransaction(tx);
        }
        catch (error) {
            console.error('Failed to vote with STARK:', error);
            return {
                signature: '',
                confirmed: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async registerCommitment(user, commitment) {
        try {
            const program = this.client.getProgram();
            if (!program) {
                throw new Error('Program not initialized - IDL not loaded');
            }
            const [stakePda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('stake'), user.toBuffer()], program.programId);
            const tx = await program.methods
                .registerCommitment(Array.from(commitment))
                .accounts({
                stake: stakePda,
                user
            })
                .transaction();
            return await this.client.sendTransaction(tx);
        }
        catch (error) {
            console.error('Failed to register commitment:', error);
            return {
                signature: '',
                confirmed: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
exports.VotingClient = VotingClient;
//# sourceMappingURL=voting.js.map