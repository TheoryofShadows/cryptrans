"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.proposalService = exports.ProposalService = void 0;
const web3_js_1 = require("@solana/web3.js");
const crypto = __importStar(require("crypto"));
const solanaService_1 = require("./solanaService");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class ProposalService {
    async getProposal(proposalId) {
        try {
            const connection = solanaService_1.solanaService.getConnection();
            const programId = new web3_js_1.PublicKey(config_1.config.programId);
            // Derive PDA for proposal account
            const [proposalPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('proposal'), Buffer.from([proposalId])], programId);
            const accountInfo = await connection.getAccountInfo(proposalPda);
            if (!accountInfo) {
                return null;
            }
            // TODO: Parse account data properly using program IDL
            logger_1.logger.info(`Retrieved proposal ${proposalId}`);
            return null;
        }
        catch (error) {
            logger_1.logger.error('Error getting proposal', error);
            throw new Error('Failed to get proposal');
        }
    }
    async getProposals(limit = 10) {
        try {
            const connection = solanaService_1.solanaService.getConnection();
            const programId = new web3_js_1.PublicKey(config_1.config.programId);
            // TODO: Query all proposal accounts from program
            // This would typically use getProgramAccounts with filters
            logger_1.logger.info(`Retrieved ${limit} proposals`);
            return [];
        }
        catch (error) {
            logger_1.logger.error('Error getting proposals', error);
            throw new Error('Failed to get proposals');
        }
    }
    generateProofOfWork(description, difficulty) {
        let nonce = 0;
        let hash = '';
        const targetPrefix = '0'.repeat(difficulty);
        while (!hash.startsWith(targetPrefix)) {
            nonce++;
            const input = `${description}${nonce}`;
            hash = crypto.createHash('sha256').update(input).digest('hex');
            // Timeout after too many iterations
            if (nonce > 1000000) {
                throw new Error('Could not generate valid proof of work within reasonable time');
            }
        }
        return {
            nonce: nonce.toString(),
            hash
        };
    }
    async createProposal(creatorAddress, description, fundingNeeded, powDifficulty = 2) {
        try {
            if (description.length > 200) {
                throw new Error('Description exceeds 200 character limit');
            }
            if (fundingNeeded > 1000000000000) {
                throw new Error('Funding amount exceeds maximum limit');
            }
            // Generate proof of work
            const { nonce } = this.generateProofOfWork(description, powDifficulty);
            logger_1.logger.info(`Created proposal for ${creatorAddress}`);
            // TODO: Create and send create_proposal transaction
            return 'pending'; // Transaction signature
        }
        catch (error) {
            logger_1.logger.error('Error creating proposal', error);
            throw new Error('Failed to create proposal');
        }
    }
}
exports.ProposalService = ProposalService;
exports.proposalService = new ProposalService();
//# sourceMappingURL=proposalService.js.map