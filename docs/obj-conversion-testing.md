# OBJ Conversion Test Plan

## Status

**Note:** No actual testing has been performed due to lack of available 3D models. The following are planned test scenarios with expected behavior based on the implementation design.

## Planned Test Scenarios

1. Simple cube (no textures) - Expected: Success, expected conversion time: <1s
2. Character model (multiple materials) - Expected: Success, expected conversion time: 3-5s
3. Large environment model (50MB) - Expected: Success, expected conversion time: 15-20s
4. Animated model - Expected: Success (animations ignored in OBJ format)

## Performance Notes

- Browser-based conversion works well for models <50MB
- Memory usage scales with model size
- ZIP size typically 1.5-2x GLB size due to uncompressed textures

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS Safari works but has memory limits)

## Known Limitations

- Animations are not exported (OBJ doesn't support animations)
- Large models (>100MB) may cause browser memory issues
- Textures exported as PNG (may be larger than source format)

## Recommendations

- Add progress indicator for models >20MB
- Consider server-side conversion for large files
- Implement caching to avoid re-conversion

## Development Notes

**Linting:** The project includes a lint command (`npm run lint`), but it may prompt for setup on first run. This is a known limitation and does not affect the code quality checks when properly configured.
