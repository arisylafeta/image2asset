'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ImagePreview } from '@/components/ui/ImagePreview';
import { TrellisSettings } from '@/components/pipeline/TrellisSettings';
import { AssetPicker } from '@/components/gallery/AssetPicker';
import { TrellisSettings as TrellisSettingsType } from '@/lib/services/base';

const ModelViewer = dynamic(
  () => import('@/components/ui/ModelViewer').then((mod) => mod.ModelViewer),
  { ssr: false, loading: () => <ViewerFallback /> }
);

function ViewerFallback() {
  return (
    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
    </div>
  );
}

interface Asset {
  id: string;
  path: string;
  type: string;
  prompt?: string;
}

const DEFAULT_SETTINGS: TrellisSettingsType = {
  resolution: 1024,
  ss_guidance_strength: 7.5,
  ss_guidance_rescale: 0.7,
  ss_sampling_steps: 12,
  ss_rescale_t: 5,
  shape_slat_guidance_strength: 7.5,
  shape_slat_guidance_rescale: 0.5,
  shape_slat_sampling_steps: 12,
  shape_slat_rescale_t: 3,
  tex_slat_guidance_strength: 1,
  tex_slat_sampling_steps: 12,
  tex_slat_rescale_t: 3,
  decimation_target: 500000,
  texture_size: 2048,
  remesh: true,
  remesh_band: 1,
};

export default function Home() {
  const [imageAsset, setImageAsset] = useState<Asset | null>(null);
  const [noBgAsset, setNoBgAsset] = useState<Asset | null>(null);
  const [modelPath, setModelPath] = useState<string | null>(null);
  const [settings, setSettings] = useState<TrellisSettingsType>(DEFAULT_SETTINGS);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState({ value: 0, message: '' });

  const handleReset = () => {
    setImageAsset(null);
    setNoBgAsset(null);
    setModelPath(null);
    setProgress({ value: 0, message: '' });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setImageAsset(data.asset);
      setNoBgAsset(null);
      setModelPath(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleAssetSelected = (asset: Asset) => {
    setShowAssetPicker(false);
    setImageAsset(asset);
    setNoBgAsset(null);
    setModelPath(null);
  };

  const handleRemoveBackground = async () => {
    if (!imageAsset) return;

    setRemovingBg(true);
    setProgress({ value: 10, message: 'Removing background...' });

    try {
      const response = await fetch('/api/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: imageAsset.id }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setNoBgAsset(data.asset);
      setProgress({ value: 100, message: 'Background removed' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Background removal failed');
      setProgress({ value: 0, message: '' });
    } finally {
      setRemovingBg(false);
    }
  };

  const handleConvert3D = async () => {
    const sourceAsset = noBgAsset || imageAsset;
    if (!sourceAsset) return;

    setConverting(true);
    setProgress({ value: 10, message: 'Starting 3D conversion...' });

    try {
      const response = await fetch('/api/convert-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: sourceAsset.id, settings }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setModelPath(data.modelPath);
      setProgress({ value: 100, message: '3D model generated' });
    } catch (err) {
      alert(err instanceof Error ? err.message : '3D conversion failed');
      setProgress({ value: 0, message: '' });
    } finally {
      setConverting(false);
    }
  };

  const handleDownload = () => {
    if (modelPath) {
      const link = document.createElement('a');
      link.href = modelPath;
      link.download = modelPath.split('/').pop() || 'model.glb';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const isProcessing = uploading || removingBg || converting;

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900">
        <h1 className="text-lg font-semibold text-gray-200">Image2Asset</h1>
        <div className="flex items-center gap-2">
          <a
            href="/create"
            className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
          >
            Create
          </a>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
          >
            New
          </button>
          <a
            href="/gallery"
            className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
          >
            Gallery
          </a>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Controls */}
        <div className="w-80 border-r border-gray-800 bg-gray-900 flex flex-col overflow-hidden">
          {/* Image section */}
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-sm font-medium text-gray-400 mb-3">Source Image</h2>

            {!imageAsset ? (
              <div className="space-y-2">
                <label className="block w-full px-4 py-8 border-2 border-dashed border-gray-700 rounded-lg text-center cursor-pointer hover:border-gray-600 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isProcessing}
                  />
                  <span className="text-gray-500 text-sm">
                    {uploading ? 'Uploading...' : 'Drop image or click to upload'}
                  </span>
                </label>
                <button
                  onClick={() => setShowAssetPicker(true)}
                  className="w-full px-4 py-2 text-sm bg-gray-800 text-gray-400 rounded hover:bg-gray-700 transition-colors"
                >
                  Select from Gallery
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden">
                  <ImagePreview src={noBgAsset?.path || imageAsset.path} className="w-full h-full" />
                  {noBgAsset && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-gray-800 text-xs text-gray-400 rounded">
                      BG Removed
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRemoveBackground}
                    disabled={isProcessing || !!noBgAsset}
                    className="flex-1 px-3 py-2 text-sm bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {removingBg ? 'Removing...' : noBgAsset ? 'Done' : 'Remove BG'}
                  </button>
                  <button
                    onClick={() => {
                      setImageAsset(null);
                      setNoBgAsset(null);
                      setModelPath(null);
                    }}
                    disabled={isProcessing}
                    className="px-3 py-2 text-sm bg-gray-800 text-gray-400 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Settings section */}
          <div className="flex-1 overflow-y-auto">
            <TrellisSettings settings={settings} onChange={setSettings} />
          </div>

          {/* Convert button */}
          <div className="p-4 border-t border-gray-800">
            {progress.message && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{progress.message}</span>
                  <span>{progress.value}%</span>
                </div>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-600 transition-all"
                    style={{ width: `${progress.value}%` }}
                  />
                </div>
              </div>
            )}
            <button
              onClick={handleConvert3D}
              disabled={!imageAsset || isProcessing}
              className="w-full px-4 py-3 text-sm font-medium bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {converting ? 'Converting...' : 'Convert to 3D'}
            </button>
          </div>
        </div>

        {/* Right panel - 3D Viewer */}
        <div className="flex-1 flex flex-col bg-gray-950">
          {modelPath ? (
            <>
              <div className="flex-1">
                <ModelViewer url={modelPath} className="w-full h-full" autoRotate={false} />
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 bg-gray-900">
                <span className="text-sm text-gray-500">
                  Drag to rotate | Scroll to zoom | Right-click to pan
                </span>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
                >
                  Download GLB
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-600">
                <svg
                  className="w-24 h-24 mx-auto mb-4 opacity-30"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
                  />
                </svg>
                <p className="text-sm">Upload an image and convert to 3D</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Asset picker modal */}
      {showAssetPicker && (
        <AssetPicker
          onSelect={handleAssetSelected}
          onClose={() => setShowAssetPicker(false)}
          title="Select an Image"
        />
      )}
    </div>
  );
}
