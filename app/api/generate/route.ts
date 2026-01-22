import { NextRequest, NextResponse } from 'next/server';
import { geminiService } from '@/lib/services';
import { saveAsset } from '@/lib/storage/assets';
import { createJob, updateJob } from '@/lib/storage/jobs';
import { GeminiSettings } from '@/lib/services/base';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, aspectRatio, settings } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Build settings object
    const imageSettings: GeminiSettings = settings || {};
    if (aspectRatio && !imageSettings.aspectRatio) {
      imageSettings.aspectRatio = aspectRatio;
    }

    const job = createJob('generate', {
      prompt,
      settings: imageSettings as Record<string, unknown>,
    });

    updateJob(job.id, { status: 'processing', progress: 10, message: 'Starting image generation...' });

    const result = await geminiService.generateImage(
      { prompt, settings: imageSettings },
      (progress, message) => {
        updateJob(job.id, { progress, message });
      }
    );

    if (!result.success || !result.data) {
      updateJob(job.id, {
        status: 'failed',
        progress: 100,
        message: result.error || 'Failed to generate image',
        output: { error: result.error },
      });
      return NextResponse.json(
        { error: result.error || 'Failed to generate image', jobId: job.id },
        { status: 500 }
      );
    }

    const asset = await saveAsset('generated', result.data.imageData, {
      prompt,
      metadata: {},
    });

    updateJob(job.id, {
      status: 'completed',
      progress: 100,
      message: 'Image generated successfully',
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
    console.error('Generate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
