import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Config, ConfigSchema } from './schema';

let cachedConfig: Config | null = null;

export function loadConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = join(process.cwd(), 'config.json');

  let rawConfig = {};

  if (existsSync(configPath)) {
    try {
      const configFile = readFileSync(configPath, 'utf-8');
      rawConfig = JSON.parse(configFile);
    } catch (error) {
      console.warn('Failed to load config.json, using defaults:', error);
    }
  }

  cachedConfig = ConfigSchema.parse(rawConfig);
  return cachedConfig;
}

export function getConfig(): Config {
  return loadConfig();
}

export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return key;
}

export function getFalApiKey(): string {
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new Error('FAL_KEY environment variable is not set');
  }
  return key;
}

export * from './schema';
