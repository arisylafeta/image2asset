'use client';

import { formatDate, formatFileSize } from '@/lib/utils';

interface Asset {
  id: string;
  type: 'generated' | 'no-bg' | 'upload' | 'model';
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

interface AssetCardProps {
  asset: Asset;
  onSelect?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
  selected?: boolean;
  selectable?: boolean;
}

const typeLabels = {
  generated: 'Generated',
  'no-bg': 'No Background',
  upload: 'Uploaded',
  model: '3D Model',
};

const typeColors = {
  generated: 'bg-purple-600',
  'no-bg': 'bg-green-600',
  upload: 'bg-blue-600',
  model: 'bg-orange-600',
};

export function AssetCard({
  asset,
  onSelect,
  onDelete,
  selected = false,
  selectable = false,
}: AssetCardProps) {
  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect(asset);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(asset);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative group bg-gray-800 rounded-lg overflow-hidden transition-all ${
        selectable ? 'cursor-pointer hover:ring-2 hover:ring-blue-500' : ''
      } ${selected ? 'ring-2 ring-blue-500' : ''}`}
    >
      {/* Image or Model Preview */}
      <div className="aspect-square bg-gray-900 relative">
        {asset.type === 'model' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <svg
              className="w-16 h-16 text-orange-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
              />
            </svg>
          </div>
        ) : asset.type === 'no-bg' ? (
          <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAADdJREFUOI1jYBgFwxb8h+L/+Bj/MemMDAwMDIx4NPzHpv4/HvX/8emB0f+Jt2QUDD0AALNQEQYx6JKzAAAAAElFTkSuQmCC')]">
            <img
              src={asset.path}
              alt={asset.prompt || 'Asset'}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <img
            src={asset.path}
            alt={asset.prompt || 'Asset'}
            className="w-full h-full object-cover"
          />
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {selectable && (
            <button className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="p-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Type badge */}
        <div
          className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-medium rounded ${
            typeColors[asset.type]
          }`}
        >
          {typeLabels[asset.type]}
        </div>

        {/* Selection indicator */}
        {selected && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
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
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        {asset.prompt ? (
          <p className="text-sm text-white truncate" title={asset.prompt}>
            {asset.prompt}
          </p>
        ) : asset.metadata.originalName ? (
          <p className="text-sm text-white truncate" title={asset.metadata.originalName}>
            {asset.metadata.originalName}
          </p>
        ) : (
          <p className="text-sm text-gray-500">No description</p>
        )}
        <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
          <span>{formatDate(asset.createdAt)}</span>
          {asset.metadata.fileSize && (
            <span>{formatFileSize(asset.metadata.fileSize)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
