import { NextRequest, NextResponse } from 'next/server';
import { geminiService } from '@/lib/services';
import { saveAsset, getAsset } from '@/lib/storage/assets';
import { createJob, updateJob } from '@/lib/storage/jobs';
import { getBaseUrl } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assetId, imageUrl, prompt } = body;

    let sourceUrl: string;
    let sourceAssetId: string | undefined;
    let originalPrompt: string | undefined;

    if (assetId) {
      const asset = getAsset(assetId);
      if (!asset) {
        return NextResponse.json(
          { error: 'Asset not found' },
          { status: 404 }
        );
      }
      sourceUrl = `${getBaseUrl()}${asset.path}`;
      sourceAssetId = asset.id;
      originalPrompt = asset.prompt;
    } else if (imageUrl) {
      sourceUrl = imageUrl;
    } else {
      return NextResponse.json(
        { error: 'Either imageUrl or assetId is required' },
        { status: 400 }
      );
    }

    const job = createJob('generate', {
      imageUrl: sourceUrl,
      assetId: sourceAssetId,
      prompt,
      options: { type: 'enhance' },
    });

    updateJob(job.id, { status: 'processing', progress: 10, message: 'Starting image enhancement...' });

    const result = await geminiService.enhanceImage(
      { imageUrl: sourceUrl, prompt },
      (progress, message) => {
        updateJob(job.id, { progress, message });
      }
    );

    if (!result.success || !result.data) {
      updateJob(job.id, {
        status: 'failed',
        progress: 100,
        message: result.error || 'Failed to enhance image',
        output: { error: result.error },
      });
      return NextResponse.json(
        { error: result.error || 'Failed to enhance image', jobId: job.id },
        { status: 500 }
      );
    }

    const asset = await saveAsset('generated', result.data.imageData, {
      prompt: prompt || 'Enhanced image',
      sourceAssetId,
      metadata: {},
    });

    updateJob(job.id, {
      status: 'completed',
      progress: 100,
      message: 'Image enhanced successfully',
      output: { assetId: asset.id, assetPath: asset.path },
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      asset: {
        id: asset.id,
        path: asset.path,
        type: asset.type,
      },
    });
  } catch (error) {
    console.error('Enhance error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
