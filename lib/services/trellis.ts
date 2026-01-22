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
import { getFalApiKey, getConfig, TrellisConfig } from '../config';

interface TrellisResult {
  model_mesh: {
    url: string;
    file_name: string;
    file_size: number;
  };
}

export class TrellisService extends BaseService {
  private initialized: boolean = false;
  private config: TrellisConfig;

  constructor() {
    const appConfig = getConfig();
    super(appConfig.bulk.retryAttempts);
    this.config = appConfig.services.trellis;
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
    onProgress?.(12, 'Reading local image...');

    const filePath = this.getLocalFilePath(localUrl);
    if (!filePath || !existsSync(filePath)) {
      throw new Error(`Local file not found: ${localUrl}`);
    }

    const fileBuffer = readFileSync(filePath);
    const mimeType = this.getMimeType(filePath);
    const fileName = filePath.split('/').pop() || 'image.png';

    onProgress?.(15, 'Uploading to Fal storage...');

    // Create a File-like object for fal.storage.upload
    const file = new File([fileBuffer], fileName, { type: mimeType });
    const uploadedUrl = await fal.storage.upload(file);

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

      let imageUrl = request.imageUrl;

      // If it's a localhost URL, upload to Fal storage
      if (this.isLocalUrl(imageUrl)) {
        imageUrl = await this.uploadToFalStorage(imageUrl, onProgress);
      }

      const settings = request.settings || {};

      // Build input with all parameters
      const input: Record<string, unknown> = {
        image_url: imageUrl,
        // Resolution
        resolution: settings.resolution ?? 1024,
        // Sparse Structure
        ss_guidance_strength: settings.ss_guidance_strength ?? 7.5,
        ss_guidance_rescale: settings.ss_guidance_rescale ?? 0.7,
        ss_sampling_steps: settings.ss_sampling_steps ?? 12,
        ss_rescale_t: settings.ss_rescale_t ?? 5,
        // Shape SLAT
        shape_slat_guidance_strength: settings.shape_slat_guidance_strength ?? 7.5,
        shape_slat_guidance_rescale: settings.shape_slat_guidance_rescale ?? 0.5,
        shape_slat_sampling_steps: settings.shape_slat_sampling_steps ?? 12,
        shape_slat_rescale_t: settings.shape_slat_rescale_t ?? 3,
        // Texture SLAT
        tex_slat_guidance_strength: settings.tex_slat_guidance_strength ?? 1,
        tex_slat_sampling_steps: settings.tex_slat_sampling_steps ?? 12,
        tex_slat_rescale_t: settings.tex_slat_rescale_t ?? 3,
        // Mesh
        decimation_target: settings.decimation_target ?? 500000,
        texture_size: settings.texture_size ?? 2048,
        remesh: settings.remesh ?? true,
        remesh_band: settings.remesh_band ?? 1,
      };

      onProgress?.(20, 'Submitting to Trellis...');

      const result = await fal.subscribe('fal-ai/trellis', {
        input: input as { image_url: string },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
            onProgress?.(50, 'Generating 3D model...');
          } else if (update.status === 'IN_QUEUE') {
            onProgress?.(25, 'Queued for 3D conversion...');
          }
        },
      });

      onProgress?.(90, 'Finalizing 3D model...');

      const data = result.data as TrellisResult;
      if (!data?.model_mesh?.url) {
        throw new Error('No model URL in response');
      }

      onProgress?.(100, '3D model generated successfully');

      return {
        modelUrl: data.model_mesh.url,
      };
    }, onProgress);
  }
}

export const trellisService = new TrellisService();
