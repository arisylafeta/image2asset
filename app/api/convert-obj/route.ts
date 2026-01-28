import { NextRequest, NextResponse } from 'next/server';
import { convertGLBtoOBJ } from '@/lib/converters/gltfTransformConverter';
import { CompressionLevel, COMPRESSION_TIERS } from '@/lib/utils/estimationUtils';
import JSZip from 'jszip';
import * as path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { modelId, compressionLevel: rawCompressionLevel = 'full' } = await request.json();
    const compressionLevel = rawCompressionLevel as CompressionLevel;

    if (!modelId) {
      return NextResponse.json(
        { error: 'modelId is required' },
        { status: 400 }
      );
    }

    // Security validation: prevent directory traversal attacks
    if (modelId.includes('..') || modelId.includes('/') || modelId.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid modelId: path traversal not allowed' },
        { status: 400 }
      );
    }

    // Validate compressionLevel
    const validCompressionLevels: CompressionLevel[] = ['full', 'compressed', 'ultra'];
    if (!validCompressionLevels.includes(compressionLevel)) {
      return NextResponse.json(
        { error: 'Invalid compressionLevel. Must be one of: full, compressed, ultra' },
        { status: 400 }
      );
    }

    // Check if premium is required (for future use)
    const tier = COMPRESSION_TIERS[compressionLevel];
    if (tier.premiumRequired) {
      // Premium check placeholder - allow for now
      console.log(`Premium tier requested: ${compressionLevel}`);
    }

    // Resolve model path - models are stored in /public/models/
    const modelPath = path.join(process.cwd(), 'public', 'models', modelId);

    // Convert GLB to OBJ with progress tracking and compression level
    const { obj, mtl, textures } = await convertGLBtoOBJ(modelPath, compressionLevel);

    // Create ZIP file
    const zip = new JSZip();
    const baseName = modelId.replace(/\.glb$/i, '');

    zip.file(`${baseName}.obj`, obj);
    zip.file('model.mtl', mtl);

    // Convert Map entries to array to avoid downlevelIteration requirement
    Array.from(textures.entries()).forEach(([name, { data }]) => {
      zip.file(name, data);
    });

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Return ZIP file - convert Buffer to Uint8Array for NextResponse
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${baseName}.obj.zip"`,
      },
    });
  } catch (error) {
    console.error('OBJ conversion error:', error);
    return NextResponse.json(
      { error: 'Failed to convert model', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
