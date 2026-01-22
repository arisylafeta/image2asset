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
  // Resolution
  resolution?: number; // Default: 1024

  // Sparse Structure settings
  ss_guidance_strength?: number; // Default: 7.5, Range: 0-10
  ss_guidance_rescale?: number; // Default: 0.7
  ss_sampling_steps?: number; // Default: 12, Range: 1-50
  ss_rescale_t?: number; // Default: 5

  // Shape SLAT settings
  shape_slat_guidance_strength?: number; // Default: 7.5
  shape_slat_guidance_rescale?: number; // Default: 0.5
  shape_slat_sampling_steps?: number; // Default: 12
  shape_slat_rescale_t?: number; // Default: 3

  // Texture SLAT settings
  tex_slat_guidance_strength?: number; // Default: 1
  tex_slat_sampling_steps?: number; // Default: 12
  tex_slat_rescale_t?: number; // Default: 3

  // Mesh settings
  decimation_target?: number; // Default: 500000
  texture_size?: number; // Default: 2048
  remesh?: boolean; // Default: true
  remesh_band?: number; // Default: 1
}

export interface Convert3DRequest {
  imageUrl: string;
  settings?: TrellisSettings;
}

export interface Convert3DResponse {
  modelUrl: string;
}
