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
