'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900">
        <h1 className="text-lg font-semibold text-gray-200">Create</h1>
        <div className="flex items-center gap-2">
          <a
            href="/"
            className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
          >
            Pipeline
          </a>
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
      {/* Left Sidebar - Controls */}
      <div className="w-96 border-r border-gray-800 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-semibold mb-1">Create</h1>
          <p className="text-sm text-gray-500">Generate images with Nano Banana</p>
        </div>

        {/* Mode Toggle */}
        <div className="px-6 pt-6">
          <div className="flex gap-2 p-1 bg-gray-900 rounded-lg">
            <button
              onClick={() => setMode('generate')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'generate'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Generate
            </button>
            <button
              onClick={() => setMode('edit')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'edit'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Edit Image
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Source Image (for edit mode) */}
          {mode === 'edit' && (
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">
                Source Image
              </label>
              {selectedSourceImage ? (
                <div className="relative group">
                  <img
                    src={selectedSourceImage.path}
                    alt="Source"
                    className="w-full aspect-square object-cover rounded-lg border border-gray-800"
                  />
                  <button
                    onClick={() => setSelectedSourceImage(null)}
                    className="absolute top-2 right-2 p-1 bg-gray-900/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-square border-2 border-dashed border-gray-800 rounded-lg flex flex-col items-center justify-center hover:border-gray-700 transition-colors"
                >
                  <svg className="w-8 h-8 text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
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
            <label className="text-sm font-medium text-gray-300 block mb-2">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={mode === 'generate'
                ? 'A photorealistic product shot of a ceramic coffee mug...'
                : 'Change the mug color to midnight blue...'
              }
              className="w-full h-32 px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-gray-700 resize-none"
            />
            <div className="flex justify-end mt-2">
              <span className="text-xs text-gray-600">
                Cmd/Ctrl + Enter to generate
              </span>
            </div>
          </div>

          {/* Settings */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-3">
              Settings
            </label>
            <GeminiSettings settings={settings} onChange={setSettings} />
          </div>
        </div>

        {/* Generate Button */}
        <div className="p-6 border-t border-gray-800 space-y-3">
          {status === 'generating' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{statusMessage}</span>
                <span className="text-gray-500">{progress}%</span>
              </div>
              <div className="h-1 bg-gray-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          {status === 'error' && (
            <div className="p-3 bg-red-950/50 border border-red-900/50 rounded-lg text-sm text-red-400">
              {statusMessage}
            </div>
          )}
          <button
            onClick={handleGenerate}
            disabled={status === 'generating' || !prompt.trim() || (mode === 'edit' && !selectedSourceImage)}
            className="w-full px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'generating' ? 'Generating...' : mode === 'generate' ? 'Generate' : 'Edit Image'}
          </button>
        </div>
      </div>

      {/* Right - Results Gallery */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-medium">
            Results
            {results.length > 0 && (
              <span className="ml-2 text-sm text-gray-500">({results.length})</span>
            )}
          </h2>
          {results.length > 0 && (
            <button
              onClick={() => setResults([])}
              className="text-sm text-gray-500 hover:text-white transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {results.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600">
              <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-lg mb-1">No images generated yet</p>
              <p className="text-sm">Enter a prompt and click generate to create images</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {results.map((result) => (
                <div
                  key={result.timestamp}
                  className="group relative aspect-square rounded-lg overflow-hidden border border-gray-800"
                >
                  <img
                    src={result.asset.path}
                    alt={result.prompt}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <div className="flex gap-2">
                      <a
                        href={result.asset.path}
                        download
                        className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                        title="Download"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                      <button
                        onClick={() => {
                          setPrompt(result.prompt);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                        title="Reuse prompt"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
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
