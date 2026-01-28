import { Document } from '@gltf-transform/core';
import { simplify, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import { CompressionLevel, COMPRESSION_TIERS } from './estimationUtils';

export interface CompressionOptions {
  level: CompressionLevel;
  onProgress?: (stage: string, progress: number) => void;
}

/**
 * Apply mesh compression to a glTF document
 * @param document - The glTF document to compress
 * @param options - Compression options including level and progress callback
 * @returns Modified document (mutates in place, but returns for chaining)
 */
export async function compressMesh(
  document: Document,
  options: CompressionOptions
): Promise<Document> {
  const { level, onProgress } = options;
  const tier = COMPRESSION_TIERS[level];

  // No compression needed for full quality
  if (tier.decimation === 0) {
    onProgress?.('No compression applied', 100);
    return document;
  }

  try {
    onProgress?.('Welding vertices', 20);

    // Step 1: Weld duplicate vertices to prepare for simplification
    await document.transform(
      weld({
        tolerance: 0.0001, // Small tolerance to merge nearly identical vertices
      })
    );

    onProgress?.('Simplifying mesh', 60);

    // Step 2: Simplify mesh by removing vertices/faces
    await document.transform(
      simplify({
        simplifier: MeshoptSimplifier,
        ratio: 1 - tier.decimation, // simplify ratio is "keep ratio", not "remove ratio"
        error: 0.001, // Maximum geometric error allowed
      })
    );

    onProgress?.('Compression complete', 100);

    return document;
  } catch (error) {
    console.error('Mesh compression failed:', error);
    // Return unmodified document on error
    onProgress?.('Compression failed, using original', 100);
    return document;
  }
}
