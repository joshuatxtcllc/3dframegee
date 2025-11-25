import * as THREE from 'three';
import { ProfileType, FrameProfile } from '../types/database';
import { logger } from '../utils/logger';

export class GeometryGenerator {
  // Constants for frame geometry
  private static readonly INCHES_TO_METERS = 0.0254;
  private static readonly SEGMENTS_PER_INCH = 4; // Resolution for curves

  /**
   * Generate 3D geometry for a frame based on profile type and dimensions
   */
  generateFrameGeometry(profile: FrameProfile, outerWidth: number, outerHeight: number): THREE.BufferGeometry {
    logger.info(`Generating geometry for ${profile.type} frame: ${outerWidth}x${outerHeight}`);

    switch (profile.type) {
      case ProfileType.FLAT:
        return this.generateFlatProfile(profile, outerWidth, outerHeight);
      case ProfileType.STEPPED:
        return this.generateSteppedProfile(profile, outerWidth, outerHeight);
      case ProfileType.FLOAT:
        return this.generateFloatProfile(profile, outerWidth, outerHeight);
      case ProfileType.ORNATE:
        return this.generateOrnateProfile(profile, outerWidth, outerHeight);
      case ProfileType.SHADOWBOX:
        return this.generateShadowBoxProfile(profile, outerWidth, outerHeight);
      case ProfileType.CANVAS_WRAP:
        return this.generateCanvasWrapProfile(profile, outerWidth, outerHeight);
      default:
        return this.generateFlatProfile(profile, outerWidth, outerHeight);
    }
  }

  /**
   * Generate a simple flat frame profile
   */
  private generateFlatProfile(profile: FrameProfile, outerWidth: number, outerHeight: number): THREE.BufferGeometry {
    const frameWidth = profile.width * GeometryGenerator.INCHES_TO_METERS;
    const frameDepth = profile.depth * GeometryGenerator.INCHES_TO_METERS;
    const outerW = outerWidth * GeometryGenerator.INCHES_TO_METERS;
    const outerH = outerHeight * GeometryGenerator.INCHES_TO_METERS;
    
    // Create the frame profile shape (cross-section)
    const shape = new THREE.Shape();
    
    // Outer rectangle
    shape.moveTo(0, 0);
    shape.lineTo(frameWidth, 0);
    shape.lineTo(frameWidth, frameDepth);
    shape.lineTo(0, frameDepth);
    shape.lineTo(0, 0);
    
    // Inner rectangle (hole for artwork) - if rabbet exists
    if (profile.rabbet_width && profile.rabbet_depth) {
      const rabbitWidth = profile.rabbet_width * GeometryGenerator.INCHES_TO_METERS;
      const rabbitDepth = profile.rabbet_depth * GeometryGenerator.INCHES_TO_METERS;
      
      const hole = new THREE.Path();
      const offset = (frameWidth - rabbitWidth) / 2;
      hole.moveTo(offset, frameDepth - rabbitDepth);
      hole.lineTo(offset + rabbitWidth, frameDepth - rabbitDepth);
      hole.lineTo(offset + rabbitWidth, frameDepth);
      hole.lineTo(offset, frameDepth);
      hole.lineTo(offset, frameDepth - rabbitDepth);
      
      shape.holes.push(hole);
    }

    // Create four sides of the frame
    const geometries: THREE.BufferGeometry[] = [];

    // Top
    const topGeometry = this.extrudeProfileAlongPath(shape, [
      new THREE.Vector3(-outerW / 2, outerH / 2, 0),
      new THREE.Vector3(outerW / 2, outerH / 2, 0),
    ]);
    geometries.push(topGeometry);

    // Right
    const rightGeometry = this.extrudeProfileAlongPath(shape, [
      new THREE.Vector3(outerW / 2, outerH / 2, 0),
      new THREE.Vector3(outerW / 2, -outerH / 2, 0),
    ]);
    geometries.push(rightGeometry);

    // Bottom
    const bottomGeometry = this.extrudeProfileAlongPath(shape, [
      new THREE.Vector3(outerW / 2, -outerH / 2, 0),
      new THREE.Vector3(-outerW / 2, -outerH / 2, 0),
    ]);
    geometries.push(bottomGeometry);

    // Left
    const leftGeometry = this.extrudeProfileAlongPath(shape, [
      new THREE.Vector3(-outerW / 2, -outerH / 2, 0),
      new THREE.Vector3(-outerW / 2, outerH / 2, 0),
    ]);
    geometries.push(leftGeometry);

    // Merge all geometries
    const mergedGeometry = this.mergeGeometries(geometries);
    
    // Center the geometry
    mergedGeometry.center();
    
    return mergedGeometry;
  }

