# OBJ Conversion Testing - Server-Side Version

## Test Cases

### 1. Basic Model (no textures)
- **Input**: Simple colored cube
- **Expected**: Single material MTL with color properties, no texture maps
- **Verify**: Loads in 3dviewer.net

### 2. Textured Model
- **Input**: Model with base color texture
- **Expected**: MTL with map_Kd reference, texture PNG in ZIP
- **Verify**: Texture displays correctly

### 3. PBR Model
- **Input**: Model with metalness/roughness maps
- **Expected**: MTL with map_Pm and map_Pr, separate texture files
- **Verify**: Material appears metallic/rough in viewer

### 4. Multi-Material Model
- **Input**: Model with multiple materials
- **Expected**: Multiple material blocks in MTL, all textures included
- **Verify**: All materials render correctly

### 5. Large Model
- **Input**: Model > 50MB
- **Expected**: Conversion completes without browser memory issues
- **Verify**: ZIP file size reasonable, model loads

### 6. Normal Maps
- **Input**: Model with normal map texture
- **Expected**: MTL with map_Bump reference, normal texture in ZIP
- **Verify**: Surface detail appears correct

## Regression Testing

### Old Issues (Should Be Fixed)
- ✅ Missing metalness/roughness maps
- ✅ Incorrect MTL structure
- ✅ Low-quality PBR export
- ✅ Works in 3dviewer.net

## Cross-Browser Testing
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support

## Performance Benchmarks
- Small model (< 10MB): < 5 seconds
- Medium model (10-50MB): < 15 seconds
- Large model (> 50MB): < 30 seconds

## Notes
- Server-side conversion eliminates browser memory limits
- gltf-transform produces production-quality OBJ files
- Matches output from professional converters like convert3d.org
