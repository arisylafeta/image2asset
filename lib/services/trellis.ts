import { fal } from '@fal-ai/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  BaseService,
  ServiceResult,
  ProgressCallback,
  Convert3DRequest,
  Convert3DResponse,
} from './base';
import { getFalApiKey, getConfig } from '../config';

interface TrellisResult {
  model_glb: {
    url: string;
    file_name: string;
    file_size: number;
  };
}

export class TrellisService extends BaseService {
  private initialized: boolean = false;

  constructor() {
    const appConfig = getConfig();
    super(appConfig.bulk.retryAttempts);
  }

  private initialize(): void {
    if (!this.initialized) {
      fal.config({
        credentials: getFalApiKey(),
      });
      this.initialized = true;
    }
  }

  private isLocalUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch {
      return false;
    }
  }

  private getLocalFilePath(localUrl: string): string | null {
    // Handle relative paths (start with /)
    if (localUrl.startsWith('/')) {
      const pathname = localUrl;
      // Convert /assets/... to public/assets/...
      if (pathname.startsWith('/assets/')) {
        return join(process.cwd(), 'public', pathname);
      }
      return null;
    }

    // Handle full URLs
    try {
      const parsed = new URL(localUrl);
      const pathname = parsed.pathname;
      // Convert /assets/... to public/assets/...
      if (pathname.startsWith('/assets/')) {
        return join(process.cwd(), 'public', pathname);
      }
      return null;
    } catch {
      return null;
    }
  }

  private getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
    };
    return mimeTypes[ext || ''] || 'image/png';
  }

  private async uploadToFalStorage(localUrl: string, onProgress?: ProgressCallback): Promise<string> {
    console.log('uploadToFalStorage called with:', localUrl);
    onProgress?.(12, 'Reading local image...');

    const filePath = this.getLocalFilePath(localUrl);
    console.log('Resolved file path:', filePath);
    console.log('File exists:', existsSync(filePath ?? ''));

    if (!filePath || !existsSync(filePath)) {
      throw new Error(`Local file not found: ${localUrl} -> ${filePath}`);
    }

    const fileBuffer = readFileSync(filePath);
    const mimeType = this.getMimeType(filePath);
    const fileName = filePath.split('/').pop() || 'image.png';

    console.log('File size:', fileBuffer.length, 'bytes');
    console.log('Mime type:', mimeType);
    console.log('File name:', fileName);

    onProgress?.(15, 'Uploading to Fal storage...');

    // Create a File-like object for fal.storage.upload
    const file = new File([fileBuffer], fileName, { type: mimeType });
    console.log('Uploading file to Fal storage...');
    const uploadedUrl = await fal.storage.upload(file);
    console.log('Uploaded URL:', uploadedUrl);

    onProgress?.(18, 'Image uploaded...');

    return uploadedUrl;
  }

  async convertTo3D(
    request: Convert3DRequest,
    onProgress?: ProgressCallback
  ): Promise<ServiceResult<Convert3DResponse>> {
    return this.withRetry(async () => {
      this.initialize();

      onProgress?.(10, 'Initializing 3D conversion...');

      // Determine if we have single or multiple images
      const hasMultiple = request.imageUrls && request.imageUrls.length > 1;
      let imageUrls = request.imageUrls || (request.imageUrl ? [request.imageUrl] : []);

      if (imageUrls.length === 0) {
        throw new Error('At least one image URL is required');
      }

      // Upload any localhost URLs to Fal storage
      onProgress?.(12, 'Processing images...');
      console.log('Image URLs to process:', imageUrls);
      const uploadedUrls = await Promise.all(
        imageUrls.map(async (url) => {
          console.log('Checking URL:', url, 'isLocal:', this.isLocalUrl(url), 'isRelative:', url.startsWith('/'));
          if (this.isLocalUrl(url) || url.startsWith('/')) {
            return await this.uploadToFalStorage(url, onProgress);
          }
          return url;
        })
      );

      const settings = request.settings || {};

      const input: Record<string, unknown> = {
        ...(hasMultiple
          ? { image_urls: uploadedUrls }
          : { image_url: uploadedUrls[0] }
        ),
        resolution: settings.resolution ?? 1024,
        seed: settings.seed ?? Math.floor(Math.random() * 1000000),
        decimation_target: settings.decimation_target ?? 500000,
        texture_size: settings.texture_size ?? 2048,
        ss_guidance_strength: settings.ss_guidance_strength ?? 7.5,
        ss_guidance_rescale: settings.ss_guidance_rescale ?? 0.7,
        ss_sampling_steps: settings.ss_sampling_steps ?? 12,
        ss_rescale_t: settings.ss_rescale_t ?? 5,
        shape_slat_guidance_strength: settings.shape_slat_guidance_strength ?? 7.5,
        shape_slat_guidance_rescale: settings.shape_slat_guidance_rescale ?? 0.5,
        shape_slat_sampling_steps: settings.shape_slat_sampling_steps ?? 12,
        shape_slat_rescale_t: settings.shape_slat_rescale_t ?? 3,
        tex_slat_guidance_strength: settings.tex_slat_guidance_strength ?? 3,
        tex_slat_sampling_steps: settings.tex_slat_sampling_steps ?? 12,
        tex_slat_rescale_t: settings.tex_slat_rescale_t ?? 3,
        remesh: settings.remesh ?? true,
        remesh_band: settings.remesh_band ?? 1,
        remesh_project: Math.min(settings.remesh_project ?? 1, 1),
      };

      onProgress?.(20, 'Submitting to Trellis-2...');

      const result = await fal.subscribe('fal-ai/trellis-2', {
        input: input as any,
        logs: true,
        onQueueUpdate: (update: any) => {
          console.log('Queue update:', update.status);
          if (update.status === 'IN_PROGRESS') {
            onProgress?.(50, 'Generating 3D model...');
          } else if (update.status === 'IN_QUEUE') {
            onProgress?.(25, 'Queued for 3D conversion...');
          }
        },
      });

      console.log('Fal subscribe completed');

      onProgress?.(90, 'Finalizing 3D model...');

      console.log('Fal result received:', JSON.stringify(result, null, 2));
      const data = result.data as TrellisResult;
      console.log('Parsed data:', data);
      console.log('model_glb:', data?.model_glb);
      console.log('model_glb.url:', data?.model_glb?.url);

      if (!data?.model_glb?.url) {
        throw new Error('No model URL in response');
      }

      onProgress?.(100, '3D model generated successfully');

      return {
        modelUrl: data.model_glb.url,
      };
    }, onProgress);
  }
}

export const trellisService = new TrellisService();
