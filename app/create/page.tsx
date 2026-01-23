'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Wand2,
  Image as ImageIcon,
  Edit,
  X,
  Upload,
  Download,
  RotateCcw,
  Sparkles,
  Images,
  Trash2,
  Home,
  Check
} from 'lucide-react';
import { GeminiSettings } from '@/components/pipeline/GeminiSettings';
import { GeminiSettings as GeminiSettingsType } from '@/lib/services/base';
import { Asset } from '@/lib/storage/assets';

type Mode = 'generate' | 'edit';
type GenerationStatus = 'idle' | 'generating' | 'success' | 'error';

interface GenerationResult {
  asset: Asset;
  prompt: string;
  timestamp: number;
}

export default function CreatePage() {
  const [mode, setMode] = useState<Mode>('generate');
  const [prompt, setPrompt] = useState('');
  const [settings, setSettings] = useState<GeminiSettingsType>({
    aspectRatio: '1:1',
    responseModalities: 'Image',
  });
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [selectedSourceImage, setSelectedSourceImage] = useState<Asset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setStatus('generating');
    setProgress(0);
    setStatusMessage('Starting...');

    try {
      const endpoint = mode === 'generate' ? '/api/generate-image' : '/api/edit-image';
      const body: Record<string, unknown> = {
        prompt,
        settings,
      };

      if (mode === 'edit' && selectedSourceImage) {
        body.sourceImageId = selectedSourceImage.id;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Generation failed');
      }

      const data = await response.json();

      if (data.success && data.asset) {
        setStatus('success');
        setStatusMessage('Complete!');
        setProgress(100);

        setResults(prev => [{
          asset: data.asset,
          prompt,
          timestamp: Date.now(),
        }, ...prev]);

        // Clear prompt after successful generation
        setPrompt('');
      } else {
        throw new Error('No asset returned');
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Generation failed');
      console.error('Generation error:', error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;

      try {
        const response = await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'upload',
            imageData: base64,
            metadata: {
              originalName: file.name,
              fileSize: file.size,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setSelectedSourceImage(data.asset);
        }
      } catch (error) {
        console.error('Upload error:', error);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && status !== 'generating') {
      handleGenerate();
    }
  }, [prompt, status, mode, selectedSourceImage, settings]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen bg-gray-950 flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-gray-800/60 bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Image2Asset" className="w-15 h-7" />
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-300 rounded-lg hover:text-white hover:bg-gray-800 transition-all"
          >
            <Home className="w-4 h-4" />
            Pipeline
          </a>
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
        {/* Left Sidebar - Controls */}
        <div className="w-96 border-r border-gray-800/60 flex flex-col bg-gray-900/30">

          {/* Mode Toggle */}
          <div className="px-6 pt-6">
            <div className="flex gap-2 p-1 bg-gray-900/80 rounded-xl ring-1 ring-gray-800/60">
              <button
                onClick={() => setMode('generate')}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'generate'
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Wand2 className="w-4 h-4" />
                Generate
              </button>
              <button
                onClick={() => setMode('edit')}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'edit'
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Edit className="w-4 h-4" />
                Edit Image
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Source Image (for edit mode) */}
            {mode === 'edit' && (
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-400" />
                  Source Image
                </label>
                {selectedSourceImage ? (
                  <div className="relative group">
                    <img
                      src={selectedSourceImage.path}
                      alt="Source"
                      className="w-full aspect-square object-cover rounded-xl border border-gray-800/60 ring-1 ring-gray-800/60"
                    />
                    <button
                      onClick={() => setSelectedSourceImage(null)}
                      className="absolute top-2 right-2 p-1.5 bg-gray-900/90 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-400 text-gray-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg backdrop-blur-sm flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Ready
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-square border-2 border-dashed border-gray-800/60 rounded-xl flex flex-col items-center justify-center hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group"
                  >
                    <Upload className="w-8 h-8 text-gray-600 mb-2 group-hover:text-indigo-400 transition-colors" />
                    <span className="text-sm text-gray-500">Upload Image</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {/* Prompt Input */}
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mode === 'generate'
                  ? 'A photorealistic product shot of a ceramic coffee mug...'
                  : 'Change the mug color to midnight blue...'
                }
                className="w-full h-32 px-4 py-3 bg-gray-900/80 border border-gray-800/60 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 resize-none transition-all"
              />
              <div className="flex justify-end mt-2">
                <span className="text-xs text-gray-600 flex items-center gap-1">
                  <span className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-500">⌘</span>
                  <span>+</span>
                  <span className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-500">Enter</span>
                  <span className="ml-1">to generate</span>
                </span>
              </div>
            </div>

            {/* Settings */}
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </label>
              <GeminiSettings settings={settings} onChange={setSettings} />
            </div>
          </div>

          {/* Generate Button */}
          <div className="p-6 border-t border-gray-800/60 bg-gray-900/50 space-y-3">
            {status === 'generating' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{statusMessage}</span>
                  <span className="text-indigo-400 font-medium">{progress}%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            {status === 'error' && (
              <div className="p-3 bg-red-950/50 border border-red-900/50 rounded-xl text-sm text-red-400 flex items-center gap-2">
                <X className="w-4 h-4" />
                {statusMessage}
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={status === 'generating' || !prompt.trim() || (mode === 'edit' && !selectedSourceImage)}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl hover:from-indigo-600 hover:to-violet-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25"
            >
              {status === 'generating' ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : mode === 'generate' ? (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  Edit Image
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right - Results Gallery */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-950 via-gray-950 to-indigo-950/10">
          <div className="p-5 border-b border-gray-800/60 flex items-center justify-between bg-gray-900/30">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <Images className="w-5 h-5 text-indigo-400" />
              Results
              {results.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-indigo-500/20 text-indigo-400 rounded-full">
                  {results.length}
                </span>
              )}
            </h2>
            {results.length > 0 && (
              <button
                onClick={() => setResults([])}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {results.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-600">
                <div className="w-20 h-20 mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 flex items-center justify-center ring-1 ring-indigo-500/20">
                  <ImageIcon className="w-10 h-10 text-indigo-500/30" />
                </div>
                <p className="text-lg mb-1 text-gray-500">No images generated yet</p>
                <p className="text-sm text-gray-600">Enter a prompt and click generate to create images</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {results.map((result) => (
                  <div
                    key={result.timestamp}
                    className="group relative aspect-square rounded-xl overflow-hidden border border-gray-800/60 ring-1 ring-gray-800/40"
                  >
                    <img
                      src={result.asset.path}
                      alt={result.prompt}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <div className="flex gap-2">
                        <a
                          href={result.asset.path}
                          download
                          className="p-2 bg-gray-800/80 backdrop-blur-sm rounded-xl hover:bg-indigo-600 transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => {
                            setPrompt(result.prompt);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="p-2 bg-gray-800/80 backdrop-blur-sm rounded-xl hover:bg-indigo-600 transition-colors"
                          title="Reuse prompt"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
