import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, basename } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getConfig } from '../config';

export type AssetType = 'generated' | 'no-bg' | 'upload' | 'model';

export interface AssetMetadata {
  width?: number;
  height?: number;
  fileSize?: number;
  originalName?: string;
}

export interface Asset {
  id: string;
  type: AssetType;
  path: string;
  prompt?: string;
  sourceAssetId?: string;
  createdAt: string;
  metadata: AssetMetadata;
}

export interface AssetsRegistry {
  assets: Asset[];
}

function getAssetsFilePath(): string {
  const config = getConfig();
  const dataDir = join(process.cwd(), config.storage.dataDir);
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  return join(dataDir, 'assets.json');
}

function loadAssetsRegistry(): AssetsRegistry {
  const filePath = getAssetsFilePath();
  if (!existsSync(filePath)) {
    return { assets: [] };
  }
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { assets: [] };
  }
}

function saveAssetsRegistry(registry: AssetsRegistry): void {
  const filePath = getAssetsFilePath();
  writeFileSync(filePath, JSON.stringify(registry, null, 2));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50);
}

export function generateAssetFilename(
  type: AssetType,
  prompt?: string,
  extension: string = 'png'
): string {
  const timestamp = Date.now();
  if (prompt) {
    const slug = slugify(prompt);
    return `${timestamp}_${slug}.${extension}`;
  }
  return `${timestamp}_${uuidv4().slice(0, 8)}.${extension}`;
}

export function getAssetDirectory(type: AssetType): string {
  const config = getConfig();
  const baseDir = join(process.cwd(), config.storage.assetsDir);
  const subDir = type === 'no-bg' ? 'no-bg' : type === 'upload' ? 'uploads' : 'generated';
  const fullPath = join(baseDir, subDir);
  if (!existsSync(fullPath)) {
    mkdirSync(fullPath, { recursive: true });
  }
  return fullPath;
}

export function getPublicAssetPath(type: AssetType, filename: string): string {
  const subDir = type === 'no-bg' ? 'no-bg' : type === 'upload' ? 'uploads' : 'generated';
  return `/assets/${subDir}/${filename}`;
}

export async function saveAsset(
  type: AssetType,
  data: Buffer | string,
  options: {
    prompt?: string;
    sourceAssetId?: string;
    filename?: string;
    metadata?: AssetMetadata;
  } = {}
): Promise<Asset> {
  const config = getConfig();
  const dir = getAssetDirectory(type);
  const filename = options.filename || generateAssetFilename(type, options.prompt);
  const filePath = join(dir, filename);

  const buffer = typeof data === 'string' ? Buffer.from(data, 'base64') : data;
  writeFileSync(filePath, buffer);

  const publicPath = getPublicAssetPath(type, filename);

  const asset: Asset = {
    id: uuidv4(),
    type,
    path: publicPath,
    prompt: options.prompt,
    sourceAssetId: options.sourceAssetId,
    createdAt: new Date().toISOString(),
    metadata: {
      ...options.metadata,
      fileSize: buffer.length,
    },
  };

  const registry = loadAssetsRegistry();
  registry.assets.push(asset);
  saveAssetsRegistry(registry);

  return asset;
}

export async function saveAssetFromUrl(
  type: AssetType,
  url: string,
  options: {
    prompt?: string;
    sourceAssetId?: string;
    filename?: string;
    metadata?: AssetMetadata;
  } = {}
): Promise<Asset> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  let filename = options.filename;
  if (!filename) {
    const urlPath = new URL(url).pathname;
    const ext = urlPath.split('.').pop() || 'png';
    filename = generateAssetFilename(type, options.prompt, ext);
  }

  return saveAsset(type, buffer, { ...options, filename });
}

export function listAssets(filter?: {
  type?: AssetType;
  search?: string;
}): Asset[] {
  const registry = loadAssetsRegistry();
  let assets = registry.assets;

  if (filter?.type) {
    assets = assets.filter((a) => a.type === filter.type);
  }

  if (filter?.search) {
    const searchLower = filter.search.toLowerCase();
    assets = assets.filter(
      (a) =>
        a.prompt?.toLowerCase().includes(searchLower) ||
        a.path.toLowerCase().includes(searchLower)
    );
  }

  return assets.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getAsset(id: string): Asset | null {
  const registry = loadAssetsRegistry();
  return registry.assets.find((a) => a.id === id) || null;
}

export function getAssetLineage(id: string): Asset[] {
  const lineage: Asset[] = [];
  let currentId: string | undefined = id;

  while (currentId) {
    const asset = getAsset(currentId);
    if (!asset) break;
    lineage.push(asset);
    currentId = asset.sourceAssetId;
  }

  return lineage.reverse();
}

export function deleteAsset(id: string): boolean {
  const registry = loadAssetsRegistry();
  const index = registry.assets.findIndex((a) => a.id === id);

  if (index === -1) {
    return false;
  }

  const asset = registry.assets[index];

  // Delete the file
  const filePath = join(process.cwd(), 'public', asset.path);
  if (existsSync(filePath)) {
    try {
      unlinkSync(filePath);
    } catch (error) {
      console.error('Failed to delete asset file:', error);
    }
  }

  registry.assets.splice(index, 1);
  saveAssetsRegistry(registry);

  return true;
}

export function getModelsDirectory(): string {
  const config = getConfig();
  const modelsDir = join(process.cwd(), config.storage.modelsDir);
  if (!existsSync(modelsDir)) {
    mkdirSync(modelsDir, { recursive: true });
  }
  return modelsDir;
}

export async function saveModel(
  url: string,
  options: {
    filename?: string;
    sourceAssetId?: string;
    prompt?: string;
  } = {}
): Promise<Asset> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch model from URL: ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const modelsDir = getModelsDirectory();
  const filename = options.filename || `${Date.now()}_${uuidv4().slice(0, 8)}.glb`;
  const filePath = join(modelsDir, filename);

  writeFileSync(filePath, buffer);

  const publicPath = `/models/${filename}`;

  // Get prompt from source asset if not provided
  let prompt = options.prompt;
  if (!prompt && options.sourceAssetId) {
    const sourceAsset = getAsset(options.sourceAssetId);
    if (sourceAsset?.prompt) {
      prompt = sourceAsset.prompt;
    }
  }

  const asset: Asset = {
    id: uuidv4(),
    type: 'model',
    path: publicPath,
    prompt,
    sourceAssetId: options.sourceAssetId,
    createdAt: new Date().toISOString(),
    metadata: {
      fileSize: buffer.length,
    },
  };

  const registry = loadAssetsRegistry();
  registry.assets.push(asset);
  saveAssetsRegistry(registry);

  return asset;
}
