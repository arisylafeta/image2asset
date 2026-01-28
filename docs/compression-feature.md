# OBJ Compression Feature

## Overview

The OBJ download feature now supports three compression tiers, allowing users to balance quality and file size based on their needs.

## Compression Tiers

### Full Quality (Free)
- **Decimation:** None (100% vertices retained)
- **Estimated Size:** ~5x GLB size
- **Use Case:** Final production assets, high-detail models
- **File Size Example:** 16MB GLB → ~80MB OBJ ZIP

### Compressed (Free)
- **Decimation:** 60% vertices removed
- **Estimated Size:** ~2x GLB size
- **Use Case:** Web previews, 3D viewers, game LODs
- **File Size Example:** 16MB GLB → ~32MB OBJ ZIP

### Ultra Compressed (Premium 👑)
- **Decimation:** 85% vertices removed
- **Estimated Size:** ~0.75x GLB size
- **Use Case:** Mobile apps, low-bandwidth scenarios
- **File Size Example:** 16MB GLB → ~12MB OBJ ZIP

## Technical Implementation

### Compression Pipeline

1. **Load GLB** - Parse using gltf-transform
2. **Apply Compression** (if not Full Quality):
   - Weld duplicate vertices (tolerance: 0.0001)
   - Simplify mesh using ratio (40% for Compressed, 15% for Ultra)
3. **Export to OBJ** - Generate OBJ/MTL with PBR materials
4. **Package as ZIP** - Include textures

### Size Estimation

Size estimates are calculated using fixed ratios based on the original GLB file size:

```typescript
estimatedSize = glbSize * tier.estimatedRatio
```

These are approximations and actual sizes may vary based on:
- Mesh complexity
- Texture sizes
- Material count

### API

**Endpoint:** `POST /api/convert-obj`

**Request Body:**
```json
{
  "modelId": "model-name.glb",
  "compressionLevel": "full" | "compressed" | "ultra"
}
```

**Response:** ZIP file containing OBJ, MTL, and textures

## UI Components

### DownloadButton

Reusable component for asset downloads with compression options.

**Props:**
- `assetType: 'glb' | 'obj'` - Asset type to download
- `originalSizeBytes: number` - Original file size for estimation
- `onDownload: (level: CompressionLevel) => Promise<void>` - Download handler
- `disabled?: boolean` - Disable button state
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
<DownloadButton
  assetType="obj"
  originalSizeBytes={fileSize}
  onDownload={(level) => handleDownload(level)}
/>
```

## Future Enhancements

- [ ] Real-time compression progress indicators
- [ ] Premium user authentication for Ultra tier
- [ ] GLB compression support
- [ ] Custom compression settings (advanced users)
- [ ] Compression quality comparison preview
- [ ] Batch download with mixed compression levels
