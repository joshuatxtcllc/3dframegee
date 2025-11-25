-- Seed Sample Frame Data for Testing
-- FrameForge 3D - Jay's Frames Houston Heights
-- Run this after running the migration (001_add_3d_models.sql)

-- First, create the frames table if it doesn't exist
CREATE TABLE IF NOT EXISTS frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  width DECIMAL(10, 2) NOT NULL,  -- in inches
  depth DECIMAL(10, 2) NOT NULL,  -- in inches
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

-- Insert sample frames (representing various Jay's Frames products)
INSERT INTO frames (sku, name, width, depth, profile_type, material, finish, color, price, in_stock)
VALUES
  -- Classic Wood Frames
  ('JF-001', 'Classic Oak Frame', 1.5, 0.75, 'flat', 'wood', 'natural', 'oak', 45.00, true),
  ('JF-002', 'Espresso Wood Frame', 2.0, 1.0, 'stepped', 'wood', 'stained', 'espresso', 55.00, true),
  ('JF-003', 'Natural Maple Frame', 1.25, 0.5, 'flat', 'wood', 'natural', 'maple', 42.00, true),
  ('JF-004', 'Cherry Wood Ornate', 2.5, 1.25, 'ornate', 'wood', 'polished', 'cherry', 85.00, true),
  ('JF-005', 'Walnut Shadowbox', 3.0, 2.0, 'shadowbox', 'wood', 'matte', 'walnut', 95.00, true),

  -- Metal Frames
  ('JF-101', 'Brushed Silver Frame', 1.0, 0.5, 'flat', 'metal', 'brushed', 'silver', 38.00, true),
  ('JF-102', 'Gold Leaf Frame', 1.5, 0.75, 'ornate', 'metal', 'polished', 'gold', 75.00, true),
  ('JF-103', 'Matte Black Frame', 1.25, 0.5, 'flat', 'metal', 'matte', 'black', 40.00, true),
  ('JF-104', 'Antique Bronze Frame', 2.0, 1.0, 'stepped', 'metal', 'antique', 'bronze', 65.00, true),
  ('JF-105', 'Rose Gold Modern', 1.0, 0.5, 'flat', 'metal', 'polished', 'rose gold', 58.00, true),

  -- Modern/Contemporary
  ('JF-201', 'Clear Acrylic Float', 1.5, 1.0, 'float', 'acrylic', 'clear', 'clear', 68.00, true),
  ('JF-202', 'White Composite Frame', 2.0, 0.75, 'flat', 'composite', 'matte', 'white', 35.00, true),
  ('JF-203', 'Black Canvas Wrap', 1.75, 1.5, 'canvas_wrap', 'composite', 'wrapped', 'black', 48.00, true),
  ('JF-204', 'Gallery Float Frame', 2.0, 1.5, 'float', 'composite', 'matte', 'white', 62.00, true),
  ('JF-205', 'Museum Float Frame', 2.5, 2.0, 'float', 'wood', 'natural', 'natural wood', 88.00, true),

  -- Specialty Frames
  ('JF-301', 'Deep Shadowbox Oak', 3.5, 3.0, 'shadowbox', 'wood', 'natural', 'oak', 125.00, true),
  ('JF-302', 'Linen Wrapped Frame', 2.0, 1.0, 'flat', 'fabric', 'wrapped', 'natural', 72.00, true),
  ('JF-303', 'Rustic Barnwood', 3.0, 1.25, 'stepped', 'wood', 'distressed', 'dark brown', 78.00, true),
  ('JF-304', 'Minimalist Silver', 0.75, 0.5, 'flat', 'metal', 'brushed', 'silver', 32.00, true),
  ('JF-305', 'Victorian Gold Ornate', 4.0, 2.0, 'ornate', 'metal', 'polished', 'antique gold', 145.00, true)
ON CONFLICT (sku) DO NOTHING;

-- Update timestamp trigger (optional, for automatic updated_at)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_frames_updated_at ON frames;
CREATE TRIGGER update_frames_updated_at
    BEFORE UPDATE ON frames
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Display summary
DO $$
DECLARE
  frame_count INTEGER;
  frames_with_models INTEGER;
  frames_without_models INTEGER;
BEGIN
  SELECT COUNT(*) INTO frame_count FROM frames;
  SELECT COUNT(*) INTO frames_with_models FROM frames WHERE model_glb_url IS NOT NULL;
  SELECT COUNT(*) INTO frames_without_models FROM frames WHERE model_glb_url IS NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Sample Data Loaded Successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total Frames: %', frame_count;
  RAISE NOTICE 'Frames with 3D Models: %', frames_with_models;
  RAISE NOTICE 'Frames ready for generation: %', frames_without_models;
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Visit your app UI in the browser';
  RAISE NOTICE '2. Click "Generate All Missing Models"';
  RAISE NOTICE '3. Watch the queue metrics update!';
  RAISE NOTICE '========================================';
END $$;
