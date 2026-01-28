import { NextRequest, NextResponse } from 'next/server';
import { convertGLBtoOBJ } from '@/lib/converters/gltfTransformConverter';
import JSZip from 'jszip';
import * as path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { modelId } = await request.json();

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

    // Resolve model path - models are stored in /public/models/
    const modelPath = path.join(process.cwd(), 'public', 'models', modelId);

    // Convert GLB to OBJ with progress tracking
    const { obj, mtl, textures } = await convertGLBtoOBJ(modelPath);

    // Create ZIP file
    const zip = new JSZip();
    const baseName = modelId.replace(/\.glb$/i, '');

    zip.file(`${baseName}.obj`, obj);
    zip.file(`${baseName}.mtl`, mtl);

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
