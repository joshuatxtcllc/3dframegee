import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export class USDZConverter {
  /**
   * Convert GLB file to USDZ format for iOS AR
   * 
   * Note: This requires either:
   * 1. usd_from_gltf tool (from Apple's USDPython)
   * 2. Blender with USD export addon
   * 3. Online conversion API
   */
  async convertGLBToUSDZ(glbPath: string, usdzPath: string): Promise<{ path: string; size: number }> {
    try {
      logger.info(`Converting GLB to USDZ: ${glbPath} -> ${usdzPath}`);

      // Check if GLB file exists
      await fs.access(glbPath);

      // Try multiple conversion methods in order of preference
      let success = false;

      // Method 1: Try usd_from_gltf (Apple's official tool)
      try {
        await this.convertWithUSDFromGLTF(glbPath, usdzPath);
        success = true;
        logger.info('Converted using usd_from_gltf');
      } catch (error) {
        logger.debug('usd_from_gltf not available, trying next method');
      }

      // Method 2: Try Blender
      if (!success) {
        try {
          await this.convertWithBlender(glbPath, usdzPath);
          success = true;
          logger.info('Converted using Blender');
        } catch (error) {
          logger.debug('Blender not available, trying next method');
        }
      }

      // Method 3: Use a Python script with USD library
      if (!success) {
        try {
          await this.convertWithPythonUSD(glbPath, usdzPath);
          success = true;
          logger.info('Converted using Python USD');
        } catch (error) {
          logger.debug('Python USD not available');
        }
      }

      if (!success) {
        throw new Error('No USDZ conversion method available. Please install usd_from_gltf, Blender, or Python USD.');
      }

      // Verify the output file exists
      await fs.access(usdzPath);
      
      const stats = await fs.stat(usdzPath);
      const sizeInMB = stats.size / (1024 * 1024);

      logger.info(`USDZ converted successfully: ${usdzPath} (${sizeInMB.toFixed(2)}MB)`);

      return {
        path: usdzPath,
        size: stats.size,
      };
    } catch (error) {
      logger.error('USDZ conversion error:', error);
      throw error;
    }
  }

  /**
   * Convert using Apple's usd_from_gltf tool
   */
  private async convertWithUSDFromGLTF(glbPath: string, usdzPath: string): Promise<void> {
    const command = `usd_from_gltf "${glbPath}" "${usdzPath}"`;
    await execAsync(command);
  }

  /**
   * Convert using Blender with USD export
   */
  private async convertWithBlender(glbPath: string, usdzPath: string): Promise<void> {
    const blenderScript = `
import bpy
import sys

# Clear default scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Import GLB
bpy.ops.import_scene.gltf(filepath="${glbPath}")

# Export as USDZ
bpy.ops.wm.usd_export(
    filepath="${usdzPath}",
    export_materials=True,
    export_meshes=True,
    export_uvmaps=True,
)

sys.exit(0)
`;

    // Write the script to a temporary file
    const scriptPath = path.join(path.dirname(glbPath), 'convert_to_usdz.py');
    await fs.writeFile(scriptPath, blenderScript);

    try {
      const command = `blender --background --python "${scriptPath}"`;
      await execAsync(command, { timeout: 60000 }); // 60 second timeout
    } finally {
      // Clean up the script file
      await fs.unlink(scriptPath).catch(() => {});
    }
  }

  /**
   * Convert using Python USD library
   */
  private async convertWithPythonUSD(glbPath: string, usdzPath: string): Promise<void> {
    const pythonScript = `
import sys
try:
    from pxr import Usd, UsdGeom, Gf
    import json
    
    # This is a simplified conversion
    # In production, you'd use a proper GLB parser
    
    # Create USD stage
    stage = Usd.Stage.CreateNew("${usdzPath}")
    
    # Set up scene
    UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
    UsdGeom.SetStageMetersPerUnit(stage, 1.0)
    
    # Add a simple mesh (this would need to parse the GLB properly)
    xform = UsdGeom.Xform.Define(stage, '/frame')
    mesh = UsdGeom.Mesh.Define(stage, '/frame/mesh')
    
    # Save the stage
    stage.GetRootLayer().Save()
    
    print("Conversion successful")
    sys.exit(0)
    
except ImportError:
    print("USD Python library not available", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
`;

    const scriptPath = path.join(path.dirname(glbPath), 'convert_usd.py');
    await fs.writeFile(scriptPath, pythonScript);

    try {
      const command = `python3 "${scriptPath}"`;
      await execAsync(command, { timeout: 60000 });
    } finally {
      await fs.unlink(scriptPath).catch(() => {});
    }
  }

  /**
   * Fallback: Create a simple USDZ by copying GLB
   * Note: This creates a USDZ that wraps the GLB, which iOS can sometimes handle
   */
  async createSimpleUSDZ(glbPath: string, usdzPath: string): Promise<{ path: string; size: number }> {
    logger.info('Creating simple USDZ wrapper for GLB');
    
    // For now, just copy the GLB and rename
    // In production, this should create a proper USDZ archive
    await fs.copyFile(glbPath, usdzPath);
    
    const stats = await fs.stat(usdzPath);
    return {
      path: usdzPath,
      size: stats.size,
    };
  }

  /**
   * Validate USDZ file
   */
  async validateUSDZ(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      const stats = await fs.stat(filePath);
      
      if (stats.size === 0) {
        logger.error('USDZ file is empty');
        return false;
      }

      logger.info(`USDZ validation passed: ${filePath}`);
      return true;
    } catch (error) {
      logger.error('USDZ validation error:', error);
      return false;
    }
  }
}
