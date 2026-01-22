'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AssetCard } from './AssetCard';

const ModelViewer = dynamic(
  () => import('../ui/ModelViewer').then((mod) => mod.ModelViewer),
  { ssr: false, loading: () => <ModelViewerFallback /> }
);

function ModelViewerFallback() {
  return (
    <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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

  const typeFilters = [
    { value: 'all', label: 'All' },
    { value: 'generated', label: 'Generated' },
    { value: 'no-bg', label: 'No Background' },
    { value: 'upload', label: 'Uploaded' },
    { value: 'model', label: '3D Models' },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          {typeFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFilterType(filter.value as AssetType | 'all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterType === filter.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by prompt or filename..."
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={fetchAssets}
          className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && assets.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 mx-auto text-gray-600 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setViewingModel(null)}
        >
          <div
            className="relative w-full max-w-4xl mx-4 bg-gray-900 rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div>
                <h3 className="text-lg font-semibold">
                  {viewingModel.prompt || '3D Model'}
                </h3>
                <p className="text-sm text-gray-500">{viewingModel.path}</p>
              </div>
              <button
                onClick={() => setViewingModel(null)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Model Viewer */}
            <div className="aspect-video">
              <ModelViewer url={viewingModel.path} className="w-full h-full" autoRotate={false} />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-800">
              <p className="text-sm text-gray-500">
                Drag to rotate | Scroll to zoom | Right-click to pan
              </p>
              <a
                href={viewingModel.path}
                download
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download GLB
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
