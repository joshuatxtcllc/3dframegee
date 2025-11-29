# Metal Textures

This directory contains metal texture files for frame materials.

## Required Textures

Place the following texture files in this directory:

### Brushed Metal
- `brushed_metal_diffuse.jpg` - Base color/diffuse map
- `brushed_metal_normal.jpg` - Normal map for surface detail

### Antique Brass
- `antique_brass_diffuse.jpg` - Base color/diffuse map
- `antique_brass_normal.jpg` - Normal map for surface detail

## Texture Specifications

- **Format**: JPG or PNG
- **Recommended Resolution**: 1024x1024 or 2048x2048
- **Color Space**: sRGB for diffuse maps
- **Normal Map Format**: OpenGL format (Y+)
- **Metalness**: Use high metalness values (0.7-0.9) for realistic metal appearance

## Finding Textures

Free texture resources:
- [Poly Haven](https://polyhaven.com/textures/metal)
- [CC0 Textures](https://cc0textures.com/)
- [FreePBR](https://freepbr.com/)

## Usage

These textures are automatically loaded by the `MaterialLibrary` class in `js/components/materialLibrary.js`.
