import { NextRequest, NextResponse } from 'next/server';
import { briaService } from '@/lib/services';
import { saveAssetFromUrl, getAsset } from '@/lib/storage/assets';
import { createJob, updateJob } from '@/lib/storage/jobs';
import { getBaseUrl } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, assetId } = body;

    let sourceUrl: string;
    let sourceAssetId: string | undefined;
    let prompt: string | undefined;

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
      prompt = asset.prompt;
    } else if (imageUrl) {
      sourceUrl = imageUrl;
    } else {
      return NextResponse.json(
        { error: 'Either imageUrl or assetId is required' },
        { status: 400 }
      );
    }

    const job = createJob('remove-bg', { imageUrl: sourceUrl, assetId: sourceAssetId });

    updateJob(job.id, { status: 'processing', progress: 10, message: 'Starting background removal...' });

    const result = await briaService.removeBackground(
      { imageUrl: sourceUrl },
      (progress, message) => {
        updateJob(job.id, { progress, message });
      }
    );

    if (!result.success || !result.data) {
      updateJob(job.id, {
        status: 'failed',
        progress: 100,
        message: result.error || 'Failed to remove background',
        output: { error: result.error },
      });
      return NextResponse.json(
        { error: result.error || 'Failed to remove background', jobId: job.id },
        { status: 500 }
      );
    }

    const asset = await saveAssetFromUrl('no-bg', result.data.imageUrl, {
      prompt,
      sourceAssetId,
      metadata: {},
    });

    updateJob(job.id, {
      status: 'completed',
      progress: 100,
      message: 'Background removed successfully',
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
    console.error('Remove background error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
