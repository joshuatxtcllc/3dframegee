// materialLibrary.js - Manages materials for frames
import * as THREE from 'three';
import { TextureLoader } from 'three';

export class MaterialLibrary {
    constructor() {
        this.textureLoader = new TextureLoader();
        this.materials = {};
        this.initializeMaterials();
    }

    initializeMaterials() {
        // Basic wood material
        this.materials.wood = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.7,
            metalness: 0.1
        });

        // Gold frame
        this.materials.gold = new THREE.MeshStandardMaterial({
            color: 0xD4AF37,
            roughness: 0.3,
            metalness: 0.8
        });

        // Silver frame
        this.materials.silver = new THREE.MeshStandardMaterial({
            color: 0xC0C0C0,
            roughness: 0.2,
            metalness: 0.9
        });

        // Black frame
        this.materials.black = new THREE.MeshStandardMaterial({
            color: 0x000000,
            roughness: 0.7,
            metalness: 0.1
        });

        // White frame
        this.materials.white = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 0.7,
            metalness: 0.1
        });

        // Load textures for additional materials
        this.loadTexturedMaterials();
    }

    loadTexturedMaterials() {
        // Wood textures
        this.loadTexturedMaterial('oakWood', 'assets/textures/wood/oak_wood_diffuse.jpg', 'assets/textures/wood/oak_wood_normal.jpg', 0.7, 0.1);
        this.loadTexturedMaterial('walnut', 'assets/textures/wood/walnut_diffuse.jpg', 'assets/textures/wood/walnut_normal.jpg', 0.7, 0.1);
        this.loadTexturedMaterial('mahogany', 'assets/textures/wood/mahogany_diffuse.jpg', 'assets/textures/wood/mahogany_normal.jpg', 0.7, 0.1);

        // Metallic textures
        this.loadTexturedMaterial('brushedMetal', 'assets/textures/metal/brushed_metal_diffuse.jpg', 'assets/textures/metal/brushed_metal_normal.jpg', 0.4, 0.8);
        this.loadTexturedMaterial('antiqueBrass', 'assets/textures/metal/antique_brass_diffuse.jpg', 'assets/textures/metal/antique_brass_normal.jpg', 0.4, 0.7);

        // Decorative textures
        this.loadTexturedMaterial('ornate', 'assets/textures/decorative/ornate_diffuse.jpg', 'assets/textures/decorative/ornate_normal.jpg', 0.6, 0.3);
    }

    loadTexturedMaterial(name, diffuseMap, normalMap, roughness, metalness) {
        // Create and store material with textures
        // Note: In a production environment, you would want to implement proper loading and error handling
        const material = new THREE.MeshStandardMaterial({
            roughness: roughness,
            metalness: metalness
        });

        // Load textures asynchronously
        this.textureLoader.load(
            diffuseMap,
            (texture) => {
                material.map = texture;
                material.needsUpdate = true;
            },
            undefined,
            (err) => console.error(`Error loading texture ${diffuseMap}:`, err)
        );

        this.textureLoader.load(
            normalMap,
            (texture) => {
                material.normalMap = texture;
                material.needsUpdate = true;
            },
            undefined,
            (err) => console.error(`Error loading texture ${normalMap}:`, err)
        );

        this.materials[name] = material;
    }

    // Get a material by name, returns default if not found
    getMaterial(name) {
        return this.materials[name] || this.materials.wood;
    }

    // Returns list of available material names
    getMaterialList() {
        return Object.keys(this.materials);
    }
}
