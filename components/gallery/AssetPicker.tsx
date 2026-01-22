'use client';

import { useState } from 'react';
import { AssetGallery } from './AssetGallery';

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

interface AssetPickerProps {
  onSelect: (asset: Asset) => void;
  onClose: () => void;
  filterType?: AssetType | null;
  title?: string;
}

export function AssetPicker({
  onSelect,
  onClose,
  filterType,
  title = 'Select an Asset',
}: AssetPickerProps) {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const handleSelect = (asset: Asset) => {
    setSelectedAsset(asset);
  };

  const handleConfirm = () => {
    if (selectedAsset) {
      onSelect(selectedAsset);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <AssetGallery
            onSelect={handleSelect}
            selectable={true}
            selectedId={selectedAsset?.id}
            filterType={filterType}
          />
        </div>

        <div className="p-6 border-t border-gray-800 flex items-center justify-between">
          <div>
            {selectedAsset && (
              <p className="text-sm text-gray-400">
                Selected: {selectedAsset.prompt || selectedAsset.metadata.originalName || 'Asset'}
              </p>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedAsset}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
