// Database types matching FrameKraft schema

export interface Frame {
  id: string;
  sku: string;
  name: string;
  width: number; // in inches
  depth: number; // in inches
  profile_type: ProfileType;
  material: Material;
  finish: string;
  color: string;
  price: number;
  in_stock: boolean;
  image_url?: string;
  model_glb_url?: string;
  model_usdz_url?: string;
  model_generated_at?: Date;
  model_file_size?: number;
  ar_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export enum ProfileType {
  FLAT = 'flat',
  STEPPED = 'stepped',
  ORNATE = 'ornate',
  FLOAT = 'float',
  SHADOWBOX = 'shadowbox',
  CANVAS_WRAP = 'canvas_wrap'
}

export enum Material {
  WOOD = 'wood',
  METAL = 'metal',
  ACRYLIC = 'acrylic',
  COMPOSITE = 'composite',
  FABRIC = 'fabric'
}

export interface FrameProfile {
  type: ProfileType;
  width: number; // Width of frame molding in inches
  depth: number; // Depth of frame in inches
  rabbet_depth?: number; // Depth of rabbet for artwork
  rabbet_width?: number; // Width of rabbet
  lip_height?: number; // For float frames
  ornate_detail_scale?: number; // For ornate frames
}

export interface MaterialTexture {
  material: Material;
  albedo_color: string; // Hex color
  roughness: number; // 0-1
  metallic: number; // 0-1
  texture_url?: string; // Path to texture image if available
  normal_map_url?: string;
}

export interface GenerationJob {
  id: string;
  frame_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  glb_url?: string;
  usdz_url?: string;
  error_message?: string;
  file_size?: number;
  generation_time_ms?: number;
  created_at: Date;
  completed_at?: Date;
}

export interface BatchGenerationRequest {
  frame_ids: string[];
  force_regenerate?: boolean;
  priority?: number;
}

export interface GenerationResult {
  frame_id: string;
  glb_url: string;
  usdz_url: string;
  file_size: number;
  generation_time_ms: number;
}
import { Pool, PoolClient } from 'pg';
import { Frame, GenerationJob } from '../types/database';
import { logger } from '../utils/logger';

class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database error', err);
    });
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  // Frame queries
  async getFrame(frameId: string): Promise<Frame | null> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM frames WHERE id = $1',
        [frameId]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async getFrames(limit: number = 100, offset: number = 0): Promise<Frame[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM frames ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getFramesWithoutModels(): Promise<Frame[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM frames WHERE model_glb_url IS NULL OR model_usdz_url IS NULL'
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  async updateFrameModels(
    frameId: string,
    glbUrl: string,
    usdzUrl: string,
    fileSize: number
  ): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query(
        `UPDATE frames 
         SET model_glb_url = $1, 
             model_usdz_url = $2, 
             model_file_size = $3,
             model_generated_at = NOW(),
             ar_enabled = true,
             updated_at = NOW()
         WHERE id = $4`,
        [glbUrl, usdzUrl, fileSize, frameId]
      );
      logger.info(`Updated frame ${frameId} with model URLs`);
    } finally {
      client.release();
    }
  }

  // Generation job queries
  async createGenerationJob(frameId: string): Promise<string> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `INSERT INTO generation_jobs (frame_id, status, created_at)
         VALUES ($1, 'pending', NOW())
         RETURNING id`,
        [frameId]
      );
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  async updateGenerationJobStatus(
    jobId: string,
    status: 'processing' | 'completed' | 'failed',
    data?: {
      glbUrl?: string;
      usdzUrl?: string;
      fileSize?: number;
      generationTimeMs?: number;
      errorMessage?: string;
    }
  ): Promise<void> {
    const client = await this.getClient();
    try {
      const query = `
        UPDATE generation_jobs 
        SET status = $1,
            glb_url = COALESCE($2, glb_url),
            usdz_url = COALESCE($3, usdz_url),
            file_size = COALESCE($4, file_size),
            generation_time_ms = COALESCE($5, generation_time_ms),
            error_message = COALESCE($6, error_message),
            completed_at = CASE WHEN $1 IN ('completed', 'failed') THEN NOW() ELSE completed_at END
        WHERE id = $7
      `;
      await client.query(query, [
        status,
        data?.glbUrl,
        data?.usdzUrl,
        data?.fileSize,
        data?.generationTimeMs,
        data?.errorMessage,
        jobId,
      ]);
    } finally {
      client.release();
    }
  }

  async getGenerationJob(jobId: string): Promise<GenerationJob | null> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM generation_jobs WHERE id = $1',
        [jobId]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export const db = new Database();
