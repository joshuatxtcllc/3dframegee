# Wood Textures

This directory contains wood texture files for frame materials.

## Required Textures

Place the following texture files in this directory:

### Oak Wood
- `oak_wood_diffuse.jpg` - Base color/diffuse map
- `oak_wood_normal.jpg` - Normal map for surface detail

### Walnut
- `walnut_diffuse.jpg` - Base color/diffuse map
- `walnut_normal.jpg` - Normal map for surface detail

### Mahogany
- `mahogany_diffuse.jpg` - Base color/diffuse map
- `mahogany_normal.jpg` - Normal map for surface detail

## Texture Specifications

- **Format**: JPG or PNG
- **Recommended Resolution**: 1024x1024 or 2048x2048
- **Color Space**: sRGB for diffuse maps
- **Normal Map Format**: OpenGL format (Y+)

## Finding Textures

Free texture resources:
- [Poly Haven](https://polyhaven.com/textures/wood)
- [CC0 Textures](https://cc0textures.com/)
- [Texture Haven](https://texturehaven.com/)

## Usage

These textures are automatically loaded by the `MaterialLibrary` class in `js/components/materialLibrary.js`.
