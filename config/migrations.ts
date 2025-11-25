import { db } from './database';
import { logger } from '../utils/logger';

/**
 * Auto-migration system for FrameForge 3D
 * Runs on app startup to ensure database schema is ready
 */

export async function runMigrations(): Promise<void> {
  logger.info('🔄 Running database migrations...');

  try {
    const client = await db.getClient();

    try {
      // Create enum types if they don't exist
      await client.query(`
        DO $$ BEGIN
          CREATE TYPE profile_type AS ENUM ('flat', 'stepped', 'ornate', 'float', 'shadowbox', 'canvas_wrap');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      await client.query(`
        DO $$ BEGIN
          CREATE TYPE material_type AS ENUM ('wood', 'metal', 'acrylic', 'composite', 'fabric');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Create frames table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS frames (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sku VARCHAR(100) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          width DECIMAL(10, 2) NOT NULL,
          depth DECIMAL(10, 2) NOT NULL,
          profile_type profile_type DEFAULT 'flat',
          material material_type DEFAULT 'wood',
          finish VARCHAR(100),
          color VARCHAR(50),
          price DECIMAL(10, 2) NOT NULL,
          in_stock BOOLEAN DEFAULT TRUE,
          image_url TEXT,
          model_glb_url TEXT,
          model_usdz_url TEXT,
          model_generated_at TIMESTAMP,
          model_file_size INTEGER,
          ar_enabled BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);

      // Add columns if they don't exist (for existing installations)
      await client.query(`
        ALTER TABLE frames
        ADD COLUMN IF NOT EXISTS model_glb_url TEXT,
        ADD COLUMN IF NOT EXISTS model_usdz_url TEXT,
        ADD COLUMN IF NOT EXISTS model_generated_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS model_file_size INTEGER,
        ADD COLUMN IF NOT EXISTS ar_enabled BOOLEAN DEFAULT FALSE;
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_frames_ar_enabled ON frames(ar_enabled);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_frames_without_models ON frames(model_glb_url, model_usdz_url)
        WHERE model_glb_url IS NULL OR model_usdz_url IS NULL;
      `);

      // Create generation_jobs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS generation_jobs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          frame_id UUID NOT NULL REFERENCES frames(id) ON DELETE CASCADE,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          glb_url TEXT,
          usdz_url TEXT,
          file_size INTEGER,
          generation_time_ms INTEGER,
          error_message TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMP,
          CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
        );
      `);

      // Create indexes on generation_jobs
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_generation_jobs_frame_id ON generation_jobs(frame_id);
        CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
        CREATE INDEX IF NOT EXISTS idx_generation_jobs_created_at ON generation_jobs(created_at DESC);
      `);

      // Update existing frames to enable AR when models are present
      await client.query(`
        UPDATE frames
        SET ar_enabled = TRUE
        WHERE model_glb_url IS NOT NULL AND model_usdz_url IS NOT NULL AND ar_enabled = FALSE;
      `);

      // Create updated_at trigger function
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      // Create trigger
      await client.query(`
        DROP TRIGGER IF EXISTS update_frames_updated_at ON frames;
        CREATE TRIGGER update_frames_updated_at
            BEFORE UPDATE ON frames
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
      `);

      logger.info('✅ Database migrations completed successfully');
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Seed sample data for testing/demo purposes
 * Only runs if SEED_SAMPLE_DATA=true and no frames exist
 */
export async function seedSampleData(): Promise<void> {
  // Only seed if explicitly enabled and database is empty
  if (process.env.SEED_SAMPLE_DATA !== 'true') {
    return;
  }

  try {
    const client = await db.getClient();

    try {
      // Check if frames already exist
      const result = await client.query('SELECT COUNT(*) FROM frames');
      const count = parseInt(result.rows[0].count);

      if (count > 0) {
        logger.info(`📦 Database already has ${count} frames, skipping seed data`);
        return;
      }

      logger.info('🌱 Seeding sample frame data...');

      // Insert sample frames
      await client.query(`
        INSERT INTO frames (sku, name, width, depth, profile_type, material, finish, color, price, in_stock)
        VALUES
          ('JF-001', 'Classic Oak Frame', 1.5, 0.75, 'flat', 'wood', 'natural', 'oak', 45.00, true),
          ('JF-002', 'Espresso Wood Frame', 2.0, 1.0, 'stepped', 'wood', 'stained', 'espresso', 55.00, true),
          ('JF-003', 'Natural Maple Frame', 1.25, 0.5, 'flat', 'wood', 'natural', 'maple', 42.00, true),
          ('JF-004', 'Cherry Wood Ornate', 2.5, 1.25, 'ornate', 'wood', 'polished', 'cherry', 85.00, true),
          ('JF-005', 'Walnut Shadowbox', 3.0, 2.0, 'shadowbox', 'wood', 'matte', 'walnut', 95.00, true),
          ('JF-101', 'Brushed Silver Frame', 1.0, 0.5, 'flat', 'metal', 'brushed', 'silver', 38.00, true),
          ('JF-102', 'Gold Leaf Frame', 1.5, 0.75, 'ornate', 'metal', 'polished', 'gold', 75.00, true),
          ('JF-103', 'Matte Black Frame', 1.25, 0.5, 'flat', 'metal', 'matte', 'black', 40.00, true),
          ('JF-104', 'Antique Bronze Frame', 2.0, 1.0, 'stepped', 'metal', 'antique', 'bronze', 65.00, true),
          ('JF-105', 'Rose Gold Modern', 1.0, 0.5, 'flat', 'metal', 'polished', 'rose gold', 58.00, true),
          ('JF-201', 'Clear Acrylic Float', 1.5, 1.0, 'float', 'acrylic', 'clear', 'clear', 68.00, true),
          ('JF-202', 'White Composite Frame', 2.0, 0.75, 'flat', 'composite', 'matte', 'white', 35.00, true),
          ('JF-203', 'Black Canvas Wrap', 1.75, 1.5, 'canvas_wrap', 'composite', 'wrapped', 'black', 48.00, true),
          ('JF-204', 'Gallery Float Frame', 2.0, 1.5, 'float', 'composite', 'matte', 'white', 62.00, true),
          ('JF-205', 'Museum Float Frame', 2.5, 2.0, 'float', 'wood', 'natural', 'natural wood', 88.00, true),
          ('JF-301', 'Deep Shadowbox Oak', 3.5, 3.0, 'shadowbox', 'wood', 'natural', 'oak', 125.00, true),
          ('JF-302', 'Linen Wrapped Frame', 2.0, 1.0, 'flat', 'fabric', 'wrapped', 'natural', 72.00, true),
          ('JF-303', 'Rustic Barnwood', 3.0, 1.25, 'stepped', 'wood', 'distressed', 'dark brown', 78.00, true),
          ('JF-304', 'Minimalist Silver', 0.75, 0.5, 'flat', 'metal', 'brushed', 'silver', 32.00, true),
          ('JF-305', 'Victorian Gold Ornate', 4.0, 2.0, 'ornate', 'metal', 'polished', 'antique gold', 145.00, true)
        ON CONFLICT (sku) DO NOTHING;
      `);

      const countResult = await client.query('SELECT COUNT(*) FROM frames');
      const newCount = parseInt(countResult.rows[0].count);

      logger.info(`✅ Seeded ${newCount} sample frames successfully`);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    // Don't throw - seeding is optional
  }
}
