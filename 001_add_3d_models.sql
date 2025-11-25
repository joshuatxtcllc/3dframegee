-- Migration: Add 3D model support to frames table
-- FrameForge 3D - Jay's Frames Houston Heights
-- Run this migration against your existing FrameKraft database

-- Add model-related columns to frames table
ALTER TABLE frames
ADD COLUMN IF NOT EXISTS model_glb_url TEXT,
ADD COLUMN IF NOT EXISTS model_usdz_url TEXT,
ADD COLUMN IF NOT EXISTS model_generated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS model_file_size INTEGER,
ADD COLUMN IF NOT EXISTS ar_enabled BOOLEAN DEFAULT FALSE;

-- Create index for AR-enabled frames
CREATE INDEX IF NOT EXISTS idx_frames_ar_enabled ON frames(ar_enabled);

-- Create index for frames without models
CREATE INDEX IF NOT EXISTS idx_frames_without_models ON frames(model_glb_url, model_usdz_url) 
WHERE model_glb_url IS NULL OR model_usdz_url IS NULL;

-- Create generation_jobs table to track model generation history
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

-- Create indexes on generation_jobs
CREATE INDEX IF NOT EXISTS idx_generation_jobs_frame_id ON generation_jobs(frame_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_created_at ON generation_jobs(created_at DESC);

-- Add comment describing the purpose
COMMENT ON TABLE generation_jobs IS 'Tracks 3D model generation jobs for frames - FrameForge 3D system';

-- If you need to add profile_type and material enums (if they don't exist)
DO $$ BEGIN
  CREATE TYPE profile_type AS ENUM ('flat', 'stepped', 'ornate', 'float', 'shadowbox', 'canvas_wrap');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE material_type AS ENUM ('wood', 'metal', 'acrylic', 'composite', 'fabric');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add columns if they don't exist (for new FrameKraft installations)
ALTER TABLE frames
ADD COLUMN IF NOT EXISTS profile_type profile_type DEFAULT 'flat',
ADD COLUMN IF NOT EXISTS material material_type DEFAULT 'wood',
ADD COLUMN IF NOT EXISTS finish VARCHAR(100),
ADD COLUMN IF NOT EXISTS color VARCHAR(50);

-- Update existing frames to enable AR when models are present
UPDATE frames
SET ar_enabled = TRUE
WHERE model_glb_url IS NOT NULL AND model_usdz_url IS NOT NULL;

-- Create a view for frames ready for AR
CREATE OR REPLACE VIEW ar_ready_frames AS
SELECT 
  f.id,
  f.sku,
  f.name,
  f.width,
  f.depth,
  f.profile_type,
  f.material,
  f.finish,
  f.color,
  f.price,
  f.model_glb_url,
  f.model_usdz_url,
  f.model_generated_at,
  f.model_file_size,
  f.ar_enabled
FROM frames f
WHERE f.ar_enabled = TRUE
  AND f.model_glb_url IS NOT NULL
  AND f.model_usdz_url IS NOT NULL
  AND f.in_stock = TRUE
ORDER BY f.created_at DESC;

COMMENT ON VIEW ar_ready_frames IS 'Frames with complete 3D models available for AR display';

-- Grant permissions (adjust based on your user setup)
-- GRANT SELECT, INSERT, UPDATE ON frames TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE ON generation_jobs TO your_app_user;
-- GRANT SELECT ON ar_ready_frames TO your_app_user;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'FrameForge 3D migration completed successfully!';
  RAISE NOTICE 'Your FrameKraft database is now ready for 3D model generation.';
  RAISE NOTICE 'Run: npm run generate -- stats to see current status';
END $$;
