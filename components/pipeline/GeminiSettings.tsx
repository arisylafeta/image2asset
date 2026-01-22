'use client';

import { GeminiSettings as GeminiSettingsType } from '@/lib/services/base';

interface GeminiSettingsProps {
  settings: GeminiSettingsType;
  onChange: (settings: GeminiSettingsType) => void;
}

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 Square', width: 1024, height: 1024 },
  { value: '16:9', label: '16:9 Landscape', width: 1344, height: 768 },
  { value: '9:16', label: '9:16 Portrait', width: 768, height: 1344 },
  { value: '4:3', label: '4:3 Standard', width: 1184, height: 864 },
  { value: '3:4', label: '3:4 Standard', width: 864, height: 1184 },
  { value: '3:2', label: '3:2 Photo', width: 1248, height: 832 },
  { value: '2:3', label: '2:3 Photo', width: 832, height: 1248 },
  { value: '5:4', label: '5:4 Print', width: 1152, height: 896 },
  { value: '4:5', label: '4:5 Print', width: 896, height: 1152 },
  { value: '21:9', label: '21:9 Ultra-wide', width: 1536, height: 672 },
] as const;

export function GeminiSettings({ settings, onChange }: GeminiSettingsProps) {
  const updateSetting = <K extends keyof GeminiSettingsType>(
    key: K,
    value: GeminiSettingsType[K]
  ) => {
    onChange({ ...settings, [key]: value });
  };

  const selectedRatio = ASPECT_RATIOS.find(r => r.value === settings.aspectRatio);

  return (
    <div className="space-y-6">
      {/* Aspect Ratio */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-300">Aspect Ratio</label>
          {selectedRatio && (
            <span className="text-xs text-indigo-400 font-medium bg-indigo-500/10 px-2 py-0.5 rounded-full">
              {selectedRatio.width} x {selectedRatio.height}
            </span>
          )}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.value}
              onClick={() => updateSetting('aspectRatio', ratio.value)}
              className={`
                flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all
                ${settings.aspectRatio === ratio.value
                  ? 'bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border-indigo-500/50 text-white ring-1 ring-indigo-500/30'
                  : 'bg-gray-900/50 border-gray-800/60 text-gray-400 hover:border-gray-700 hover:text-gray-300'
                }
              `}
              title={`${ratio.label} - ${ratio.width}x${ratio.height}`}
            >
              <div
                className={`
                  border-2 mb-1.5 transition-colors rounded-sm
                  ${settings.aspectRatio === ratio.value
                    ? 'border-indigo-400 bg-indigo-400/20'
                    : 'border-gray-600'
                  }
                `}
                style={{
                  width: '20px',
                  height: `${20 * (ratio.height / ratio.width)}px`,
                  minWidth: '12px',
                  maxWidth: '20px',
                }}
              />
              <span className="text-xs font-medium">{ratio.value}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Response Modality */}
      <div>
        <label className="text-sm font-medium text-gray-300 block mb-3">
          Output Type
        </label>
        <div className="flex gap-2 p-1 bg-gray-900/50 rounded-xl ring-1 ring-gray-800/60">
          <button
            onClick={() => updateSetting('responseModalities', 'Image')}
            className={`
              flex-1 px-4 py-2.5 rounded-lg transition-all text-sm font-medium
              ${settings.responseModalities === 'Image'
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25'
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            Image Only
          </button>
          <button
            onClick={() => updateSetting('responseModalities', 'Text,Image')}
            className={`
              flex-1 px-4 py-2.5 rounded-lg transition-all text-sm font-medium
              ${settings.responseModalities === 'Text,Image' || !settings.responseModalities
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25'
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            Image + Text
          </button>
        </div>
      </div>
    </div>
  );
}
