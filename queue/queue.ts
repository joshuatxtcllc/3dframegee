import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../utils/logger';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export interface ModelGenerationJobData {
  frameId: string;
  forceRegenerate?: boolean;
  priority?: number;
}

export interface BatchGenerationJobData {
  frameIds: string[];
  forceRegenerate?: boolean;
}

// Create the main generation queue
export const modelGenerationQueue = new Queue<ModelGenerationJobData>('model-generation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs
      age: 7 * 24 * 3600, // Keep for 7 days
    },
  },
});

// Queue events for monitoring
export const queueEvents = new QueueEvents('model-generation', { connection });

queueEvents.on('completed', ({ jobId }) => {
  logger.info(`Job ${jobId} completed`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Job ${jobId} failed: ${failedReason}`);
});

queueEvents.on('progress', ({ jobId, data }) => {
  logger.debug(`Job ${jobId} progress: ${JSON.stringify(data)}`);
});

// Helper functions

export async function addGenerationJob(
  frameId: string,
  options?: { forceRegenerate?: boolean; priority?: number }
): Promise<Job<ModelGenerationJobData>> {
  const job = await modelGenerationQueue.add(
    'generate-model',
    {
      frameId,
      forceRegenerate: options?.forceRegenerate || false,
      priority: options?.priority || 0,
    },
    {
      priority: options?.priority || 0,
      jobId: `frame-${frameId}`, // Prevent duplicate jobs
    }
  );

  logger.info(`Added generation job for frame ${frameId}: ${job.id}`);
  return job;
}

export async function addBatchGenerationJob(
  frameIds: string[],
  options?: { forceRegenerate?: boolean }
): Promise<Job<ModelGenerationJobData>[]> {
  // Add individual jobs for each frame in the batch
  const jobs = await Promise.all(
    frameIds.map(frameId =>
      modelGenerationQueue.add(
        'generate-model',
        {
          frameId,
          forceRegenerate: options?.forceRegenerate || false,
        }
      )
    )
  );

  logger.info(`Added batch generation jobs for ${frameIds.length} frames`);
  return jobs;
}

export async function getJobStatus(jobId: string): Promise<any> {
  const job = await modelGenerationQueue.getJob(jobId);
  
  if (!job) {
    return null;
  }

  return {
    id: job.id,
    name: job.name,
    data: job.data,
    progress: job.progress,
    state: await job.getState(),
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
  };
}

export async function getQueueMetrics(): Promise<any> {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    modelGenerationQueue.getWaitingCount(),
    modelGenerationQueue.getActiveCount(),
    modelGenerationQueue.getCompletedCount(),
    modelGenerationQueue.getFailedCount(),
    modelGenerationQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed,
  };
}

export async function clearCompletedJobs(): Promise<void> {
  await modelGenerationQueue.clean(0, 100, 'completed');
  logger.info('Cleared completed jobs');
}

export async function clearFailedJobs(): Promise<void> {
  await modelGenerationQueue.clean(0, 100, 'failed');
  logger.info('Cleared failed jobs');
}

export async function pauseQueue(): Promise<void> {
  await modelGenerationQueue.pause();
  logger.info('Queue paused');
}

export async function resumeQueue(): Promise<void> {
  await modelGenerationQueue.resume();
  logger.info('Queue resumed');
}

// Graceful shutdown
export async function closeQueue(): Promise<void> {
  await modelGenerationQueue.close();
  await queueEvents.close();
  await connection.quit();
  logger.info('Queue closed');
}
