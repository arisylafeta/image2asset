'use client';

import { useState } from 'react';

interface BulkItem {
  prompt?: string;
  imageUrl?: string;
  assetId?: string;
}

interface BulkResult {
  index: number;
  success: boolean;
  assetId?: string;
  modelPath?: string;
  error?: string;
}

interface BulkProcessorProps {
  onClose: () => void;
}

export function BulkProcessor({ onClose }: BulkProcessorProps) {
  const [prompts, setPrompts] = useState('');
  const [selectedSteps, setSelectedSteps] = useState<string[]>(['generate', 'remove-bg', 'convert-3d']);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const steps = [
    { id: 'generate', label: 'Generate Image', description: 'Generate images from prompts' },
    { id: 'remove-bg', label: 'Remove Background', description: 'Remove image backgrounds' },
    { id: 'convert-3d', label: 'Convert to 3D', description: 'Convert to 3D models' },
  ];

  const toggleStep = (stepId: string) => {
    setSelectedSteps((prev) =>
      prev.includes(stepId)
        ? prev.filter((s) => s !== stepId)
        : [...prev, stepId].sort((a, b) => {
            const order = ['generate', 'remove-bg', 'convert-3d'];
            return order.indexOf(a) - order.indexOf(b);
          })
    );
  };

  const handleProcess = async () => {
    const promptList = prompts
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (promptList.length === 0) {
      setError('Please enter at least one prompt');
      return;
    }

    if (selectedSteps.length === 0) {
      setError('Please select at least one step');
      return;
    }

    const items: BulkItem[] = promptList.map((prompt) => ({ prompt }));

    setLoading(true);
    setError(null);
    setResults(null);
    setProgress({ current: 0, total: items.length });

    try {
      const response = await fetch('/api/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, steps: selectedSteps }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bulk processing failed');
      }

      setResults(data.results);
      setProgress({ current: data.summary.total, total: data.summary.total });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk processing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = () => {
    if (!results) return;

    results.forEach((result) => {
      if (result.success && result.modelPath) {
        const link = document.createElement('a');
        link.href = result.modelPath;
        link.download = result.modelPath.split('/').pop() || 'model.glb';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Bulk Processing</h2>
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

        <div className="p-6 space-y-6">
          {/* Step selection */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Select Steps</h3>
            <div className="space-y-2">
              {steps.map((step) => (
                <label
                  key={step.id}
                  className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedSteps.includes(step.id)}
                    onChange={() => toggleStep(step.id)}
                    className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                  />
                  <div>
                    <p className="font-medium">{step.label}</p>
                    <p className="text-sm text-gray-500">{step.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Prompts input */}
          {selectedSteps.includes('generate') && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">
                Prompts (one per line)
              </h3>
              <textarea
                value={prompts}
                onChange={(e) => setPrompts(e.target.value)}
                rows={6}
                placeholder="A cute cartoon robot&#10;A wooden treasure chest&#10;A fantasy crystal sword"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <p className="text-sm text-gray-500 mt-1">
                {prompts.split('\n').filter((p) => p.trim()).length} prompt(s)
              </p>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
              {error}
            </div>
          )}

          {/* Progress */}
          {loading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Processing...</span>
                <span>
                  {progress.current}/{progress.total}
                </span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 animate-pulse"
                  style={{
                    width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Results */}
          {results && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-400">Results</h3>
                {results.some((r) => r.success && r.modelPath) && (
                  <button
                    onClick={handleDownloadAll}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    Download All Models
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      result.success
                        ? 'bg-green-900/30 border border-green-800'
                        : 'bg-red-900/30 border border-red-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        Item {index + 1}:{' '}
                        {result.success ? 'Success' : 'Failed'}
                      </span>
                      {result.modelPath && (
                        <a
                          href={result.modelPath}
                          download
                          className="text-sm text-blue-400 hover:text-blue-300"
                        >
                          Download
                        </a>
                      )}
                    </div>
                    {result.error && (
                      <p className="text-sm text-red-400 mt-1">{result.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-800 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            {results ? 'Close' : 'Cancel'}
          </button>
          {!results && (
            <button
              onClick={handleProcess}
              disabled={loading || selectedSteps.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? 'Processing...' : 'Start Processing'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
