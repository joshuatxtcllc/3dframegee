// app.js - Main application file
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js';
import { FrameGenerator } from './components/frameGenerator.js';
import { MaterialLibrary } from './components/materialLibrary.js';
import { UI } from './components/ui.js';

class FrameVisualizerApp {
    constructor() {
        // Initialize Three.js scene, camera, renderer
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        // Setup camera position and controls
        this.camera.position.set(0, 0, 5);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;
        this.controls.enableZoom = true;

        // Setup lighting
        this.setupLights();

        // Initialize components
        this.materialLibrary = new MaterialLibrary();
        this.frameGenerator = new FrameGenerator(this.scene, this.materialLibrary);
        this.ui = new UI(this);

        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Start rendering loop
        this.animate();
    }

    setupLights() {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Add directional lights for better shadows and highlights
        const mainLight = new THREE.DirectionalLight(0xffffff, 1);
        mainLight.position.set(5, 10, 7.5);
        mainLight.castShadow = true;
        this.scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.7);
        fillLight.position.set(-5, 8, -7.5);
        this.scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
        rimLight.position.set(0, -10, 0);
        this.scene.add(rimLight);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    // Generate frame with given parameters
    generateFrame(params) {
        // Clear previous frame if exists
        if (this.currentFrame) {
            this.scene.remove(this.currentFrame);
        }

        // Generate new frame
        this.currentFrame = this.frameGenerator.createFrame(params);
        this.scene.add(this.currentFrame);

        // Reset camera position to focus on the frame
        this.resetCameraPosition();
    }

    resetCameraPosition() {
        this.camera.position.set(0, 0, 5);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    // Export current frame as GLB
    exportGLB() {
        if (!this.currentFrame) {
            alert('Please generate a frame first before exporting!');
            return;
        }

        const exporter = new GLTFExporter();
        exporter.parse(
            this.currentFrame,
            (gltf) => {
                const blob = new Blob([gltf], { type: 'application/octet-stream' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'frame.glb';
                link.click();
                URL.revokeObjectURL(link.href);
            },
            (error) => {
                console.error('An error happened during GLB export:', error);
            },
            { binary: true }
        );
    }

    // Export current frame as USDZ
    exportUSDZ() {
        if (!this.currentFrame) {
            alert('Please generate a frame first before exporting!');
            return;
        }

        const exporter = new USDZExporter();
        exporter.parse(this.currentFrame)
            .then((usdz) => {
                const blob = new Blob([usdz], { type: 'application/octet-stream' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'frame.usdz';
                link.click();
                URL.revokeObjectURL(link.href);
            })
            .catch((error) => {
                console.error('An error happened during USDZ export:', error);
            });
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new FrameVisualizerApp();
    window.app = app; // Make app accessible globally for debugging
});
