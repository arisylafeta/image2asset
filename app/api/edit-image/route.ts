import { NextRequest, NextResponse } from 'next/server';
import { geminiService } from '@/lib/services';
import { saveAsset, getAsset } from '@/lib/storage/assets';
import { createJob, updateJob } from '@/lib/storage/jobs';
import { getBaseUrl } from '@/lib/utils';
import { GeminiSettings } from '@/lib/services/base';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, sourceImageId, settings } = body as {
      prompt?: string;
      sourceImageId?: string;
      settings?: GeminiSettings;
    };

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!sourceImageId) {
      return NextResponse.json(
        { error: 'Source image ID is required' },
        { status: 400 }
      );
    }

    const sourceAsset = getAsset(sourceImageId);
    if (!sourceAsset) {
      return NextResponse.json(
        { error: 'Source image not found' },
        { status: 404 }
      );
    }

    const job = createJob('generate', {
      prompt,
      options: { sourceImageId },
      settings: settings as Record<string, unknown>,
    });

    updateJob(job.id, {
      status: 'processing',
      progress: 10,
      message: 'Starting image edit...',
    });

    // Get the source image URL
    const imageUrl = `${getBaseUrl()}${sourceAsset.path}`;

    const result = await geminiService.enhanceImage(
      { imageUrl, prompt },
      (progress, message) => {
        updateJob(job.id, { progress, message });
      }
    );

    if (!result.success || !result.data) {
      updateJob(job.id, {
        status: 'failed',
        progress: 100,
        message: result.error || 'Failed to edit image',
        output: { error: result.error },
      });
      return NextResponse.json(
        { error: result.error || 'Failed to edit image', jobId: job.id },
        { status: 500 }
      );
    }

    // Convert base64 to asset
    const imageData = `data:${result.data.mimeType};base64,${result.data.imageData}`;

    const asset = await saveAsset('generated', imageData, {
      prompt,
      sourceAssetId: sourceImageId,
    });

    updateJob(job.id, {
      status: 'completed',
      progress: 100,
      message: 'Image edited successfully',
      output: { assetPath: asset.path, assetId: asset.id },
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      imagePath: asset.path,
      asset,
    });
  } catch (error) {
    console.error('Edit image error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
