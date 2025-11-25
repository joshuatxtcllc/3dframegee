import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import apiRoutes from './api/routes';
import { logger } from './utils/logger';
import { db } from './config/database';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Compression
app.use(compression());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Serve static models if using local storage
if (process.env.STORAGE_TYPE === 'local') {
  const modelsPath = process.env.LOCAL_STORAGE_PATH || '/app/models';
  app.use('/models', express.static(modelsPath));
  logger.info(`Serving static models from ${modelsPath}`);
}

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'FrameForge 3D',
    description: 'Automated 3D frame model generator for Jay\'s Frames - Houston Heights custom framing',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      generateModel: 'POST /api/generate-model',
      batchGenerate: 'POST /api/batch-generate',
      generateAllMissing: 'POST /api/generate-all-missing',
      jobStatus: 'GET /api/job-status/:jobId',
      frameModels: 'GET /api/frame/:frameId/models',
      frames: 'GET /api/frames',
      queueMetrics: 'GET /api/queue/metrics',
    },
    documentation: 'https://github.com/your-repo/frameforge-3d',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Graceful shutdown
async function gracefulShutdown(): Promise<void> {
  logger.info('Shutting down gracefully...');
  
  server.close(() => {
    logger.info('HTTP server closed');
  });

  try {
    await db.close();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database:', error);
  }

  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 FrameForge 3D API server running on port ${PORT}`);
  logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`   Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  logger.info(`   Redis: ${process.env.REDIS_URL || 'localhost:6379'}`);
  logger.info(`   Storage: ${process.env.STORAGE_TYPE || 's3'}`);
  logger.info(`\n   🎨 Jay's Frames - Houston Heights Custom Framing`);
  logger.info(`   📍 218 W 27th St, Houston, TX 77008\n`);
});

export default app;
