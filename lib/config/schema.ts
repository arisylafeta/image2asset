import { z } from 'zod';

export const GeminiConfigSchema = z.object({
  model: z.string().default('gemini-2.5-flash-image'),
  defaultAspectRatio: z.string().default('1:1'),
});

export const BriaConfigSchema = z.object({
  preserveAlpha: z.boolean().default(false),
});

export const TrellisConfigSchema = z.object({
  textureSize: z.number().default(1024),
  meshSimplify: z.number().min(0).max(1).default(0.95),
});

export const ServicesConfigSchema = z.object({
  gemini: GeminiConfigSchema.default({}),
  bria: BriaConfigSchema.default({}),
  trellis: TrellisConfigSchema.default({}),
});

export const BulkConfigSchema = z.object({
  concurrency: z.number().min(1).max(10).default(3),
  retryAttempts: z.number().min(0).max(5).default(2),
});

export const StorageConfigSchema = z.object({
  modelsDir: z.string().default('./models'),
  dataDir: z.string().default('./data'),
  assetsDir: z.string().default('./public/assets'),
});

export const ConfigSchema = z.object({
  services: ServicesConfigSchema.default({}),
  bulk: BulkConfigSchema.default({}),
  storage: StorageConfigSchema.default({}),
});

export type GeminiConfig = z.infer<typeof GeminiConfigSchema>;
export type BriaConfig = z.infer<typeof BriaConfigSchema>;
export type TrellisConfig = z.infer<typeof TrellisConfigSchema>;
export type ServicesConfig = z.infer<typeof ServicesConfigSchema>;
export type BulkConfig = z.infer<typeof BulkConfigSchema>;
export type StorageConfig = z.infer<typeof StorageConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;
