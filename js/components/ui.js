// ui.js - Handles the user interface for the frame generator
export class UI {
    constructor(app) {
        this.app = app;
        this.initUI();
    }

    initUI() {
        // Create UI container
        const uiContainer = document.createElement('div');
        uiContainer.id = 'frame-controls';
        document.body.appendChild(uiContainer);

        // Create UI elements
        this.createFrameControls(uiContainer);
        this.createExportButtons(uiContainer);
    }

    createFrameControls(container) {
        container.innerHTML = `
            <h2>Frame Generator</h2>

            <div class="control-group">
                <label for="frame-width">Width (cm):</label>
                <input type="range" id="frame-width" min="10" max="100" value="30" />
                <span id="frame-width-value">30</span>
            </div>

            <div class="control-group">
                <label for="frame-height">Height (cm):</label>
                <input type="range" id="frame-height" min="10" max="100" value="40" />
                <span id="frame-height-value">40</span>
            </div>

            <div class="control-group">
                <label for="frame-depth">Depth (cm):</label>
                <input type="range" id="frame-depth" min="0.5" max="10" step="0.5" value="2" />
                <span id="frame-depth-value">2</span>
            </div>

            <div class="control-group">
                <label for="border-width">Border Width (cm):</label>
                <input type="range" id="border-width" min="0.5" max="10" step="0.5" value="2" />
                <span id="border-width-value">2</span>
            </div>

            <div class="control-group">
                <label for="material-selector">Frame Material:</label>
                <select id="material-selector">
                    <option value="wood">Wood</option>
                    <option value="gold">Gold</option>
                    <option value="silver">Silver</option>
                    <option value="black">Black</option>
                    <option value="white">White</option>
                    <option value="oakWood">Oak Wood</option>
                    <option value="walnut">Walnut</option>
                    <option value="mahogany">Mahogany</option>
                    <option value="brushedMetal">Brushed Metal</option>
                    <option value="antiqueBrass">Antique Brass</option>
                    <option value="ornate">Ornate</option>
                </select>
            </div>

            <div class="control-group">
                <label for="has-matte">Include Matte:</label>
                <input type="checkbox" id="has-matte" checked />
            </div>

            <div class="control-group matte-settings">
                <label for="matte-width">Matte Width (cm):</label>
                <input type="range" id="matte-width" min="0" max="15" step="0.5" value="4" />
                <span id="matte-width-value">4</span>
            </div>

            <div class="control-group matte-settings">
                <label for="matte-color">Matte Color:</label>
                <input type="color" id="matte-color" value="#ffffff" />
            </div>

            <div class="control-group">
                <label for="has-glass">Include Glass:</label>
                <input type="checkbox" id="has-glass" checked />
            </div>

            <div class="control-group glass-settings">
                <label for="glass-reflectivity">Glass Reflectivity:</label>
                <input type="range" id="glass-reflectivity" min="0" max="1" step="0.05" value="0.1" />
                <span id="glass-reflectivity-value">0.1</span>
            </div>

            <button id="generate-frame">Generate Frame</button>
        `;

        // Set up event listeners
        this.setupControlListeners();
    }

    createExportButtons(container) {
        const exportContainer = document.createElement('div');
        exportContainer.innerHTML = `
            <h3>Export 3D Model</h3>
            <div style="display: flex; gap: 10px;">
                <button id="export-glb">Export GLB</button>
                <button id="export-usdz">Export USDZ</button>
            </div>
        `;
        container.appendChild(exportContainer);

        // Set up export listeners
        document.getElementById('export-glb').addEventListener('click', () => {
            this.app.exportGLB();
        });

        document.getElementById('export-usdz').addEventListener('click', () => {
            this.app.exportUSDZ();
        });
    }

    setupControlListeners() {
        // Update value displays for sliders
        this.setupRangeListener('frame-width');
        this.setupRangeListener('frame-height');
        this.setupRangeListener('frame-depth');
        this.setupRangeListener('border-width');
        this.setupRangeListener('matte-width');
        this.setupRangeListener('glass-reflectivity');

        // Toggle matte settings visibility
        const hasMatteCheckbox = document.getElementById('has-matte');
        const matteSettings = document.querySelectorAll('.matte-settings');

        hasMatteCheckbox.addEventListener('change', () => {
            matteSettings.forEach(elem => {
                elem.style.display = hasMatteCheckbox.checked ? 'block' : 'none';
            });
        });

        // Toggle glass settings visibility
        const hasGlassCheckbox = document.getElementById('has-glass');
        const glassSettings = document.querySelectorAll('.glass-settings');

        hasGlassCheckbox.addEventListener('change', () => {
            glassSettings.forEach(elem => {
                elem.style.display = hasGlassCheckbox.checked ? 'block' : 'none';
            });
        });

        // Generate frame button
        document.getElementById('generate-frame').addEventListener('click', () => {
            this.generateFrameFromUI();
        });
    }

    setupRangeListener(id) {
        const input = document.getElementById(id);
        const valueDisplay = document.getElementById(`${id}-value`);

        input.addEventListener('input', () => {
            valueDisplay.textContent = input.value;
        });
    }

    generateFrameFromUI() {
        const params = {
            width: parseFloat(document.getElementById('frame-width').value),
            height: parseFloat(document.getElementById('frame-height').value),
            depth: parseFloat(document.getElementById('frame-depth').value),
            borderWidth: parseFloat(document.getElementById('border-width').value),
            materialName: document.getElementById('material-selector').value,
            matteWidth: document.getElementById('has-matte').checked ?
                        parseFloat(document.getElementById('matte-width').value) : 0,
            matteColor: document.getElementById('matte-color').value,
            hasGlass: document.getElementById('has-glass').checked,
            glassReflectivity: parseFloat(document.getElementById('glass-reflectivity').value)
        };

        this.app.generateFrame(params);
    }
}
