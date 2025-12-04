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
exports.CrypTransClient = void 0;
const web3_js_1 = require("@solana/web3.js");
const anchor = __importStar(require("@coral-xyz/anchor"));
const utils_1 = require("./utils");
class CrypTransClient {
    constructor(config, wallet) {
        this.config = config;
        this.connection = new web3_js_1.Connection(config.rpcUrl);
        this.provider = new anchor.AnchorProvider(this.connection, wallet, { commitment: 'confirmed' });
        // TODO: Initialize program with IDL when type issues are resolved
        // this.program = new anchor.Program(idl as any, config.programId, this.provider);
    }
    getConnection() {
        return this.connection;
    }
    getProvider() {
        return this.provider;
    }
    getProgram() {
        return this.program;
    }
    async sendTransaction(tx) {
        try {
            const signature = await this.provider.sendAndConfirm(tx);
            utils_1.logger.info(`Transaction confirmed: ${signature}`);
            return {
                signature,
                confirmed: true
            };
        }
        catch (error) {
            utils_1.logger.error('Transaction failed', error);
            return {
                signature: '',
                confirmed: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async getBalance(address) {
        const balance = await this.connection.getBalance(address);
        return balance / 1e9; // Convert to SOL
    }
    static async createFromPrivateKey(config, privateKey) {
        const keypair = typeof privateKey === 'string'
            ? web3_js_1.Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'))
            : web3_js_1.Keypair.fromSecretKey(privateKey);
        const wallet = new anchor.Wallet(keypair);
        return new CrypTransClient(config, wallet);
    }
}
exports.CrypTransClient = CrypTransClient;
//# sourceMappingURL=client.js.map