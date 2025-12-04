"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.treasuryService = exports.TreasuryService = void 0;
const web3_js_1 = require("@solana/web3.js");
const solanaService_1 = require("./solanaService");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class TreasuryService {
    async getTreasuryInfo() {
        try {
            const connection = solanaService_1.solanaService.getConnection();
            const programId = new web3_js_1.PublicKey(config_1.config.programId);
            // Derive treasury PDA
            const [treasuryPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('treasury')], programId);
            const accountInfo = await connection.getAccountInfo(treasuryPda);
            if (!accountInfo) {
                throw new Error('Treasury account not found');
            }
            const balance = await connection.getBalance(treasuryPda);
            logger_1.logger.info('Retrieved treasury info');
            return {
                address: treasuryPda.toBase58(),
                balance: balance / 1e9,
                totalFunded: 0,
                totalReleased: 0,
                activeProposals: 0
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting treasury info', error);
            throw new Error('Failed to get treasury info');
        }
    }
    async releaseFunds(proposalId, amount, recipient) {
        try {
            logger_1.logger.info(`Releasing ${amount} tokens for proposal ${proposalId}`);
            // TODO: Create and send release_funds transaction
            return 'pending'; // Transaction signature
        }
        catch (error) {
            logger_1.logger.error('Error releasing funds', error);
            throw new Error('Failed to release funds');
        }
    }
    async releaseFundsQuantumSafe(proposalId, amount, recipient) {
        try {
            logger_1.logger.info(`Releasing ${amount} tokens with quantum-safe signatures`);
            // TODO: Create and send release_funds_quantum_safe transaction
            return 'pending'; // Transaction signature
        }
        catch (error) {
            logger_1.logger.error('Error releasing funds with quantum-safe signatures', error);
            throw new Error('Failed to release funds');
        }
    }
}
exports.TreasuryService = TreasuryService;
exports.treasuryService = new TreasuryService();
//# sourceMappingURL=treasuryService.js.map