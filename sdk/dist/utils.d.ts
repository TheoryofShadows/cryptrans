export declare const logger: {
    info: (message: string, data?: any) => void;
    error: (message: string, error?: any) => void;
    warn: (message: string, data?: any) => void;
    debug: (message: string, data?: any) => void;
};
export declare const sleep: (ms: number) => Promise<void>;
export declare const retry: <T>(fn: () => Promise<T>, maxRetries?: number, delayMs?: number) => Promise<T>;
//# sourceMappingURL=utils.d.ts.map