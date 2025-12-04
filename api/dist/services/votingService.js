"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.votingService = exports.VotingService = void 0;
const web3_js_1 = require("@solana/web3.js");
const solanaService_1 = require("./solanaService");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class VotingService {
    async getVote(proposalId, voter) {
        try {
            const connection = solanaService_1.solanaService.getConnection();
            const programId = new web3_js_1.PublicKey(config_1.config.programId);
            const voterPubkey = new web3_js_1.PublicKey(voter);
            // Derive PDA for vote record
            const [votePda] = web3_js_1.PublicKey.findProgramAddressSync([
                Buffer.from('vote'),
                Buffer.from([proposalId]),
                voterPubkey.toBuffer()
            ], programId);
            const accountInfo = await connection.getAccountInfo(votePda);
            if (!accountInfo) {
                return null;
            }
            // TODO: Parse account data properly
            logger_1.logger.info(`Retrieved vote for proposal ${proposalId}`);
            return null;
        }
        catch (error) {
            logger_1.logger.error('Error getting vote', error);
            throw new Error('Failed to get vote');
        }
    }
    async registerCommitment(userAddress, commitment) {
        try {
            logger_1.logger.info(`Registering commitment for ${userAddress}`);
            // TODO: Create and send register_commitment transaction
            return 'pending'; // Transaction signature
        }
        catch (error) {
            logger_1.logger.error('Error registering commitment', error);
            throw new Error('Failed to register commitment');
        }
    }
    async voteWithZK(proposalId, voter, nullifier, commitment, proof) {
        try {
            logger_1.logger.warn('Using deprecated Groth16 voting (quantum-vulnerable)');
            // TODO: Create and send vote_with_zk transaction
            return 'pending'; // Transaction signature
        }
        catch (error) {
            logger_1.logger.error('Error voting with ZK', error);
            throw new Error('Failed to vote');
        }
    }
    async voteWithSTARK(proposalId, voter, imageId) {
        try {
            logger_1.logger.info(`Voting with STARK proof for proposal ${proposalId}`);
            // TODO: Create and send vote_with_stark transaction
            return 'pending'; // Transaction signature
        }
        catch (error) {
            logger_1.logger.error('Error voting with STARK', error);
            throw new Error('Failed to vote with STARK');
        }
    }
}
exports.VotingService = VotingService;
exports.votingService = new VotingService();
//# sourceMappingURL=votingService.js.map