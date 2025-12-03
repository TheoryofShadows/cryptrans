import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Solana
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  solanaNetwork: process.env.SOLANA_NETWORK || 'devnet',
  programId: process.env.PROGRAM_ID || '57wFcRcKLeU2WuUbadwXR56TtdgijAFQX8X73PqDURVn',
  walletPrivateKey: process.env.WALLET_PRIVATE_KEY,

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtExpiry: process.env.JWT_EXPIRY || '24h',

  // CORS
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/cryptrans',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Rate limiting
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'), // 1 minute
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),

  // Monitoring
  datadogApiKey: process.env.DATADOG_API_KEY,
  sentryDsn: process.env.SENTRY_DSN,
};
