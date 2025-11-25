import * as THREE from 'three';
import { Material, MaterialTexture } from '../types/database';
import { logger } from '../utils/logger';

export class MaterialMapper {
  /**
   * Create a PBR material based on frame material and finish
   */
  createMaterial(material: Material, finish: string, color: string): THREE.MeshStandardMaterial {
    logger.info(`Creating material: ${material}, finish: ${finish}, color: ${color}`);

    const materialProps = this.getMaterialProperties(material, finish, color);
    
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(materialProps.albedo_color),
      roughness: materialProps.roughness,
      metalness: materialProps.metallic,
      envMapIntensity: 1.0,
    });
  }

  /**
   * Get material properties based on material type and finish
   */
  private getMaterialProperties(material: Material, finish: string, color: string): MaterialTexture {
    const baseColor = this.normalizeColor(color);

    switch (material) {
      case Material.WOOD:
        return this.getWoodMaterial(finish, baseColor);
      case Material.METAL:
        return this.getMetalMaterial(finish, baseColor);
      case Material.ACRYLIC:
        return this.getAcrylicMaterial(finish, baseColor);
      case Material.COMPOSITE:
        return this.getCompositeMaterial(finish, baseColor);
      case Material.FABRIC:
        return this.getFabricMaterial(finish, baseColor);
      default:
        return this.getWoodMaterial(finish, baseColor);
    }
  }

  /**
   * Wood material properties
   */
  private getWoodMaterial(finish: string, color: string): MaterialTexture {
    const isGlossy = finish.toLowerCase().includes('gloss') || finish.toLowerCase().includes('polish');
    
    return {
      material: Material.WOOD,
      albedo_color: color,
      roughness: isGlossy ? 0.2 : 0.7,
      metallic: 0.0,
    };
  }

  /**
   * Metal material properties
   */
  private getMetalMaterial(finish: string, color: string): MaterialTexture {
    const isBrushed = finish.toLowerCase().includes('brush');
    const isMatte = finish.toLowerCase().includes('matte');
    
    return {
      material: Material.METAL,
      albedo_color: color,
      roughness: isMatte ? 0.5 : (isBrushed ? 0.3 : 0.1),
      metallic: 0.9,
    };
  }

  /**
   * Acrylic material properties
   */
  private getAcrylicMaterial(finish: string, color: string): MaterialTexture {
    return {
      material: Material.ACRYLIC,
      albedo_color: color,
      roughness: 0.1,
      metallic: 0.0,
    };
  }

  /**
   * Composite material properties
   */
  private getCompositeMaterial(finish: string, color: string): MaterialTexture {
    const isTextured = finish.toLowerCase().includes('texture');
    
    return {
      material: Material.COMPOSITE,
      albedo_color: color,
      roughness: isTextured ? 0.6 : 0.4,
      metallic: 0.0,
    };
  }

  /**
   * Fabric material properties
   */
  private getFabricMaterial(finish: string, color: string): MaterialTexture {
    return {
      material: Material.FABRIC,
      albedo_color: color,
      roughness: 0.8,
      metallic: 0.0,
    };
  }

  /**
   * Normalize color input to hex format
   */
  private normalizeColor(color: string): string {
    // If already hex, return as-is
    if (color.startsWith('#')) {
      return color;
    }

    // Map common color names to hex
    const colorMap: { [key: string]: string } = {
      black: '#1a1a1a',
      white: '#f5f5f5',
      silver: '#c0c0c0',
      gold: '#ffd700',
      bronze: '#cd7f32',
      brass: '#b5a642',
      copper: '#b87333',
      'antique gold': '#c9ae5d',
      'champagne gold': '#f7e7ce',
      'rose gold': '#b76e79',
      walnut: '#5c4033',
      oak: '#c19a6b',
      cherry: '#8b4513',
      maple: '#d4a373',
      mahogany: '#420d09',
      espresso: '#3e2723',
      natural: '#deb887',
      'natural wood': '#deb887',
      navy: '#000080',
      blue: '#0047ab',
      red: '#8b0000',
      green: '#228b22',
      gray: '#808080',
      grey: '#808080',
      beige: '#f5f5dc',
      cream: '#fffdd0',
      brown: '#654321',
      'dark brown': '#3e2723',
      'light brown': '#a67b5b',
    };

    const normalized = color.toLowerCase().trim();
    return colorMap[normalized] || '#8b7355'; // Default to medium brown
  }

  /**
   * Create environment map for realistic reflections
   */
  createEnvironmentMap(): THREE.CubeTexture {
    // Create a simple gradient environment map
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, '#87ceeb'); // Sky blue
    gradient.addColorStop(1, '#ffffff'); // White

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // This is a simplified version - in production, you'd use actual HDR environment maps
    const texture = new THREE.CanvasTexture(canvas);
    
    // For now, return a basic cube texture
    // In production, load proper HDR environments
    return texture as any;
  }
}
