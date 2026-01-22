'use client';

import { useState } from 'react';
import { ImagePreview } from '../ui/ImagePreview';
import { StepActions } from './StepWizard';

interface Asset {
  id: string;
  path: string;
  type: string;
  prompt?: string;
}

interface BackgroundRemovalStepProps {
  inputAsset: Asset;
  onComplete: (asset: Asset) => void;
  onBack: () => void;
  onSkip: () => void;
}

export function BackgroundRemovalStep({
  inputAsset,
  onComplete,
  onBack,
  onSkip,
}: BackgroundRemovalStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultAsset, setResultAsset] = useState<Asset | null>(null);
  const [progress, setProgress] = useState(0);

  const handleRemoveBackground = async () => {
    setLoading(true);
    setError(null);
    setProgress(10);

    try {
      const response = await fetch('/api/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: inputAsset.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove background');
      }

      setResultAsset({
        id: data.asset.id,
        path: data.asset.path,
        type: data.asset.type,
        prompt: inputAsset.prompt,
      });
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove background');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setResultAsset(null);
    setProgress(0);
    setError(null);
    handleRemoveBackground();
  };

  const handleContinue = () => {
    if (resultAsset) {
      onComplete(resultAsset);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Step 2: Remove Background</h2>
        <p className="text-gray-400">
          Remove the background from your image to improve 3D conversion quality.
        </p>
      </div>

      {!resultAsset ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Original Image</h3>
            <ImagePreview
              src={inputAsset.path}
              className="aspect-square bg-gray-800"
            />
          </div>
          <div className="flex flex-col justify-center items-center">
            {!loading && !error && (
              <>
                <p className="text-gray-400 mb-4 text-center">
                  Click the button below to remove the background, or skip this step if your image already has a transparent background.
                </p>
                <button
                  onClick={handleRemoveBackground}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Remove Background
                </button>
              </>
            )}

            {loading && (
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Removing background...</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Before</h3>
            <ImagePreview
              src={inputAsset.path}
              className="aspect-square bg-gray-800"
            />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">After</h3>
            <div className="aspect-square bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAADdJREFUOI1jYBgFwxb8h+L/+Bj/MemMDAwMDIx4NPzHpv4/HvX/8emB0f+Jt2QUDD0AALNQEQYx6JKzAAAAAElFTkSuQmCC')] rounded-lg overflow-hidden">
              <ImagePreview
                src={resultAsset.path}
                className="w-full h-full"
                showFullscreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={handleRetry}
            className="px-4 py-1 bg-red-800 rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Progress indicator */}
      {loading && (
        <div className="space-y-2">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300 animate-pulse"
              style={{ width: `${Math.max(progress, 30)}%` }}
            />
          </div>
        </div>
      )}

      <StepActions
        onBack={onBack}
        onNext={resultAsset ? handleContinue : undefined}
        onSkip={onSkip}
        showSkip={!resultAsset}
        skipLabel="Skip (use original)"
        nextLabel="Continue to 3D Conversion"
        loading={loading}
      />
    </div>
  );
}
