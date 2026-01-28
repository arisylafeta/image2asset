'use client';

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Upload,
  Images,
  RotateCcw,
  Download,
  Box,
  Wand2,
  Sparkles,
  Settings2,
  X
} from 'lucide-react';
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
      <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
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
  decimation_target: 500000,
  texture_size: 2048,
  ss_guidance_strength: 7.5,
  ss_guidance_rescale: 0.7,
  ss_sampling_steps: 12,
  ss_rescale_t: 5,
  shape_slat_guidance_strength: 7.5,
  shape_slat_guidance_rescale: 0.5,
  shape_slat_sampling_steps: 12,
  shape_slat_rescale_t: 3,
  tex_slat_guidance_strength: 3,
  tex_slat_sampling_steps: 12,
  tex_slat_rescale_t: 3,
  remesh: true,
  remesh_band: 1,
  remesh_project: 1,
};

export default function Home() {
  const [imageAssets, setImageAssets] = useState<Asset[]>([]);
  const [noBgAssets, setNoBgAssets] = useState<Asset[]>([]);
  const [modelPath, setModelPath] = useState<string | null>(null);
  const [settings, setSettings] = useState<TrellisSettingsType>(DEFAULT_SETTINGS);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState({ value: 0, message: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setImageAssets([]);
    setNoBgAssets([]);
    setModelPath(null);
    setProgress({ value: 0, message: '' });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const inputRef = e.target === fileInputRef.current ? fileInputRef : addMoreInputRef;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/assets/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.asset;
      });

      const uploadedAssets = await Promise.all(uploadPromises);
      setImageAssets((prev) => [...prev, ...uploadedAssets]);
      setNoBgAssets([]);
      setModelPath(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      // Reset the input value so the same files can be selected again if needed
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleAssetSelected = (asset: Asset) => {
    setShowAssetPicker(false);
    setImageAssets((prev) => [...prev, asset]);
    setNoBgAssets([]);
    setModelPath(null);
  };

  const handleRemoveBackground = async () => {
    if (imageAssets.length === 0) return;

    setRemovingBg(true);
    setProgress({ value: 10, message: 'Removing backgrounds...' });

    try {
      const promises = imageAssets.map(async (asset, index) => {
        const response = await fetch('/api/remove-bg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assetId: asset.id }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.asset;
      });

      const results = await Promise.all(promises);
      setNoBgAssets(results);
      setProgress({ value: 100, message: 'Backgrounds removed' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Background removal failed');
      setProgress({ value: 0, message: '' });
    } finally {
      setRemovingBg(false);
    }
  };

  const handleConvert3D = async () => {
    const sourceAssets = noBgAssets.length > 0 ? noBgAssets : imageAssets;
    if (sourceAssets.length === 0) return;

    setConverting(true);
    setProgress({ value: 10, message: 'Starting 3D conversion...' });

    try {
      const imageUrls = sourceAssets.map((a) => a.path);

      const response = await fetch('/api/convert-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrls, settings }),
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
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-gray-800/60 bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Image2Asset" className="w-20 h-7" />
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/create"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-300 rounded-lg hover:text-white hover:bg-gray-800 transition-all"
          >
            <Wand2 className="w-4 h-4" />
            Create
          </a>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-300 rounded-lg hover:text-white hover:bg-gray-800 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            New
          </button>
          <a
            href="/gallery"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-300 rounded-lg hover:text-white hover:bg-gray-800 transition-all"
          >
            <Images className="w-4 h-4" />
            Gallery
          </a>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Controls */}
        <div className="w-80 border-r border-gray-800/60 bg-gray-900/50 flex flex-col overflow-hidden">
          {/* Image section */}
          <div className="p-4 border-b border-gray-800/60">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Box className="w-3.5 h-3.5" />
                Source Images
              </span>
              {imageAssets.length > 0 && (
                <span className="text-gray-500 font-normal">{imageAssets.length} image{imageAssets.length > 1 ? 's' : ''}</span>
              )}
            </h2>

            {imageAssets.length === 0 ? (
              <div className="space-y-2">
                <label className="block w-full px-4 py-8 border-2 border-dashed border-gray-700/60 rounded-xl text-center cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isProcessing}
                  />
                  <Upload className="w-6 h-6 mx-auto mb-2 text-gray-600 group-hover:text-indigo-400 transition-colors" />
                  <span className="text-gray-500 text-sm">
                    {uploading ? 'Uploading...' : 'Drop images or click to upload'}
                  </span>
                  <span className="block text-gray-600 text-xs mt-1">Supports multiple views</span>
                </label>
                <button
                  onClick={() => setShowAssetPicker(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-400 bg-gray-800/50 rounded-xl hover:text-white hover:bg-gray-800 transition-all"
                >
                  <Images className="w-4 h-4" />
                  Select from Gallery
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Image grid */}
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {(noBgAssets.length > 0 ? noBgAssets : imageAssets).map((asset, index) => (
                    <div key={asset.id} className="relative aspect-square bg-gray-800/50 rounded-xl overflow-hidden ring-1 ring-gray-800 group">
                      <ImagePreview src={asset.path} className="w-full h-full" />
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-gray-900/70 text-gray-400 text-xs font-medium rounded-md backdrop-blur-sm">
                        {index + 1}
                      </div>
                      {noBgAssets.length > 0 && (
                        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg backdrop-blur-sm flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                        </div>
                      )}
                      <button
                        onClick={() => {
                          const idx = imageAssets.findIndex((a) => a.id === asset.id);
                          if (idx !== -1) {
                            const newImages = [...imageAssets];
                            newImages.splice(idx, 1);
                            setImageAssets(newImages);
                          }
                          const nbIdx = noBgAssets.findIndex((a) => a.id === asset.id);
                          if (nbIdx !== -1) {
                            const newNoBg = [...noBgAssets];
                            newNoBg.splice(nbIdx, 1);
                            setNoBgAssets(newNoBg);
                          }
                        }}
                        disabled={isProcessing}
                        className="absolute bottom-1.5 right-1.5 p-1.5 bg-gray-900/80 text-gray-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:text-red-400 disabled:opacity-50"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {/* Add more button */}
                  <label className="aspect-square border-2 border-dashed border-gray-700/60 rounded-xl flex items-center justify-center cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group">
                    <input
                      ref={addMoreInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isProcessing}
                    />
                    <Upload className="w-5 h-5 text-gray-600 group-hover:text-indigo-400 transition-colors" />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRemoveBackground}
                    disabled={isProcessing || noBgAssets.length > 0}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-300 bg-gray-800/50 rounded-xl hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800/50 disabled:hover:text-gray-300"
                  >
                    <Wand2 className="w-4 h-4" />
                    {removingBg ? 'Removing...' : noBgAssets.length > 0 ? 'Done' : 'Remove BG'}
                  </button>
                  <button
                    onClick={() => {
                      setImageAssets([]);
                      setNoBgAssets([]);
                      setModelPath(null);
                    }}
                    disabled={isProcessing}
                    className="inline-flex items-center justify-center p-2 text-gray-400 bg-gray-800/50 rounded-xl hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
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
          <div className="p-4 border-t border-gray-800/60 bg-gray-900/50">
            {progress.message && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>{progress.message}</span>
                  <span className="text-indigo-400 font-medium">{progress.value}%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                    style={{ width: `${progress.value}%` }}
                  />
                </div>
              </div>
            )}
            <button
              onClick={handleConvert3D}
              disabled={imageAssets.length === 0 || isProcessing}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl hover:from-indigo-600 hover:to-violet-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25"
            >
              <Box className="w-4 h-4" />
              {converting ? 'Converting...' : `Convert to 3D${imageAssets.length > 1 ? ` (${imageAssets.length} views)` : ''}`}
            </button>
          </div>
        </div>

        {/* Right panel - 3D Viewer */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-950 via-gray-950 to-indigo-950/20">
          {modelPath ? (
            <>
              <div className="flex-1">
                <ModelViewer url={modelPath} className="w-full h-full" autoRotate={false} />
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800/60 bg-gray-900/80 backdrop-blur-sm">
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5" />
                  Drag to rotate · Scroll to zoom · Right-click to pan
                </span>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800/50 rounded-xl hover:text-white hover:bg-indigo-600 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download GLB
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 flex items-center justify-center ring-1 ring-indigo-500/20">
                  <Box className="w-12 h-12 text-indigo-500/40" />
                </div>
                <p className="text-sm text-gray-500">Upload an image and convert to 3D</p>
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
