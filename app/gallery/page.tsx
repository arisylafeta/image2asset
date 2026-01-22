'use client';

import { AssetGallery } from '@/components/gallery/AssetGallery';

export default function GalleryPage() {
  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900">
        <h1 className="text-lg font-semibold text-gray-200">Gallery</h1>
        <div className="flex items-center gap-2">
          <a
            href="/create"
            className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
          >
            Create
          </a>
          <a
            href="/"
            className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
          >
            Pipeline
          </a>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <AssetGallery />
      </div>
    </div>
  );
}