  /**
   * Generate a stepped (rabbeted) profile frame
   */
  private generateSteppedProfile(profile: FrameProfile, outerWidth: number, outerHeight: number): THREE.BufferGeometry {
    const frameWidth = profile.width * GeometryGenerator.INCHES_TO_METERS;
    const frameDepth = profile.depth * GeometryGenerator.INCHES_TO_METERS;
    const rabbitWidth = (profile.rabbet_width || 0.25) * GeometryGenerator.INCHES_TO_METERS;
    const rabbitDepth = (profile.rabbet_depth || 0.25) * GeometryGenerator.INCHES_TO_METERS;
    
    // Create stepped profile shape
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(frameWidth, 0);
    shape.lineTo(frameWidth, frameDepth - rabbitDepth);
    shape.lineTo(frameWidth - rabbitWidth, frameDepth - rabbitDepth);
    shape.lineTo(frameWidth - rabbitWidth, frameDepth);
    shape.lineTo(0, frameDepth);
    shape.lineTo(0, 0);

    const outerW = outerWidth * GeometryGenerator.INCHES_TO_METERS;
    const outerH = outerHeight * GeometryGenerator.INCHES_TO_METERS;

    const geometries: THREE.BufferGeometry[] = [];

    // Create four sides
    geometries.push(this.extrudeProfileAlongPath(shape, [
      new THREE.Vector3(-outerW / 2, outerH / 2, 0),
      new THREE.Vector3(outerW / 2, outerH / 2, 0),
    ]));
    
    geometries.push(this.extrudeProfileAlongPath(shape, [
      new THREE.Vector3(outerW / 2, outerH / 2, 0),
      new THREE.Vector3(outerW / 2, -outerH / 2, 0),
    ]));
    
    geometries.push(this.extrudeProfileAlongPath(shape, [
      new THREE.Vector3(outerW / 2, -outerH / 2, 0),
      new THREE.Vector3(-outerW / 2, -outerH / 2, 0),
    ]));
    
    geometries.push(this.extrudeProfileAlongPath(shape, [
      new THREE.Vector3(-outerW / 2, -outerH / 2, 0),
      new THREE.Vector3(-outerW / 2, outerH / 2, 0),
    ]));

    const mergedGeometry = this.mergeGeometries(geometries);
    mergedGeometry.center();
    
    return mergedGeometry;
  }

