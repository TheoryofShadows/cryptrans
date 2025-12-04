export declare class TransactionBuilder {
    static generateProofOfWork(message: string, difficulty: number): {
        nonce: string;
        hash: string;
    };
    static verifyProofOfWork(message: string, hash: string, nonce: string): boolean;
    static generateSecret(): Uint8Array;
    static hashSecret(secret: Uint8Array): string;
    static generateNullifier(secret: Uint8Array, proposalId: number): string;
}
//# sourceMappingURL=transactions.d.ts.map