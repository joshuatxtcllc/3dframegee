# 3D Picture Frame Generator for Jaysframes.com

A powerful web-based 3D picture frame generator that allows customers to visualize custom frames in real-time and export them in AR-compatible formats (GLB and USDZ).

## Features

- **Real-time 3D Visualization**: Interactive 3D rendering using Three.js
- **Customizable Parameters**:
  - Frame dimensions (width, height, depth)
  - Border width
  - Multiple material options (wood, metal, gold, silver, etc.)
  - Optional matte with customizable width and color
  - Optional glass with adjustable reflectivity
- **Export Capabilities**:
  - GLB format (for web and Android AR)
  - USDZ format (for iOS AR)
- **AR Integration**: Generated models can be viewed in augmented reality on mobile devices

## Project Structure

```
3dframegee/
├── index.html                  # Main HTML entry point
├── README.md                   # Project documentation
├── LICENSE                     # License information
├── .gitignore                  # Git ignore rules
├── assets/
│   ├── css/
│   │   └── styles.css         # Application styles
│   └── textures/              # Texture files for materials
│       ├── wood/              # Wood textures
│       ├── metal/             # Metal textures
│       └── decorative/        # Decorative textures
├── js/
│   ├── app.js                 # Main application logic
│   └── components/
│       ├── frameGenerator.js  # Frame generation logic
│       ├── materialLibrary.js # Material management
│       └── ui.js              # User interface controls
└── examples/
    ├── sample-models/         # Example exported models
    └── screenshots/           # Application screenshots
```

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/joshuatxtcllc/3dframegee.git
   cd 3dframegee
   ```

2. Serve the application using a local web server. You can use any of these methods:

   **Using Python 3:**
   ```bash
   python -m http.server 8000
   ```

   **Using Node.js (http-server):**
   ```bash
   npx http-server -p 8000
   ```

   **Using PHP:**
   ```bash
   php -S localhost:8000
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

## Usage

### Generating a Custom Frame

1. **Adjust Frame Dimensions**:
   - Use the sliders to set width, height, and depth
   - Adjust border width to your preference

2. **Choose Material**:
   - Select from various materials including wood, gold, silver, black, white, and textured options

3. **Configure Matte** (Optional):
   - Check "Include Matte" to add a matte border
   - Adjust matte width and color

4. **Configure Glass** (Optional):
   - Check "Include Glass" to add a glass layer
   - Adjust glass reflectivity for desired effect

5. **Generate**:
   - Click "Generate Frame" to create the 3D model
   - Use your mouse to rotate, zoom, and pan the camera

### Exporting Models

- **Export GLB**: Click "Export GLB" to download the model in GLB format (compatible with web and Android AR)
- **Export USDZ**: Click "Export USDZ" to download the model in USDZ format (compatible with iOS AR)

### AR Integration

#### For iOS (USDZ):
```html
<a href="path/to/frame.usdz" rel="ar">
    <img src="preview.jpg" alt="View in AR">
</a>
```

#### For Web/Android (GLB):
```html
<model-viewer
    src="path/to/frame.glb"
    alt="3D Frame Model"
    auto-rotate
    camera-controls
    ar>
</model-viewer>
```

## Technologies Used

- **Three.js**: 3D graphics library
- **WebGL**: Hardware-accelerated 3D rendering
- **JavaScript ES6 Modules**: Modern JavaScript architecture
- **HTML5 & CSS3**: Modern web standards

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Note**: AR features require compatible mobile devices:
- iOS devices with ARKit support (iPhone 6S and later)
- Android devices with ARCore support

## Adding Custom Textures

To add custom textures for frame materials:

1. Place texture files in the appropriate directory:
   - Wood textures: `assets/textures/wood/`
   - Metal textures: `assets/textures/metal/`
   - Decorative textures: `assets/textures/decorative/`

2. Update `js/components/materialLibrary.js` to load your new textures:
   ```javascript
   this.loadTexturedMaterial(
       'materialName',
       'assets/textures/category/diffuse_map.jpg',
       'assets/textures/category/normal_map.jpg',
       roughness,
       metalness
   );
   ```

3. Add the new material option to the UI in `js/components/ui.js`

## Development

### Running in Development Mode

The application uses ES6 modules and loads Three.js from a CDN. No build process is required for development.

### Key Components

- **FrameVisualizerApp** (`app.js`): Main application class managing the 3D scene
- **FrameGenerator** (`frameGenerator.js`): Handles 3D frame model generation
- **MaterialLibrary** (`materialLibrary.js`): Manages frame materials and textures
- **UI** (`ui.js`): Manages user interface and controls

## Future Enhancements

- [ ] Support for custom image uploads
- [ ] Additional frame shapes (oval, round, octagonal)
- [ ] Advanced lighting controls
- [ ] Batch export functionality
- [ ] Backend integration for saving configurations
- [ ] Social sharing features
- [ ] Mobile-optimized interface
- [ ] Material editor for custom textures
- [ ] Frame shadow customization
- [ ] Multiple frame styles and profiles

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or support, please contact:
- Website: [Jaysframes.com](https://jaysframes.com)
- Email: support@jaysframes.com

## Acknowledgments

- Three.js community for excellent documentation
- WebGL contributors
- Open-source texture providers

---

**Made with ❤️ for Jaysframes.com**
