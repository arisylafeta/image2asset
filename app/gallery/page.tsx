'use client';

import { Images, Wand2, Home } from 'lucide-react';
import { AssetGallery } from '@/components/gallery/AssetGallery';

export default function GalleryPage() {
  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-gray-800/60 bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Image2Asset" className="w-7 h-7" />
          <span className="text-base font-semibold text-white">Gallery</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/create"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-300 rounded-lg hover:text-white hover:bg-gray-800 transition-all"
          >
            <Wand2 className="w-4 h-4" />
            Create
          </a>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-300 rounded-lg hover:text-white hover:bg-gray-800 transition-all"
          >
            <Home className="w-4 h-4" />
            Pipeline
          </a>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-950 via-gray-950 to-indigo-950/10">
        <AssetGallery />
      </div>
    </div>
  );
}
