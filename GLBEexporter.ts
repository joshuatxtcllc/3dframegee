import * as THREE from 'three';
import { Document, NodeIO, Material as GLTFMaterial } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { 
  dedup, 
  prune, 
  resample, 
  draco, 
  textureCompress,
  quantize
} from '@gltf-transform/functions';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export class GLBExporter {
  private io: NodeIO;

  constructor() {
    this.io = new NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({
        'draco3d.decoder': require('draco3dgltf'),
        'draco3d.encoder': require('draco3dgltf'),
      });
  }

  /**
   * Export Three.js mesh to optimized GLB file
   */
  async exportToGLB(
    mesh: THREE.Mesh,
    outputPath: string,
    frameName: string
  ): Promise<{ path: string; size: number }> {
    try {
      logger.info(`Exporting GLB: ${outputPath}`);

      // Create glTF document
      const document = new Document();
      const buffer = document.createBuffer();
      
      // Create scene
      const scene = document.createScene(frameName);
      const node = document.createNode(frameName);
      scene.addChild(node);

      // Convert Three.js geometry to glTF primitive
      const geometry = mesh.geometry as THREE.BufferGeometry;
      const primitive = document.createPrimitive();

      // Add position attribute
      const positions = geometry.attributes.position;
      const positionAccessor = document
        .createAccessor()
        .setType('VEC3')
        .setArray(new Float32Array(positions.array))
        .setBuffer(buffer);
      primitive.setAttribute('POSITION', positionAccessor);

      // Add normal attribute
      if (geometry.attributes.normal) {
        const normals = geometry.attributes.normal;
        const normalAccessor = document
          .createAccessor()
          .setType('VEC3')
          .setArray(new Float32Array(normals.array))
          .setBuffer(buffer);
        primitive.setAttribute('NORMAL', normalAccessor);
      }

      // Add UV attribute
      if (geometry.attributes.uv) {
        const uvs = geometry.attributes.uv;
        const uvAccessor = document
          .createAccessor()
          .setType('VEC2')
          .setArray(new Float32Array(uvs.array))
          .setBuffer(buffer);
        primitive.setAttribute('TEXCOORD_0', uvAccessor);
      }

      // Add indices
      if (geometry.index) {
        const indices = geometry.index;
        const indexAccessor = document
          .createAccessor()
          .setType('SCALAR')
          .setArray(new Uint32Array(indices.array))
          .setBuffer(buffer);
        primitive.setIndices(indexAccessor);
      }

      // Create material
      const material = this.createGLTFMaterial(document, mesh.material as THREE.MeshStandardMaterial);
      primitive.setMaterial(material);

      // Create mesh and add to node
      const gltfMesh = document.createMesh(frameName).addPrimitive(primitive);
      node.setMesh(gltfMesh);

      // Optimize the document
      await document.transform(
        // Remove duplicate vertices and materials
        dedup(),
        // Remove unused nodes, meshes, etc.
        prune(),
        // Quantize geometry (reduce precision for smaller files)
        quantize({
          quantizePosition: 14,
          quantizeNormal: 10,
          quantizeTexcoord: 12,
        }),
        // Resample animations (if any)
        resample()
      );

      // Write to file
      await this.io.write(outputPath, document);

      // Get file size
      const stats = await fs.stat(outputPath);
      const sizeInMB = stats.size / (1024 * 1024);

      logger.info(`GLB exported successfully: ${outputPath} (${sizeInMB.toFixed(2)}MB)`);

      return {
        path: outputPath,
        size: stats.size,
      };
    } catch (error) {
      logger.error('GLB export error:', error);
      throw error;
    }
  }

  /**
   * Create glTF material from Three.js material
   */
  private createGLTFMaterial(document: Document, threeMaterial: THREE.MeshStandardMaterial): GLTFMaterial {
    const material = document.createMaterial(threeMaterial.name || 'FrameMaterial');

    // Base color
    const color = threeMaterial.color;
    material.setBaseColorFactor([color.r, color.g, color.b, threeMaterial.opacity]);

    // PBR properties
    material.setMetallicFactor(threeMaterial.metalness);
    material.setRoughnessFactor(threeMaterial.roughness);

    // Double-sided rendering for frames
    material.setDoubleSided(false);

    // Alpha mode
    if (threeMaterial.transparent) {
      material.setAlphaMode('BLEND');
    } else {
      material.setAlphaMode('OPAQUE');
    }

    return material;
  }

  /**
   * Validate GLB file size and structure
   */
  async validateGLB(filePath: string, maxSizeMB: number = 2): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      const sizeInMB = stats.size / (1024 * 1024);

      if (sizeInMB > maxSizeMB) {
        logger.warn(`GLB file too large: ${sizeInMB.toFixed(2)}MB > ${maxSizeMB}MB`);
        return false;
      }

      // Try to read the file to ensure it's valid
      const document = await this.io.read(filePath);
      const scene = document.getRoot().listScenes()[0];
      
      if (!scene) {
        logger.error('GLB file has no scenes');
        return false;
      }

      logger.info(`GLB validation passed: ${filePath}`);
      return true;
    } catch (error) {
      logger.error('GLB validation error:', error);
      return false;
    }
  }
}
