import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { ModelGenerationJobData, BatchGenerationJobData } from './queue';
import { ModelGenerator } from '../generators/ModelGenerator';
import { db } from '../config/database';
import { logger } from '../utils/logger';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const modelGenerator = new ModelGenerator();

// Create the worker
export const worker = new Worker(
  'model-generation',
  async (job: Job) => {
    logger.info(`Processing job ${job.id}: ${job.name}`);

    try {
      if (job.name === 'generate-model') {
        return await processGenerationJob(job as Job<ModelGenerationJobData>);
      } else if (job.name === 'batch-generate') {
        return await processBatchGenerationJob(job as Job<BatchGenerationJobData>);
      } else {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    } catch (error) {
      logger.error(`Job ${job.id} processing error:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
    limiter: {
      max: 10, // Max 10 jobs per duration
      duration: 60000, // 1 minute
    },
  }
);

// Worker event handlers
worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed:`, err);
});

worker.on('error', (err) => {
  logger.error('Worker error:', err);
});

// Process single frame generation
async function processGenerationJob(job: Job<ModelGenerationJobData>): Promise<any> {
  const { frameId, forceRegenerate } = job.data;

  // Update job progress
  await job.updateProgress(10);

  // Get frame from database
  const frame = await db.getFrame(frameId);
  
  if (!frame) {
    throw new Error(`Frame not found: ${frameId}`);
  }

  await job.updateProgress(20);

  // Check if models already exist and regeneration is not forced
  if (!forceRegenerate && frame.model_glb_url && frame.model_usdz_url) {
    logger.info(`Frame ${frameId} already has models, skipping generation`);
    return {
      frameId,
      status: 'skipped',
      glbUrl: frame.model_glb_url,
      usdzUrl: frame.model_usdz_url,
    };
  }

  await job.updateProgress(30);

  // Create generation job record in database
  const jobId = await db.createGenerationJob(frameId);
  await db.updateGenerationJobStatus(jobId, 'processing');

  await job.updateProgress(40);

  try {
    // Generate the 3D models
    const result = await modelGenerator.generateModels(frame);

    await job.updateProgress(80);

    // Update database with model URLs
    await db.updateFrameModels(
      frameId,
      result.glb_url,
      result.usdz_url,
      result.file_size
    );

    await db.updateGenerationJobStatus(jobId, 'completed', {
      glbUrl: result.glb_url,
      usdzUrl: result.usdz_url,
      fileSize: result.file_size,
      generationTimeMs: result.generation_time_ms,
    });

    await job.updateProgress(100);

    return {
      frameId,
      status: 'completed',
      glbUrl: result.glb_url,
      usdzUrl: result.usdz_url,
      fileSize: result.file_size,
      generationTimeMs: result.generation_time_ms,
    };
  } catch (error) {
    // Update job as failed in database
    await db.updateGenerationJobStatus(jobId, 'failed', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// Process batch generation
async function processBatchGenerationJob(job: Job<BatchGenerationJobData>): Promise<any> {
  const { frameIds, forceRegenerate } = job.data;
  
  logger.info(`Processing batch generation for ${frameIds.length} frames`);

  const results = [];
  const total = frameIds.length;

  for (let i = 0; i < frameIds.length; i++) {
    const frameId = frameIds[i];
    
    // Update progress
    const progress = Math.round(((i + 1) / total) * 100);
    await job.updateProgress(progress);

    try {
      const frame = await db.getFrame(frameId);
      
      if (!frame) {
        logger.warn(`Frame not found: ${frameId}, skipping`);
        results.push({ frameId, status: 'not_found' });
        continue;
      }

      // Check if models already exist
      if (!forceRegenerate && frame.model_glb_url && frame.model_usdz_url) {
        logger.info(`Frame ${frameId} already has models, skipping`);
        results.push({
          frameId,
          status: 'skipped',
          glbUrl: frame.model_glb_url,
          usdzUrl: frame.model_usdz_url,
        });
        continue;
      }

      // Generate models
      const result = await modelGenerator.generateModels(frame);

      // Update database
      await db.updateFrameModels(
        frameId,
        result.glb_url,
        result.usdz_url,
        result.file_size
      );

      results.push({
        frameId,
        status: 'completed',
        glbUrl: result.glb_url,
        usdzUrl: result.usdz_url,
      });
    } catch (error) {
      logger.error(`Failed to generate models for frame ${frameId}:`, error);
      results.push({
        frameId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const successful = results.filter((r) => r.status === 'completed').length;
  logger.info(`Batch generation completed: ${successful}/${total} successful`);

  return {
    total,
    successful,
    failed: results.filter((r) => r.status === 'failed').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    results,
  };
}

// Graceful shutdown
async function gracefulShutdown(): Promise<void> {
  logger.info('Shutting down worker gracefully...');
  await worker.close();
  await connection.quit();
  logger.info('Worker shut down');
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start worker if this file is run directly
if (require.main === module) {
  logger.info('Worker started and waiting for jobs...');
}

export default worker;
