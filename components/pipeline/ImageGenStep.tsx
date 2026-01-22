'use client';

import { useState, useRef } from 'react';
import { PromptInput } from '../ui/PromptInput';
import { ImagePreview } from '../ui/ImagePreview';
import { StepActions } from './StepWizard';

interface Asset {
  id: string;
  path: string;
  type: string;
  prompt?: string;
}

interface ImageGenStepProps {
  onComplete: (asset: Asset) => void;
  onSelectFromGallery: () => void;
  initialAsset?: Asset;
}

type InputMode = 'generate' | 'upload' | 'gallery';
type EnhanceState = 'none' | 'prompt' | 'enhancing' | 'done';

const ENHANCE_SUGGESTIONS = [
  'Center the product on a clean white background',
  'Make the product clearer and more professional',
  'Remove distractions and focus on the main subject',
  'Improve lighting and make colors more vibrant',
];

export function ImageGenStep({
  onComplete,
  onSelectFromGallery,
  initialAsset,
}: ImageGenStepProps) {
  const [mode, setMode] = useState<InputMode>('generate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedAsset, setUploadedAsset] = useState<Asset | null>(null);
  const [enhancedAsset, setEnhancedAsset] = useState<Asset | null>(null);
  const [enhanceState, setEnhanceState] = useState<EnhanceState>('none');
  const [enhancePrompt, setEnhancePrompt] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The final asset to use (enhanced if available, otherwise uploaded/generated)
  const finalAsset = enhancedAsset || uploadedAsset || initialAsset;

  const handleGenerate = async (prompt: string) => {
    setLoading(true);
    setError(null);
    setProgress(10);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setUploadedAsset({
        id: data.asset.id,
        path: data.asset.path,
        type: data.asset.type,
        prompt,
      });
      setEnhanceState('none');
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      setUploadedAsset({
        id: data.asset.id,
        path: data.asset.path,
        type: data.asset.type,
      });
      setEnhanceState('prompt'); // Show enhance option after upload
      setEnhancedAsset(null);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const handleEnhance = async () => {
    if (!uploadedAsset) return;

    setLoading(true);
    setError(null);
    setProgress(10);
    setEnhanceState('enhancing');

    try {
      const response = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: uploadedAsset.id,
          prompt: enhancePrompt || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to enhance image');
      }

      setEnhancedAsset({
        id: data.asset.id,
        path: data.asset.path,
        type: data.asset.type,
        prompt: enhancePrompt || 'Enhanced image',
      });
      setEnhanceState('done');
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enhance image');
      setEnhanceState('prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRetry = () => {
    setUploadedAsset(null);
    setEnhancedAsset(null);
    setEnhanceState('none');
    setEnhancePrompt('');
    setProgress(0);
    setError(null);
  };

  const handleSkipEnhance = () => {
    setEnhanceState('none');
  };

  const handleReEnhance = () => {
    setEnhancedAsset(null);
    setEnhanceState('prompt');
  };

  const handleContinue = () => {
    if (finalAsset) {
      onComplete(finalAsset);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Step 1: Get an Image</h2>
        <p className="text-gray-400">
          Generate an image from a prompt, upload an existing image, or select from your gallery.
          {mode === 'upload' && ' You can optionally enhance uploaded images with AI.'}
        </p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('generate')}
          disabled={loading}
          className={`px-4 py-2 rounded-lg transition-colors ${
            mode === 'generate'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          } disabled:opacity-50`}
        >
          Generate
        </button>
        <button
          onClick={() => setMode('upload')}
          disabled={loading}
          className={`px-4 py-2 rounded-lg transition-colors ${
            mode === 'upload'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          } disabled:opacity-50`}
        >
          Upload
        </button>
        <button
          onClick={() => {
            setMode('gallery');
            onSelectFromGallery();
          }}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          Select from Gallery
        </button>
      </div>

      {/* Content based on mode and state */}
      {!uploadedAsset && !initialAsset ? (
        <>
          {mode === 'generate' && (
            <PromptInput
              onSubmit={handleGenerate}
              disabled={loading}
              loading={loading}
            />
          )}

          {mode === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-gray-600 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <svg
                className="w-12 h-12 mx-auto text-gray-600 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-gray-400 mb-2">
                Drag and drop an image here, or click to select
              </p>
              <p className="text-gray-600 text-sm">
                Supports PNG, JPEG, WebP (max 10MB)
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          {/* Image preview section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Original/Uploaded Image */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">
                {enhancedAsset ? 'Original Image' : 'Uploaded Image'}
              </h3>
              <ImagePreview
                src={(uploadedAsset || initialAsset)?.path || ''}
                className="aspect-square bg-gray-800"
              />
            </div>

            {/* Enhanced Image or Enhancement Options */}
            <div>
              {enhancedAsset ? (
                <>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Enhanced Image</h3>
                  <ImagePreview
                    src={enhancedAsset.path}
                    className="aspect-square bg-gray-800"
                  />
                </>
              ) : enhanceState === 'prompt' ? (
                <div className="aspect-square bg-gray-800 rounded-lg p-6 flex flex-col">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Enhance with AI</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Optionally enhance your image to make the product clearer, centered, and more professional.
                  </p>

                  <textarea
                    value={enhancePrompt}
                    onChange={(e) => setEnhancePrompt(e.target.value)}
                    placeholder="Describe how you want to enhance the image (optional)..."
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg resize-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  />

                  <div className="flex flex-wrap gap-2 mb-4">
                    {ENHANCE_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setEnhancePrompt(suggestion)}
                        className="px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded hover:bg-gray-700 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>

                  <div className="mt-auto flex gap-3">
                    <button
                      onClick={handleEnhance}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      Enhance Image
                    </button>
                    <button
                      onClick={handleSkipEnhance}
                      disabled={loading}
                      className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              ) : enhanceState === 'enhancing' ? (
                <div className="aspect-square bg-gray-800 rounded-lg flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-gray-400">Enhancing image...</p>
                  <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
                </div>
              ) : (
                <div className="aspect-square bg-gray-800 rounded-lg flex flex-col items-center justify-center p-6">
                  <svg
                    className="w-12 h-12 text-gray-600 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-gray-400 text-center">Ready to continue</p>
                  {(uploadedAsset?.type === 'upload' || initialAsset?.type === 'upload') && (
                    <button
                      onClick={() => setEnhanceState('prompt')}
                      className="mt-4 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Want to enhance this image?
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {!loading && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                {mode === 'generate' ? 'Regenerate' : 'Upload Different'}
              </button>
              {enhancedAsset && (
                <button
                  onClick={handleReEnhance}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Re-enhance
                </button>
              )}
              {enhancedAsset && (
                <button
                  onClick={() => setEnhancedAsset(null)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Use Original Instead
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* Progress indicator */}
      {loading && enhanceState !== 'enhancing' && (
        <div className="space-y-2">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-400 text-center">Processing...</p>
        </div>
      )}

      <StepActions
        onNext={handleContinue}
        nextDisabled={!finalAsset || loading || enhanceState === 'enhancing'}
        showBack={false}
        nextLabel="Continue to Background Removal"
        loading={loading && enhanceState !== 'enhancing'}
      />
    </div>
  );
}
