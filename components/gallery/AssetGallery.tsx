'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Search,
  RefreshCw,
  X,
  Download,
  Image as ImageIcon,
  Box,
  Wand2,
  Upload,
  FileArchive
} from 'lucide-react';
import { AssetCard } from './AssetCard';

const ModelViewer = dynamic(
  () => import('../ui/ModelViewer').then((mod) => mod.ModelViewer),
  { ssr: false, loading: () => <ModelViewerFallback /> }
);

function ModelViewerFallback() {
  return (
    <div className="w-full h-full bg-gray-800/50 rounded-xl flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  );
}

type AssetType = 'generated' | 'no-bg' | 'upload' | 'model';

interface Asset {
  id: string;
  type: AssetType;
  path: string;
  prompt?: string;
  sourceAssetId?: string;
  createdAt: string;
  metadata: {
    width?: number;
    height?: number;
    fileSize?: number;
    originalName?: string;
  };
}

interface AssetGalleryProps {
  onSelect?: (asset: Asset) => void;
  selectable?: boolean;
  selectedId?: string;
  filterType?: AssetType | null;
}

export function AssetGallery({
  onSelect,
  selectable = false,
  selectedId,
  filterType: externalFilterType,
}: AssetGalleryProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<AssetType | 'all'>(externalFilterType || 'all');
  const [search, setSearch] = useState('');
  const [viewingModel, setViewingModel] = useState<Asset | null>(null);
  const [converting, setConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState({ stage: '', progress: 0 });
  const [conversionError, setConversionError] = useState<{ type: string; message: string; details?: string } | null>(null);

  const fetchAssets = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') {
        params.set('type', filterType);
      }
      if (search) {
        params.set('search', search);
      }

      const response = await fetch(`/api/assets?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch assets');
      }

      setAssets(data.assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [filterType, search]);

  const handleAssetClick = (asset: Asset) => {
    if (asset.type === 'model') {
      setViewingModel(asset);
    } else if (onSelect) {
      onSelect(asset);
    }
  };

  const handleDelete = async (asset: Asset) => {
    if (!confirm('Are you sure you want to delete this asset?')) {
      return;
    }

    try {
      const response = await fetch('/api/assets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: asset.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete asset');
      }

      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete asset');
    }
  };

  const handleObjDownload = async (asset: Asset) => {
    setConverting(true);
    setConversionError(null);
    setConversionProgress({ stage: 'Preparing conversion...', progress: 0 });

    try {
      // Extract model ID from path (e.g., /models/model-123.glb -> model-123)
      const modelId = asset.path.split('/').pop()?.replace('.glb', '') || asset.id;

      setConversionProgress({ stage: 'Converting to OBJ...', progress: 50 });

      const response = await fetch('/api/convert-obj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to convert model');
      }

      setConversionProgress({ stage: 'Downloading...', progress: 90 });

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${modelId}_obj.zip`;
        document.body.appendChild(link);
        link.click();
      } finally {
        URL.revokeObjectURL(url);
        const link = document.querySelector('a[href="' + url + '"]');
        if (link) document.body.removeChild(link);
      }

      setConversionProgress({ stage: 'Complete', progress: 100 });
    } catch (error) {
      if (error && typeof error === 'object' && 'type' in error && 'message' in error) {
        setConversionError(error as { type: string; message: string; details?: string });
      } else {
        setConversionError({
          type: 'export',
          message: error instanceof Error ? error.message : 'An unknown error occurred',
          details: error instanceof Error ? error.stack : undefined
        });
      }
    } finally {
      setConverting(false);
      setTimeout(() => setConversionProgress({ stage: '', progress: 0 }), 1000);
    }
  };

  // TODO: Add cache for converted OBJ files to avoid re-conversion
  // - Store converted ZIPs in /models/obj-cache/
  // - Check cache before conversion
  // - Implement cache invalidation strategy

  const typeFilters = [
    { value: 'all', label: 'All', icon: ImageIcon },
    { value: 'generated', label: 'Generated', icon: Wand2 },
    { value: 'no-bg', label: 'No Background', icon: ImageIcon },
    { value: 'upload', label: 'Uploaded', icon: Upload },
    { value: 'model', label: '3D Models', icon: Box },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2 flex-wrap">
          {typeFilters.map((filter) => {
            const Icon = filter.icon;
            return (
              <button
                key={filter.value}
                onClick={() => setFilterType(filter.value as AssetType | 'all')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-sm font-medium ${
                  filterType === filter.value
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {filter.label}
              </button>
            );
          })}
        </div>
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by prompt or filename..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border border-gray-800/60 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-white placeholder-gray-600 transition-all"
            />
          </div>
          <button
            onClick={fetchAssets}
            className="p-2.5 bg-gray-800/50 text-gray-400 rounded-xl hover:text-white hover:bg-gray-800 transition-all"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-950/50 border border-red-900/50 rounded-xl text-red-400 flex items-center gap-2">
          <X className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && assets.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 flex items-center justify-center ring-1 ring-indigo-500/20">
            <ImageIcon className="w-10 h-10 text-indigo-500/30" />
          </div>
          <p className="text-gray-500">No assets found</p>
          <p className="text-gray-600 text-sm mt-1">
            Generate or upload some images to get started
          </p>
        </div>
      )}

      {/* Asset grid */}
      {!loading && !error && assets.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onSelect={asset.type === 'model' ? handleAssetClick : onSelect}
              onDelete={selectable ? undefined : handleDelete}
              selected={selectedId === asset.id}
              selectable={selectable || asset.type === 'model'}
            />
          ))}
        </div>
      )}

      {/* Asset count */}
      {!loading && !error && assets.length > 0 && (
        <p className="text-center text-gray-500 text-sm">
          {assets.length} asset{assets.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Model Viewer Modal */}
      {viewingModel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setViewingModel(null)}
        >
          <div
            className="relative w-full max-w-4xl mx-4 bg-gray-900 rounded-2xl overflow-hidden ring-1 ring-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800/60">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Box className="w-5 h-5 text-indigo-400" />
                  {viewingModel.prompt || '3D Model'}
                </h3>
                <p className="text-sm text-gray-500">{viewingModel.path}</p>
              </div>
              <button
                onClick={() => setViewingModel(null)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Model Viewer */}
            <div className="aspect-video">
              <ModelViewer url={viewingModel.path} className="w-full h-full" autoRotate={false} />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-800/60">
              <p className="text-xs text-gray-500">
                Drag to rotate · Scroll to zoom · Right-click to pan
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleObjDownload(viewingModel)}
                  disabled={converting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all font-medium shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileArchive className="w-4 h-4" />
                  {converting ? `Converting... ${conversionProgress.progress}%` : 'Download OBJ'}
                </button>
                <a
                  href={viewingModel.path}
                  download
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all font-medium shadow-lg shadow-emerald-500/25"
                >
                  <Download className="w-4 h-4" />
                  Download GLB
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversion Error Modal */}
      {conversionError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full ring-1 ring-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">OBJ Conversion Failed</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-300">Error Type</p>
                <p className="text-sm text-gray-400 capitalize">{conversionError.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-300">Message</p>
                <p className="text-sm text-gray-400">{conversionError.message}</p>
              </div>
              {conversionError.details && (
                <div>
                  <p className="text-sm font-medium text-gray-300">Details</p>
                  <p className="text-sm text-gray-400">{conversionError.details}</p>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConversionError(null)}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-all font-medium"
              >
                Close
              </button>
              <a
                href={viewingModel?.path}
                download
                className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all font-medium text-center"
              >
                Download GLB Instead
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
