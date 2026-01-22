import { NextRequest, NextResponse } from 'next/server';
import { trellisService } from '@/lib/services';
import { saveModel, getAsset } from '@/lib/storage/assets';
import { createJob, updateJob } from '@/lib/storage/jobs';
import { getBaseUrl } from '@/lib/utils';
import { TrellisSettings } from '@/lib/services/base';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, assetId, settings } = body as {
      imageUrl?: string;
      assetId?: string;
      settings?: TrellisSettings;
    };

    let sourceUrl: string;
    let sourceAssetId: string | undefined;

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
    } else if (imageUrl) {
      sourceUrl = imageUrl;
    } else {
      return NextResponse.json(
        { error: 'Either imageUrl or assetId is required' },
        { status: 400 }
      );
    }

    const job = createJob('convert-3d', {
      imageUrl: sourceUrl,
      assetId: sourceAssetId,
      settings: settings as Record<string, unknown>,
    });

    updateJob(job.id, { status: 'processing', progress: 10, message: 'Starting 3D conversion...' });

    const result = await trellisService.convertTo3D(
      { imageUrl: sourceUrl, settings },
      (progress, message) => {
        updateJob(job.id, { progress, message });
      }
    );

    if (!result.success || !result.data) {
      updateJob(job.id, {
        status: 'failed',
        progress: 100,
        message: result.error || 'Failed to convert to 3D',
        output: { error: result.error },
      });
      return NextResponse.json(
        { error: result.error || 'Failed to convert to 3D', jobId: job.id },
        { status: 500 }
      );
    }

    const modelAsset = await saveModel(result.data.modelUrl, {
      sourceAssetId,
    });

    updateJob(job.id, {
      status: 'completed',
      progress: 100,
      message: '3D model generated successfully',
      output: { modelPath: modelAsset.path, assetId: modelAsset.id },
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      modelPath: modelAsset.path,
      asset: modelAsset,
    });
  } catch (error) {
    console.error('Convert 3D error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
