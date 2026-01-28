export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProgressCallback {
  (progress: number, message?: string): void;
}

export abstract class BaseService {
  protected maxRetries: number;
  protected retryDelay: number;

  constructor(maxRetries: number = 2, retryDelay: number = 1000) {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    onProgress?: ProgressCallback
  ): Promise<ServiceResult<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          onProgress?.(0, `Retry attempt ${attempt}/${this.maxRetries}`);
          await this.delay(this.retryDelay * attempt);
        }

        const result = await operation();
        return { success: true, data: result };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Attempt ${attempt + 1} failed:`, lastError.message);
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error occurred',
    };
  }

  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number = 60000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export interface GenerateImageRequest {
  prompt: string;
  settings?: GeminiSettings;
}

export interface GeminiSettings {
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
  responseModalities?: 'Image' | 'Text,Image';
}

export interface GenerateImageResponse {
  imageData: string;
  mimeType: string;
}

export interface EnhanceImageRequest {
  imageUrl: string;
  prompt?: string;
}

export interface RemoveBackgroundRequest {
  imageUrl: string;
}

export interface RemoveBackgroundResponse {
  imageUrl: string;
}

export interface TrellisSettings {
  resolution?: number;
  seed?: number;
  decimation_target?: number;
  texture_size?: number;
  ss_guidance_strength?: number;
  ss_guidance_rescale?: number;
  ss_sampling_steps?: number;
  ss_rescale_t?: number;
  shape_slat_guidance_strength?: number;
  shape_slat_guidance_rescale?: number;
  shape_slat_sampling_steps?: number;
  shape_slat_rescale_t?: number;
  tex_slat_guidance_strength?: number;
  tex_slat_sampling_steps?: number;
  tex_slat_rescale_t?: number;
  remesh?: boolean;
  remesh_band?: number;
  remesh_project?: number;
}

export interface Convert3DRequest {
  imageUrl?: string;
  imageUrls?: string[];
  settings?: TrellisSettings;
}

export interface Convert3DResponse {
  modelUrl: string;
}
