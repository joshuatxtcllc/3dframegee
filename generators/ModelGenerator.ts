import * as THREE from 'three';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Frame, FrameProfile, GenerationResult } from '../types/database';
import { GeometryGenerator } from './GeometryGenerator';
import { MaterialMapper } from './MaterialMapper';
import { GLBExporter } from './GLBExporter';
import { USDZConverter } from './USDZConverter';
import { logger } from '../utils/logger';
import { storage } from '../services/storage';

export class ModelGenerator {
  private geometryGenerator: GeometryGenerator;
  private materialMapper: MaterialMapper;
  private glbExporter: GLBExporter;
  private usdzConverter: USDZConverter;
  private tempDir: string;

  constructor() {
    this.geometryGenerator = new GeometryGenerator();
    this.materialMapper = new MaterialMapper();
    this.glbExporter = new GLBExporter();
    this.usdzConverter = new USDZConverter();
    this.tempDir = path.join(os.tmpdir(), 'frameforge-3d');
  }

  /**
   * Generate complete 3D models (GLB and USDZ) for a frame
   */
  async generateModels(frame: Frame): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`Starting model generation for frame: ${frame.id} (${frame.name})`);

      // Ensure temp directory exists
      await fs.mkdir(this.tempDir, { recursive: true });

      // Create frame profile from database data
      const profile = this.createFrameProfile(frame);

      // Step 1: Generate 3D geometry
      const geometry = this.geometryGenerator.generateFrameGeometry(
        profile,
        frame.width,
        frame.width * 1.25 // Assuming 4:5 aspect ratio, adjust as needed
      );

      // Step 2: Create and apply material
      const material = this.materialMapper.createMaterial(
        frame.material,
        frame.finish,
        frame.color
      );

      // Step 3: Create Three.js mesh
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = frame.name;

      // Step 4: Export to GLB
      const glbFileName = `${frame.sku || frame.id}.glb`;
      const glbTempPath = path.join(this.tempDir, glbFileName);
      
      const glbResult = await this.glbExporter.exportToGLB(mesh, glbTempPath, frame.name);

      // Validate GLB size
      const maxSizeMB = parseFloat(process.env.MAX_FILE_SIZE_MB || '2');
      const isValidGLB = await this.glbExporter.validateGLB(glbTempPath, maxSizeMB);
      
      if (!isValidGLB) {
        throw new Error(`GLB file validation failed for frame ${frame.id}`);
      }

      // Step 5: Upload GLB to storage
      const glbStorageKey = `frames/${frame.id}/${glbFileName}`;
      const glbUrl = await storage.uploadFile(glbTempPath, glbStorageKey, 'model/gltf-binary');

      // Step 6: Convert to USDZ
      const usdzFileName = `${frame.sku || frame.id}.usdz`;
      const usdzTempPath = path.join(this.tempDir, usdzFileName);

      let usdzUrl: string;
      try {
        await this.usdzConverter.convertGLBToUSDZ(glbTempPath, usdzTempPath);
        
        // Upload USDZ to storage
        const usdzStorageKey = `frames/${frame.id}/${usdzFileName}`;
        usdzUrl = await storage.uploadFile(usdzTempPath, usdzStorageKey, 'model/vnd.usdz+zip');
      } catch (error) {
        logger.warn(`USDZ conversion failed, creating simple wrapper: ${error}`);
        // Fallback to simple USDZ wrapper
        await this.usdzConverter.createSimpleUSDZ(glbTempPath, usdzTempPath);
        const usdzStorageKey = `frames/${frame.id}/${usdzFileName}`;
        usdzUrl = await storage.uploadFile(usdzTempPath, usdzStorageKey, 'model/vnd.usdz+zip');
      }

      // Step 7: Clean up temp files
      await this.cleanupTempFiles([glbTempPath, usdzTempPath]);

      const generationTime = Date.now() - startTime;
      
      logger.info(`Model generation completed for frame ${frame.id} in ${generationTime}ms`);

      return {
        frame_id: frame.id,
        glb_url: glbUrl,
        usdz_url: usdzUrl,
        file_size: glbResult.size,
        generation_time_ms: generationTime,
      };
    } catch (error) {
      logger.error(`Model generation failed for frame ${frame.id}:`, error);
      throw error;
    }
  }

  /**
   * Create frame profile from database frame data
   */
  private createFrameProfile(frame: Frame): FrameProfile {
    // Default profile dimensions if not specified
    const defaultWidth = 1.5; // 1.5 inches
    const defaultDepth = 0.75; // 0.75 inches

    return {
      type: frame.profile_type,
      width: frame.width || defaultWidth,
      depth: frame.depth || defaultDepth,
      rabbet_depth: 0.25,
      rabbet_width: 0.25,
      lip_height: 0.5,
      ornate_detail_scale: 0.15,
    };
  }

  /**
   * Generate a preview thumbnail of the 3D model
   */
  async generateThumbnail(frame: Frame, outputPath: string): Promise<string> {
    try {
      // This would render a preview image of the 3D model
      // For now, we'll skip this and focus on the 3D models themselves
      logger.info(`Thumbnail generation not yet implemented for frame ${frame.id}`);
      return '';
    } catch (error) {
      logger.error('Thumbnail generation error:', error);
      throw error;
    }
  }

  /**
   * Clean up temporary files
   */
  private async cleanupTempFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        logger.debug(`Cleaned up temp file: ${filePath}`);
      } catch (error) {
        logger.warn(`Failed to clean up temp file ${filePath}:`, error);
      }
    }
  }

  /**
   * Batch generate models for multiple frames
   */
  async batchGenerateModels(frames: Frame[]): Promise<GenerationResult[]> {
    const results: GenerationResult[] = [];
    
    logger.info(`Starting batch generation for ${frames.length} frames`);

    for (const frame of frames) {
      try {
        const result = await this.generateModels(frame);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to generate models for frame ${frame.id}:`, error);
        // Continue with next frame
      }
    }

    logger.info(`Batch generation completed: ${results.length}/${frames.length} successful`);
    
    return results;
  }
}
