# Sample 3D Frame Models

This directory contains example 3D frame models exported from the application.

## Purpose

These sample models demonstrate:
- The quality of exported GLB and USDZ files
- Different frame configurations and materials
- AR compatibility for mobile devices

## File Formats

### GLB (GL Transmission Format Binary)
- Compatible with: Web browsers, Android AR (ARCore), Windows Mixed Reality
- File extension: `.glb`
- Usage: Universal 3D model format for web and AR applications

### USDZ (Universal Scene Description)
- Compatible with: iOS AR (ARKit), macOS
- File extension: `.usdz`
- Usage: Apple's AR format for iPhone and iPad Quick Look

## Sample Models

Example models you can generate and place here:

1. **classic_frame.glb** / **classic_frame.usdz**
   - Wood material
   - Standard dimensions (30x40 cm)
   - White matte
   - Glass included

2. **modern_frame.glb** / **modern_frame.usdz**
   - Black material
   - Larger dimensions (50x70 cm)
   - No matte
   - Glass included

3. **ornate_frame.glb** / **ornate_frame.usdz**
   - Gold material
   - Medium dimensions (40x50 cm)
   - Cream matte
   - Glass included

## Generating Sample Models

1. Open the application in your browser
2. Configure the frame with desired settings
3. Click "Generate Frame"
4. Click "Export GLB" or "Export USDZ"
5. Save the file to this directory

## Testing AR Features

### iOS (iPhone/iPad)
1. Upload the `.usdz` file to a web server
2. Create a link: `<a href="model.usdz" rel="ar">View in AR</a>`
3. Open the link on an iOS device
4. Tap to view in AR

### Android
1. Upload the `.glb` file to a web server
2. Use Google's model-viewer web component
3. Open on an Android device with ARCore support
4. Tap AR icon to view in AR

## File Size Guidelines

- GLB files: Typically 100KB - 1MB
- USDZ files: Typically 150KB - 1.5MB
- Keep models optimized for mobile download speeds
