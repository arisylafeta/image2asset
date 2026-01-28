/**
 * Compression tier definitions with size reduction ratios
 */
export type CompressionLevel = 'full' | 'compressed' | 'ultra';

export interface CompressionTier {
  level: CompressionLevel;
  label: string;
  decimation: number; // 0-1, percentage of vertices to remove
  estimatedRatio: number; // Multiplier for estimated final size
  badge?: string;
  premiumRequired: boolean;
}

export const COMPRESSION_TIERS: Record<CompressionLevel, CompressionTier> = {
  full: {
    level: 'full',
    label: 'Full Quality',
    decimation: 0,
    estimatedRatio: 5.0, // GLB to OBJ is ~5x larger
    badge: undefined,
    premiumRequired: false,
  },
  compressed: {
    level: 'compressed',
    label: 'Compressed',
    decimation: 0.6, // Remove 60% of vertices
    estimatedRatio: 2.0, // ~40% of full OBJ size
    badge: undefined,
    premiumRequired: false,
  },
  ultra: {
    level: 'ultra',
    label: 'Ultra Compressed',
    decimation: 0.85, // Remove 85% of vertices
    estimatedRatio: 0.75, // ~15% of full OBJ size
    badge: '👑 Premium',
    premiumRequired: true,
  },
};

/**
 * Estimate final OBJ ZIP size based on original GLB size and compression level
 * @param glbSizeBytes - Original GLB file size in bytes
 * @param level - Compression level to apply
 * @returns Estimated ZIP size in bytes
 */
export function estimateObjSize(
  glbSizeBytes: number,
  level: CompressionLevel
): number {
  const tier = COMPRESSION_TIERS[level];
  return Math.round(glbSizeBytes * tier.estimatedRatio);
}

/**
 * Format bytes to human-readable string (e.g., "42.5 MB")
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
