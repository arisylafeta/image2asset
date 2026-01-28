'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import {
  CompressionLevel,
  COMPRESSION_TIERS,
  estimateObjSize,
  formatBytes,
} from '@/lib/utils/estimationUtils';

export interface DownloadButtonProps {
  assetType: 'glb' | 'obj';
  originalSizeBytes: number;
  onDownload: (level: CompressionLevel) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function DownloadButton({
  assetType,
  originalSizeBytes,
  onDownload,
  disabled = false,
  className = '',
}: DownloadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleDownload = async (level: CompressionLevel) => {
    setIsOpen(false);
    setDownloading(true);
    try {
      await onDownload(level);
    } finally {
      setDownloading(false);
    }
  };

  // Only show dropdown for OBJ (GLB downloads don't have compression options yet)
  const showDropdown = assetType === 'obj';

  if (!showDropdown) {
    // Simple download button for non-OBJ assets
    return (
      <button
        onClick={() => handleDownload('full')}
        disabled={disabled || downloading}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <Download className="w-4 h-4" />
        {downloading ? 'Downloading...' : `Download ${assetType.toUpperCase()}`}
      </button>
    );
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Main button with dropdown toggle */}
      <div className="flex items-stretch">
        <button
          onClick={() => handleDownload('full')}
          disabled={disabled || downloading}
          className={`inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-l-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
          <Download className="w-4 h-4" />
          {downloading ? 'Downloading...' : 'Download OBJ'}
        </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || downloading}
          className="px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-r-lg border-l border-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="Download options"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown menu - positioned above button with same width */}
      {isOpen && (
        <div className="absolute left-0 right-0 bottom-full mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Download Quality
            </div>

            {(Object.keys(COMPRESSION_TIERS) as CompressionLevel[]).map((level) => {
              const tier = COMPRESSION_TIERS[level];
              const estimatedSize = estimateObjSize(originalSizeBytes, level);
              const isPremium = tier.premiumRequired;

              return (
                <button
                  key={level}
                  onClick={() => handleDownload(level)}
                  disabled={isPremium || downloading}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    isPremium
                      ? 'bg-gray-800/50 cursor-not-allowed opacity-60'
                      : 'hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">
                          {tier.label}
                        </span>
                        {tier.badge && (
                          <span className="text-xs px-1.5 py-0.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-300 rounded">
                            {tier.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 mt-0.5">
                        ~{formatBytes(estimatedSize)}
                        {tier.decimation > 0 && (
                          <span className="ml-2 text-xs">
                            ({Math.round((1 - tier.decimation) * 100)}% quality)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-4 py-2 bg-gray-900/50 border-t border-gray-700">
            <p className="text-xs text-gray-500">
              Size estimates are approximate and based on original GLB size.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
