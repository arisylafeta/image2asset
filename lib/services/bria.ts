import { fal } from '@fal-ai/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  BaseService,
  ServiceResult,
  ProgressCallback,
  RemoveBackgroundRequest,
  RemoveBackgroundResponse,
} from './base';
import { getFalApiKey, getConfig, BriaConfig } from '../config';

interface BriaResult {
  image: {
    url: string;
    width: number;
    height: number;
  };
}

export class BriaService extends BaseService {
  private initialized: boolean = false;
  private config: BriaConfig;

  constructor() {
    const appConfig = getConfig();
    super(appConfig.bulk.retryAttempts);
    this.config = appConfig.services.bria;
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
    onProgress?.(15, 'Reading local image...');

    const filePath = this.getLocalFilePath(localUrl);
    if (!filePath || !existsSync(filePath)) {
      throw new Error(`Local file not found: ${localUrl}`);
    }

    const fileBuffer = readFileSync(filePath);
    const mimeType = this.getMimeType(filePath);
    const fileName = filePath.split('/').pop() || 'image.png';

    onProgress?.(20, 'Uploading to Fal storage...');

    // Create a File-like object for fal.storage.upload
    const file = new File([fileBuffer], fileName, { type: mimeType });
    const uploadedUrl = await fal.storage.upload(file);

    onProgress?.(25, 'Image uploaded...');

    return uploadedUrl;
  }

  async removeBackground(
    request: RemoveBackgroundRequest,
    onProgress?: ProgressCallback
  ): Promise<ServiceResult<RemoveBackgroundResponse>> {
    return this.withRetry(async () => {
      this.initialize();

      onProgress?.(10, 'Initializing background removal...');

      let imageUrl = request.imageUrl;

      // If it's a localhost URL, upload to Fal storage
      if (this.isLocalUrl(imageUrl)) {
        imageUrl = await this.uploadToFalStorage(imageUrl, onProgress);
      }

      onProgress?.(30, 'Processing image...');

      const result = await fal.subscribe('fal-ai/bria/background/remove', {
        input: {
          image_url: imageUrl,
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
            onProgress?.(50, 'Removing background...');
          } else if (update.status === 'IN_QUEUE') {
            onProgress?.(35, 'Queued for processing...');
          }
        },
      });

      onProgress?.(90, 'Finalizing...');

      const data = result.data as BriaResult;
      if (!data?.image?.url) {
        throw new Error('No image URL in response');
      }

      onProgress?.(100, 'Background removed successfully');

      return {
        imageUrl: data.image.url,
      };
    }, onProgress);
  }
}

export const briaService = new BriaService();
