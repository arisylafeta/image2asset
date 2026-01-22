import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  BaseService,
  ServiceResult,
  ProgressCallback,
  GenerateImageRequest,
  GenerateImageResponse,
  EnhanceImageRequest,
  GeminiSettings,
} from './base';
import { getGeminiApiKey, getConfig, GeminiConfig } from '../config';

export class GeminiService extends BaseService {
  private client: GoogleGenerativeAI | null = null;
  private config: GeminiConfig;

  constructor() {
    const appConfig = getConfig();
    super(appConfig.bulk.retryAttempts);
    this.config = appConfig.services.gemini;
  }

  private getClient(): GoogleGenerativeAI {
    if (!this.client) {
      this.client = new GoogleGenerativeAI(getGeminiApiKey());
    }
    return this.client;
  }

  async generateImage(
    request: GenerateImageRequest,
    onProgress?: ProgressCallback
  ): Promise<ServiceResult<GenerateImageResponse>> {
    return this.withRetry(async () => {
      onProgress?.(10, 'Initializing Gemini...');

      const client = this.getClient();
      const settings = request.settings || {};

      // Build generation config
      const generationConfig: Record<string, unknown> = {};

      // Set response modalities
      if (settings.responseModalities === 'Image') {
        generationConfig.responseModalities = ['Image'];
      } else {
        generationConfig.responseModalities = ['Text', 'Image'];
      }

      // Set aspect ratio if provided
      if (settings.aspectRatio) {
        generationConfig.imageConfig = {
          aspectRatio: settings.aspectRatio,
        };
      }

      const model = client.getGenerativeModel({
        model: this.config.model,
        generationConfig,
      } as never);

      onProgress?.(30, 'Generating image...');

      const result = await model.generateContent(request.prompt);
      const response = result.response;

      onProgress?.(80, 'Processing response...');

      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts) {
        throw new Error('No content in response');
      }

      for (const part of parts) {
        if ('inlineData' in part && part.inlineData) {
          onProgress?.(100, 'Image generated successfully');
          return {
            imageData: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
          };
        }
      }

      throw new Error('No image data in response');
    }, onProgress);
  }

  async enhanceImage(
    request: EnhanceImageRequest,
    onProgress?: ProgressCallback
  ): Promise<ServiceResult<GenerateImageResponse>> {
    return this.withRetry(async () => {
      onProgress?.(10, 'Initializing Gemini...');

      const client = this.getClient();
      const model = client.getGenerativeModel({
        model: this.config.model,
        generationConfig: {
          responseModalities: ['image', 'text'],
        } as never,
      });

      onProgress?.(20, 'Loading source image...');

      // Fetch the image and convert to base64
      const imageResponse = await fetch(request.imageUrl);
      if (!imageResponse.ok) {
        throw new Error('Failed to fetch source image');
      }
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

      onProgress?.(40, 'Enhancing image...');

      const defaultPrompt = 'Enhance this product image: place the product centered on a clean white or neutral background, remove any distracting elements, improve clarity and lighting, make the product the clear focal point. Keep the product exactly as it is but present it professionally.';
      const prompt = request.prompt
        ? `${request.prompt}. Also ensure: ${defaultPrompt}`
        : defaultPrompt;

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType,
            data: imageBase64,
          },
        },
        { text: prompt },
      ]);

      const response = result.response;

      onProgress?.(80, 'Processing response...');

      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts) {
        throw new Error('No content in response');
      }

      for (const part of parts) {
        if ('inlineData' in part && part.inlineData) {
          onProgress?.(100, 'Image enhanced successfully');
          return {
            imageData: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
          };
        }
      }

      throw new Error('No image data in response');
    }, onProgress);
  }
}

export const geminiService = new GeminiService();
