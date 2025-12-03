import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Routes
import authRoutes from './routes/auth';
import proposalRoutes from './routes/proposals';
import stakingRoutes from './routes/staking';
import treasuryRoutes from './routes/treasury';
import governanceRoutes from './routes/governance';
import analyticsRoutes from './routes/analytics';
import powRoutes from './routes/pow';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));
app.use(express.json());
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '1.0.0',
    network: config.solanaNetwork,
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/proposals', proposalRoutes);
app.use('/api/v1/staking', stakingRoutes);
app.use('/api/v1/treasury', treasuryRoutes);
app.use('/api/v1/governance', governanceRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/pow', powRoutes);

// Error handling
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`CrypTrans API server running on port ${PORT}`);
  logger.info(`Network: ${config.solanaNetwork}`);
  logger.info(`Program ID: ${config.programId}`);
});

export default app;
