import { NextRequest, NextResponse } from 'next/server';
import { geminiService, briaService, trellisService } from '@/lib/services';
import { saveAsset, saveAssetFromUrl, saveModel, getAsset } from '@/lib/storage/assets';
import { createJob, updateJob, getJob } from '@/lib/storage/jobs';
import { getConfig } from '@/lib/config';
import { getBaseUrl } from '@/lib/utils';

interface BulkItem {
  prompt?: string;
  imageUrl?: string;
  assetId?: string;
}

interface BulkRequest {
  items: BulkItem[];
  steps: ('generate' | 'remove-bg' | 'convert-3d')[];
}

async function processItem(
  item: BulkItem,
  steps: string[],
  parentJobId: string
): Promise<{
  success: boolean;
  assetId?: string;
  modelPath?: string;
  error?: string;
}> {
  let currentAssetId: string | undefined;
  let currentImageUrl: string | undefined;
  let prompt = item.prompt;

  if (item.assetId) {
    const asset = getAsset(item.assetId);
    if (!asset) {
      return { success: false, error: 'Asset not found' };
    }
    currentAssetId = asset.id;
    currentImageUrl = `${getBaseUrl()}${asset.path}`;
    prompt = asset.prompt || prompt;
  } else if (item.imageUrl) {
    currentImageUrl = item.imageUrl;
  }

  for (const step of steps) {
    if (step === 'generate' && prompt) {
      const result = await geminiService.generateImage({ prompt });
      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Failed to generate image' };
      }

      const asset = await saveAsset('generated', result.data.imageData, {
        prompt,
        sourceAssetId: currentAssetId,
      });

      currentAssetId = asset.id;
      currentImageUrl = `${getBaseUrl()}${asset.path}`;
    } else if (step === 'remove-bg' && currentImageUrl) {
      const result = await briaService.removeBackground({ imageUrl: currentImageUrl });
      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Failed to remove background' };
      }

      const asset = await saveAssetFromUrl('no-bg', result.data.imageUrl, {
        prompt,
        sourceAssetId: currentAssetId,
      });

      currentAssetId = asset.id;
      currentImageUrl = `${getBaseUrl()}${asset.path}`;
    } else if (step === 'convert-3d' && currentImageUrl) {
      const result = await trellisService.convertTo3D({ imageUrl: currentImageUrl });
      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Failed to convert to 3D' };
      }

      const modelAsset = await saveModel(result.data.modelUrl, {
        sourceAssetId: currentAssetId,
      });

      return { success: true, assetId: modelAsset.id, modelPath: modelAsset.path };
    }
  }

  return { success: true, assetId: currentAssetId };
}

export async function POST(request: NextRequest) {
  try {
    const body: BulkRequest = await request.json();
    const { items, steps } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { error: 'Steps array is required' },
        { status: 400 }
      );
    }

    const config = getConfig();
    const concurrency = config.bulk.concurrency;

    const parentJob = createJob('bulk', {
      options: { itemCount: items.length, steps },
    });

    updateJob(parentJob.id, {
      status: 'processing',
      progress: 0,
      message: `Processing ${items.length} items...`,
    });

    // Process items in batches
    const results: Array<{
      index: number;
      success: boolean;
      assetId?: string;
      modelPath?: string;
      error?: string;
    }> = [];

    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const batchPromises = batch.map(async (item, batchIndex) => {
        const index = i + batchIndex;
        try {
          const result = await processItem(item, steps, parentJob.id);
          return { index, ...result };
        } catch (error) {
          return {
            index,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      const progress = Math.round(((i + batch.length) / items.length) * 100);
      updateJob(parentJob.id, {
        progress,
        message: `Processed ${i + batch.length}/${items.length} items`,
      });
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    updateJob(parentJob.id, {
      status: failed === items.length ? 'failed' : 'completed',
      progress: 100,
      message: `Completed: ${successful} successful, ${failed} failed`,
      output: { results } as never,
    });

    return NextResponse.json({
      success: true,
      jobId: parentJob.id,
      summary: {
        total: items.length,
        successful,
        failed,
      },
      results,
    });
  } catch (error) {
    console.error('Bulk processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