  /**
   * Generate a float/shadow box frame
   */
  private generateFloatProfile(profile: FrameProfile, outerWidth: number, outerHeight: number): THREE.BufferGeometry {
    const frameWidth = profile.width * GeometryGenerator.INCHES_TO_METERS;
    const frameDepth = profile.depth * GeometryGenerator.INCHES_TO_METERS;
    const lipHeight = (profile.lip_height || 0.5) * GeometryGenerator.INCHES_TO_METERS;
    
    // L-shaped profile for float effect
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(frameWidth, 0);
    shape.lineTo(frameWidth, lipHeight);
    shape.lineTo(frameWidth * 0.3, lipHeight);
    shape.lineTo(frameWidth * 0.3, frameDepth);
    shape.lineTo(0, frameDepth);
    shape.lineTo(0, 0);

    const outerW = outerWidth * GeometryGenerator.INCHES_TO_METERS;
    const outerH = outerHeight * GeometryGenerator.INCHES_TO_METERS;

    const geometries: THREE.BufferGeometry[] = [];

    geometries.push(this.extrudeProfileAlongPath(shape, [
      new THREE.Vector3(-outerW / 2, outerH / 2, 0),
      new THREE.Vector3(outerW / 2, outerH / 2, 0),
    ]));
    
    geometries.push(this.extrudeProfileAlongPath(shape, [
      new THREE.Vector3(outerW / 2, outerH / 2, 0),
      new THREE.Vector3(outerW / 2, -outerH / 2, 0),
    ]));
    
    geometries.push(this.extrudeProfileAlongPath(shape, [
      new THREE.Vector3(outerW / 2, -outerH / 2, 0),
      new THREE.Vector3(-outerW / 2, -outerH / 2, 0),
    ]));
    
    geometries.push(this.extrudeProfileAlongPath(shape, [
      new THREE.Vector3(-outerW / 2, -outerH / 2, 0),
      new THREE.Vector3(-outerW / 2, outerH / 2, 0),
    ]));

    const mergedGeometry = this.mergeGeometries(geometries);
    mergedGeometry.center();
    
    return mergedGeometry;
  }

  /**
   * Generate an ornate decorative profile
   */
  private generateOrnateProfile(profile: FrameProfile, outerWidth: number, outerHeight: number): THREE.BufferGeometry {
    const frameWidth = profile.width * GeometryGenerator.INCHES_TO_METERS;
    const frameDepth = profile.depth * GeometryGenerator.INCHES_TO_METERS;
    const detailScale = profile.ornate_detail_scale || 0.1;
    
    // Ornate profile with curved details
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    
    // Add decorative curve at top
    shape.lineTo(frameWidth * 0.2, 0);
    shape.quadraticCurveTo(
      frameWidth * 0.5, -frameDepth * detailScale,
      frameWidth * 0.8, 0
    );
    shape.lineTo(frameWidth, 0);
    shape.lineTo(frameWidth, frameDepth * 0.7);
    shape.quadraticCurveTo(
      frameWidth * 0.7, frameDepth * 0.85,
      frameWidth * 0.5, frameDepth
    );
    shape.lineTo(0, frameDepth);
    shape.lineTo(0, 0);

    const outerW = outerWidth * GeometryGenerator.INCHES_TO_METERS;
    const outerH = outerHeight * GeometryGenerator.INCHES_TO_METERS;

    const geometries: THREE.BufferGeometry[] = [];

    geometries.push(this.extrudeProfileAlongPath(shape, [
      new THREE.Vector3(-outerW / 2, outerH / 2, 0),
      new THREE.Vector3(outerW / 2, outerH / 2, 0),
    ]));
    
    geometries.push(this.extrudeProfileAlongPath(shape, [
      new THREE.Vector3(outerW / 2, outerH / 2, 0),
      new THREE.Vector3(outerW / 2, -outerH / 2, 0),
    ]));
    
    geometries.push(this.extrudeProfileAlongPath(shape, [
      new THREE.Vector3(outerW / 2, -outerH / 2, 0),
      new THREE.Vector3(-outerW / 2, -outerH / 2, 0),
    ]));
    
    geometries.push(this.extrudeProfileAlongPath(shape, [
      new THREE.Vector3(-outerW / 2, -outerH / 2, 0),
      new THREE.Vector3(-outerW / 2, outerH / 2, 0),
    ]));

    const mergedGeometry = this.mergeGeometries(geometries);
    mergedGeometry.center();
    
    return mergedGeometry;
  }

  /**
   * Generate shadow box (deep frame) profile
   */
  private generateShadowBoxProfile(profile: FrameProfile, outerWidth: number, outerHeight: number): THREE.BufferGeometry {
    // Shadow boxes are essentially deep flat frames
    const deepProfile = { ...profile, depth: Math.max(profile.depth, 2) };
    return this.generateFlatProfile(deepProfile, outerWidth, outerHeight);
  }

