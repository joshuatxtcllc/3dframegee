import express, { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import {
  addGenerationJob,
  addBatchGenerationJob,
  getJobStatus,
  getQueueMetrics,
  clearCompletedJobs,
  clearFailedJobs,
  pauseQueue,
  resumeQueue,
} from '../queue/queue';
import { logger } from '../utils/logger';

const router = express.Router();

// Middleware for error handling
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * POST /api/generate-model
 * Generate 3D model for a single frame
 */
router.post(
  '/generate-model',
  asyncHandler(async (req: Request, res: Response) => {
    const { frameId, forceRegenerate = false } = req.body;

    if (!frameId) {
      return res.status(400).json({ error: 'frameId is required' });
    }

    // Check if frame exists
    const frame = await db.getFrame(frameId);
    if (!frame) {
      return res.status(404).json({ error: 'Frame not found' });
    }

    // Add job to queue
    const job = await addGenerationJob(frameId, { forceRegenerate });

    res.json({
      message: 'Model generation job created',
      jobId: job.id,
      frameId,
      status: 'pending',
    });
  })
);

/**
 * POST /api/batch-generate
 * Generate 3D models for multiple frames
 */
router.post(
  '/batch-generate',
  asyncHandler(async (req: Request, res: Response) => {
    const { frameIds, forceRegenerate = false } = req.body;

    if (!Array.isArray(frameIds) || frameIds.length === 0) {
      return res.status(400).json({ error: 'frameIds array is required' });
    }

    if (frameIds.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 frames per batch' });
    }

    // Add batch job to queue
    const jobs = await addBatchGenerationJob(frameIds, { forceRegenerate });

    res.json({
      message: 'Batch generation jobs created',
      jobIds: jobs.map(j => j.id),
      frameCount: frameIds.length,
      status: 'pending',
    });
  })
);

/**
 * POST /api/generate-all-missing
 * Generate models for all frames that don't have them
 */
router.post(
  '/generate-all-missing',
  asyncHandler(async (req: Request, res: Response) => {
    const framesWithoutModels = await db.getFramesWithoutModels();

    if (framesWithoutModels.length === 0) {
      return res.json({
        message: 'All frames already have 3D models',
        frameCount: 0,
      });
    }

    const frameIds = framesWithoutModels.map((f) => f.id);
    const jobs = await addBatchGenerationJob(frameIds);

    res.json({
      message: 'Batch generation jobs created for all missing models',
      jobIds: jobs.map(j => j.id),
      frameCount: frameIds.length,
      status: 'pending',
    });
  })
);

/**
 * GET /api/job-status/:jobId
 * Get status of a generation job
 */
router.get(
  '/job-status/:jobId',
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;

    const status = await getJobStatus(jobId);

    if (!status) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(status);
  })
);

/**
 * GET /api/frame/:frameId/models
 * Get model URLs for a specific frame
 */
router.get(
  '/frame/:frameId/models',
  asyncHandler(async (req: Request, res: Response) => {
    const { frameId } = req.params;

    const frame = await db.getFrame(frameId);

    if (!frame) {
      return res.status(404).json({ error: 'Frame not found' });
    }

    res.json({
      frameId: frame.id,
      sku: frame.sku,
      name: frame.name,
      arEnabled: frame.ar_enabled,
      models: {
        glb: frame.model_glb_url,
        usdz: frame.model_usdz_url,
      },
      modelGeneratedAt: frame.model_generated_at,
      fileSize: frame.model_file_size,
    });
  })
);

/**
 * GET /api/frames
 * List all frames with pagination
 */
router.get(
  '/frames',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const frames = await db.getFrames(limit, offset);

    res.json({
      frames: frames.map((f) => ({
        id: f.id,
        sku: f.sku,
        name: f.name,
        arEnabled: f.ar_enabled,
        hasModels: !!(f.model_glb_url && f.model_usdz_url),
        models: {
          glb: f.model_glb_url,
          usdz: f.model_usdz_url,
        },
      })),
      limit,
      offset,
    });
  })
);

/**
 * GET /api/queue/metrics
 * Get queue metrics
 */
router.get(
  '/queue/metrics',
  asyncHandler(async (req: Request, res: Response) => {
    const metrics = await getQueueMetrics();
    res.json(metrics);
  })
);

/**
 * POST /api/queue/clear-completed
 * Clear completed jobs from queue
 */
router.post(
  '/queue/clear-completed',
  asyncHandler(async (req: Request, res: Response) => {
    await clearCompletedJobs();
    res.json({ message: 'Completed jobs cleared' });
  })
);

/**
 * POST /api/queue/clear-failed
 * Clear failed jobs from queue
 */
router.post(
  '/queue/clear-failed',
  asyncHandler(async (req: Request, res: Response) => {
    await clearFailedJobs();
    res.json({ message: 'Failed jobs cleared' });
  })
);

/**
 * POST /api/queue/pause
 * Pause the queue
 */
router.post(
  '/queue/pause',
  asyncHandler(async (req: Request, res: Response) => {
    await pauseQueue();
    res.json({ message: 'Queue paused' });
  })
);

/**
 * POST /api/queue/resume
 * Resume the queue
 */
router.post(
  '/queue/resume',
  asyncHandler(async (req: Request, res: Response) => {
    await resumeQueue();
    res.json({ message: 'Queue resumed' });
  })
);

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'frameforge-3d',
  });
});

// Error handler middleware
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('API error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default router;
