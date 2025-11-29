// frameGenerator.js - Module for generating 3D frame models
import * as THREE from 'three';

export class FrameGenerator {
    constructor(scene, materialLibrary) {
        this.scene = scene;
        this.materials = materialLibrary;
    }

    createFrame(params) {
        const {
            width = 30,             // Width in cm
            height = 40,            // Height in cm
            depth = 2,              // Depth in cm
            borderWidth = 2,        // Frame border width in cm
            materialName = 'wood',  // Material to use
            matteWidth = 4,         // Matte border width in cm (0 for no matte)
            matteColor = '#ffffff', // Color of the matte
            hasGlass = true,        // Whether to include glass
            glassReflectivity = 0.1 // Glass reflectivity level
        } = params;

        // Create frame group
        const frameGroup = new THREE.Group();

        // Get material based on name
        const frameMaterial = this.materials.getMaterial(materialName);

        // Create outer frame
        const outerFrame = this.createOuterFrame(width, height, depth, borderWidth, frameMaterial);
        frameGroup.add(outerFrame);

        // Create matte if matteWidth is greater than 0
        if (matteWidth > 0) {
            const matte = this.createMatte(
                width - borderWidth * 2,
                height - borderWidth * 2,
                depth - 0.5,
                matteWidth,
                matteColor
            );
            matte.position.z = -0.25; // Position slightly behind the front of the frame
            frameGroup.add(matte);
        }

        // Add glass if needed
        if (hasGlass) {
            const glass = this.createGlass(
                width - borderWidth * 2,
                height - borderWidth * 2,
                glassReflectivity
            );
            glass.position.z = -0.2; // Position slightly in front of the matte
            frameGroup.add(glass);
        }

        // Add picture background (can be replaced with actual texture later)
        const innerWidth = width - (borderWidth * 2) - (matteWidth * 2);
        const innerHeight = height - (borderWidth * 2) - (matteWidth * 2);

        const pictureBackground = this.createPictureBackground(innerWidth, innerHeight);
        pictureBackground.position.z = -0.3; // Position behind glass and matte
        frameGroup.add(pictureBackground);

        // Center the frame in the scene
        frameGroup.position.set(0, 0, 0);

        return frameGroup;
    }

    createOuterFrame(width, height, depth, borderWidth, material) {
        const frameGroup = new THREE.Group();

        // Frame dimensions
        const outerWidth = width;
        const outerHeight = height;
        const innerWidth = width - (borderWidth * 2);
        const innerHeight = height - (borderWidth * 2);

        // Create frame geometry using ExtrudeGeometry for better detail
        const outerShape = new THREE.Shape();
        outerShape.moveTo(0, 0);
        outerShape.lineTo(0, outerHeight);
        outerShape.lineTo(outerWidth, outerHeight);
        outerShape.lineTo(outerWidth, 0);
        outerShape.lineTo(0, 0);

        const innerShape = new THREE.Shape();
        innerShape.moveTo(borderWidth, borderWidth);
        innerShape.lineTo(borderWidth, outerHeight - borderWidth);
        innerShape.lineTo(outerWidth - borderWidth, outerHeight - borderWidth);
        innerShape.lineTo(outerWidth - borderWidth, borderWidth);
        innerShape.lineTo(borderWidth, borderWidth);

        outerShape.holes.push(innerShape);

        const extrudeSettings = {
            steps: 2,
            depth: depth,
            bevelEnabled: true,
            bevelThickness: 0.5,
            bevelSize: 0.3,
            bevelOffset: 0,
            bevelSegments: 5
        };

        const frameGeometry = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
        const frame = new THREE.Mesh(frameGeometry, material);

        // Center frame
        frame.position.set(-outerWidth / 2, -outerHeight / 2, -depth / 2);

        frameGroup.add(frame);
        return frameGroup;
    }

    createMatte(width, height, depth, matteWidth, matteColor) {
        const matteGroup = new THREE.Group();

        // Outer and inner dimensions
        const outerWidth = width;
        const outerHeight = height;
        const innerWidth = width - (matteWidth * 2);
        const innerHeight = height - (matteWidth * 2);

        // Create matte geometry
        const outerShape = new THREE.Shape();
        outerShape.moveTo(0, 0);
        outerShape.lineTo(0, outerHeight);
        outerShape.lineTo(outerWidth, outerHeight);
        outerShape.lineTo(outerWidth, 0);
        outerShape.lineTo(0, 0);

        const innerShape = new THREE.Shape();
        innerShape.moveTo(matteWidth, matteWidth);
        innerShape.lineTo(matteWidth, outerHeight - matteWidth);
        innerShape.lineTo(outerWidth - matteWidth, outerHeight - matteWidth);
        innerShape.lineTo(outerWidth - matteWidth, matteWidth);
        innerShape.lineTo(matteWidth, matteWidth);

        outerShape.holes.push(innerShape);

        const matteMaterial = new THREE.MeshStandardMaterial({
            color: matteColor,
            roughness: 0.8,
            metalness: 0
        });

        const extrudeSettings = {
            steps: 1,
            depth: 0.2,
            bevelEnabled: false
        };

        const matteGeometry = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
        const matte = new THREE.Mesh(matteGeometry, matteMaterial);

        // Center matte
        matte.position.set(-outerWidth / 2, -outerHeight / 2, -depth / 2);

        matteGroup.add(matte);
        return matteGroup;
    }

    createGlass(width, height, reflectivity) {
        // Create glass geometry (simple plane)
        const glassGeometry = new THREE.PlaneGeometry(width, height);

        // Create glass material with transparency and reflectivity
        const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.2,
            roughness: 0.05,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            reflectivity: reflectivity,
            side: THREE.DoubleSide
        });

        const glass = new THREE.Mesh(glassGeometry, glassMaterial);

        return glass;
    }

    createPictureBackground(width, height) {
        // Create background geometry
        const backgroundGeometry = new THREE.PlaneGeometry(width, height);

        // Create basic background material (can be replaced with actual texture)
        const backgroundMaterial = new THREE.MeshStandardMaterial({
            color: 0xf2f2f2,
            roughness: 0.7,
            metalness: 0
        });

        const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);

        return background;
    }
}