  /**
   * Generate canvas wrap profile (for gallery wrap canvases)
   */
  private generateCanvasWrapProfile(profile: FrameProfile, outerWidth: number, outerHeight: number): THREE.BufferGeometry {
    const frameWidth = profile.width * GeometryGenerator.INCHES_TO_METERS;
    const frameDepth = profile.depth * GeometryGenerator.INCHES_TO_METERS;
    
    // Simple rectangular profile for canvas wraps
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(frameWidth, 0);
    shape.lineTo(frameWidth, frameDepth);
    shape.lineTo(0, frameDepth);
    shape.lineTo(0, 0);

    const outerW = outerWidth * GeometryGenerator.INCHES_TO_METERS;
    const outerH = outerHeight * GeometryGenerator.INCHES_TO_METERS;

    const geometries: THREE.BufferGeometry[] = [];

    geometries.push(this.extrudeProfileAlongPath(shape, [
      new THREE.Vector3(-outerW / 2, outerH / 2, 0),
      new THREE.Vector3(outerW / 2, outerH / 2, 0),
    ]));
    
    geometries.push(this.extrudeProfileAlongPath(shape, [
      new THREE.Vector3(outerW / 2, outerH / 2, 0),
      new THREE.Vector3(outerW / 2, -outerH / 2, 0),
    ]));
    
    geometries.push(this.extrudeProfileAlongPath(shape, [
      new THREE.Vector3(outerW / 2, -outerH / 2, 0),
      new THREE.Vector3(-outerW / 2, -outerH / 2, 0),
    ]));
    
    geometries.push(this.extrudeProfileAlongPath(shape, [
      new THREE.Vector3(-outerW / 2, -outerH / 2, 0),
      new THREE.Vector3(-outerW / 2, outerH / 2, 0),
    ]));

    const mergedGeometry = this.mergeGeometries(geometries);
    mergedGeometry.center();
    
    return mergedGeometry;
  }

  /**
   * Extrude a 2D shape along a 3D path
   */
  private extrudeProfileAlongPath(shape: THREE.Shape, pathPoints: THREE.Vector3[]): THREE.BufferGeometry {
    const path = new THREE.CatmullRomCurve3(pathPoints);
    
    const extrudeSettings = {
      steps: pathPoints.length * 10,
      bevelEnabled: false,
      extrudePath: path,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  /**
   * Merge multiple geometries into one
   */
  private mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const mergedGeometry = new THREE.BufferGeometry();
    
    let totalVertices = 0;
    let totalIndices = 0;

    // Calculate totals
    geometries.forEach((geo) => {
      totalVertices += geo.attributes.position.count;
      if (geo.index) {
        totalIndices += geo.index.count;
      }
    });

    // Create merged arrays
    const positions = new Float32Array(totalVertices * 3);
    const normals = new Float32Array(totalVertices * 3);
    const uvs = new Float32Array(totalVertices * 2);
    const indices = new Uint32Array(totalIndices);

    let vertexOffset = 0;
    let indexOffset = 0;
    let baseVertex = 0;

    geometries.forEach((geo) => {
      // Positions
      const posAttr = geo.attributes.position;
      positions.set(posAttr.array as Float32Array, vertexOffset * 3);

      // Normals
      if (geo.attributes.normal) {
        const normAttr = geo.attributes.normal;
        normals.set(normAttr.array as Float32Array, vertexOffset * 3);
      }

      // UVs
      if (geo.attributes.uv) {
        const uvAttr = geo.attributes.uv;
        uvs.set(uvAttr.array as Float32Array, vertexOffset * 2);
      }

      // Indices
      if (geo.index) {
        const indexArray = geo.index.array;
        for (let i = 0; i < indexArray.length; i++) {
          indices[indexOffset + i] = indexArray[i] + baseVertex;
        }
        indexOffset += indexArray.length;
      }

      vertexOffset += posAttr.count;
      baseVertex += posAttr.count;
    });

    mergedGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    mergedGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    mergedGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    mergedGeometry.setIndex(new THREE.BufferAttribute(indices, 1));

    mergedGeometry.computeVertexNormals();

    return mergedGeometry;
  }
}
