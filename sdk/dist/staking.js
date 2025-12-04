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
exports.StakingClient = void 0;
const web3_js_1 = require("@solana/web3.js");
const anchor = __importStar(require("@coral-xyz/anchor"));
class StakingClient {
    constructor(client) {
        this.client = client;
    }
    async getStakeInfo(userAddress) {
        try {
            const program = this.client.getProgram();
            if (!program) {
                throw new Error('Program not initialized - IDL not loaded');
            }
            const [stakePda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('stake'), userAddress.toBuffer()], program.programId);
            // TODO: Fetch stake account when IDL is loaded
            // const stake = await program.account.stake.fetch(stakePda);
            // return stake as StakeInfo;
            console.log('Stake PDA:', stakePda.toString());
            return null; // Placeholder until IDL is loaded
        }
        catch (error) {
            console.error('Failed to fetch stake info:', error);
            return null;
        }
    }
    async initializeStake(user) {
        try {
            const program = this.client.getProgram();
            if (!program) {
                throw new Error('Program not initialized - IDL not loaded');
            }
            const [stakePda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('stake'), user.toBuffer()], program.programId);
            const tx = await program.methods
                .initializeStake()
                .accounts({
                stake: stakePda,
                user,
                systemProgram: web3_js_1.SystemProgram.programId
            })
                .transaction();
            return await this.client.sendTransaction(tx);
        }
        catch (error) {
            console.error('Failed to initialize stake:', error);
            return {
                signature: '',
                confirmed: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async stakeTokens(user, amount) {
        try {
            const program = this.client.getProgram();
            if (!program) {
                throw new Error('Program not initialized - IDL not loaded');
            }
            const [stakePda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('stake'), user.toBuffer()], program.programId);
            const tx = await program.methods
                .stakeTokens(new anchor.BN(amount))
                .accounts({
                stake: stakePda,
                user
            })
                .transaction();
            return await this.client.sendTransaction(tx);
        }
        catch (error) {
            console.error('Failed to stake tokens:', error);
            return {
                signature: '',
                confirmed: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
exports.StakingClient = StakingClient;
//# sourceMappingURL=staking.js.map