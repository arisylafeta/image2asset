'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ImagePreview } from '../ui/ImagePreview';
import { StepActions } from './StepWizard';

const ModelViewer = dynamic(
  () => import('../ui/ModelViewer').then((mod) => mod.ModelViewer),
  { ssr: false, loading: () => <ModelViewerFallback /> }
);

function ModelViewerFallback() {
  return (
    <div className="aspect-square bg-gray-800 rounded-lg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

interface Asset {
  id: string;
  path: string;
  type: string;
  prompt?: string;
}

interface Convert3DStepProps {
  inputAsset: Asset;
  onComplete: (modelPath: string) => void;
  onBack: () => void;
  onReset: () => void;
}

export function Convert3DStep({
  inputAsset,
  onComplete,
  onBack,
  onReset,
}: Convert3DStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelPath, setModelPath] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const handleConvert = async () => {
    setLoading(true);
    setError(null);
    setProgress(10);
    setProgressMessage('Starting 3D conversion...');

    try {
      const response = await fetch('/api/convert-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: inputAsset.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to convert to 3D');
      }

      setModelPath(data.modelPath);
      setProgress(100);
      setProgressMessage('3D model generated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert to 3D');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setModelPath(null);
    setProgress(0);
    setError(null);
    handleConvert();
  };

  const handleDownload = () => {
    if (modelPath) {
      const link = document.createElement('a');
      link.href = modelPath;
      link.download = modelPath.split('/').pop() || 'model.glb';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Step 3: Convert to 3D</h2>
        <p className="text-gray-400">
          Convert your image to a 3D model using Trellis-2.
        </p>
      </div>

      {!modelPath ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Input Image</h3>
            <ImagePreview
              src={inputAsset.path}
              className="aspect-square bg-gray-800"
            />
          </div>
          <div className="flex flex-col justify-center items-center">
            {!loading && !error && (
              <>
                <p className="text-gray-400 mb-4 text-center">
                  Click the button below to convert your image to a 3D model. This may take a few minutes.
                </p>
                <button
                  onClick={handleConvert}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Convert to 3D
                </button>
              </>
            )}

            {loading && (
              <div className="text-center w-full">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400 mb-2">{progressMessage}</p>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 animate-pulse"
                    style={{ width: `${Math.max(progress, 20)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Source Image</h3>
            <ImagePreview
              src={inputAsset.path}
              className="aspect-square bg-gray-800"
            />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">3D Model</h3>
            <ModelViewer url={modelPath} className="aspect-square" />
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

      {/* Success actions */}
      {modelPath && (
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={handleDownload}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download GLB
          </button>
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Regenerate
          </button>
          <button
            onClick={onReset}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start New Pipeline
          </button>
        </div>
      )}

      <StepActions
        onBack={onBack}
        showBack={!loading && !modelPath}
        loading={loading}
      />
    </div>
  );
}
