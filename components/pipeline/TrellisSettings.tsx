'use client';

import { TrellisSettings as TrellisSettingsType } from '@/lib/services/base';

interface TrellisSettingsProps {
  settings: TrellisSettingsType;
  onChange: (settings: TrellisSettingsType) => void;
}

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  description?: string;
}

function Slider({ label, value, onChange, min, max, step, description }: SliderProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-xs text-gray-400">{label}</label>
        <span className="text-xs text-gray-500 font-mono">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gray-500"
      />
      {description && <p className="text-xs text-gray-600">{description}</p>}
    </div>
  );
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

function Toggle({ label, checked, onChange, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <label className="text-xs text-gray-400">{label}</label>
        {description && <p className="text-xs text-gray-600">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? 'bg-gray-600' : 'bg-gray-800'
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 bg-gray-300 rounded-full transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

interface SelectProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  options: { value: number; label: string }[];
}

function Select({ label, value, onChange, options }: SelectProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-gray-300 focus:outline-none focus:border-gray-600"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TrellisSettings({ settings, onChange }: TrellisSettingsProps) {
  const update = (key: keyof TrellisSettingsType, value: number | boolean) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-sm font-medium text-gray-400">3D Generation Settings</h2>

      {/* Resolution */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Output</h3>
        <Select
          label="Resolution"
          value={settings.resolution || 1024}
          onChange={(v) => update('resolution', v)}
          options={[
            { value: 512, label: '512px' },
            { value: 1024, label: '1024px' },
            { value: 2048, label: '2048px' },
          ]}
        />
        <Select
          label="Texture Size"
          value={settings.texture_size || 2048}
          onChange={(v) => update('texture_size', v)}
          options={[
            { value: 512, label: '512px' },
            { value: 1024, label: '1024px' },
            { value: 2048, label: '2048px' },
          ]}
        />
      </div>

      {/* Sparse Structure */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Sparse Structure
        </h3>
        <Slider
          label="Guidance Strength"
          value={settings.ss_guidance_strength || 7.5}
          onChange={(v) => update('ss_guidance_strength', v)}
          min={0}
          max={10}
          step={0.5}
        />
        <Slider
          label="Guidance Rescale"
          value={settings.ss_guidance_rescale || 0.7}
          onChange={(v) => update('ss_guidance_rescale', v)}
          min={0}
          max={1}
          step={0.1}
        />
        <Slider
          label="Sampling Steps"
          value={settings.ss_sampling_steps || 12}
          onChange={(v) => update('ss_sampling_steps', v)}
          min={1}
          max={50}
          step={1}
        />
        <Slider
          label="Rescale T"
          value={settings.ss_rescale_t || 5}
          onChange={(v) => update('ss_rescale_t', v)}
          min={1}
          max={10}
          step={1}
        />
      </div>

      {/* Shape SLAT */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Shape SLAT</h3>
        <Slider
          label="Guidance Strength"
          value={settings.shape_slat_guidance_strength || 7.5}
          onChange={(v) => update('shape_slat_guidance_strength', v)}
          min={0}
          max={10}
          step={0.5}
        />
        <Slider
          label="Guidance Rescale"
          value={settings.shape_slat_guidance_rescale || 0.5}
          onChange={(v) => update('shape_slat_guidance_rescale', v)}
          min={0}
          max={1}
          step={0.1}
        />
        <Slider
          label="Sampling Steps"
          value={settings.shape_slat_sampling_steps || 12}
          onChange={(v) => update('shape_slat_sampling_steps', v)}
          min={1}
          max={50}
          step={1}
        />
        <Slider
          label="Rescale T"
          value={settings.shape_slat_rescale_t || 3}
          onChange={(v) => update('shape_slat_rescale_t', v)}
          min={1}
          max={10}
          step={1}
        />
      </div>

      {/* Texture SLAT */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Texture SLAT</h3>
        <Slider
          label="Guidance Strength"
          value={settings.tex_slat_guidance_strength || 1}
          onChange={(v) => update('tex_slat_guidance_strength', v)}
          min={0}
          max={10}
          step={0.5}
        />
        <Slider
          label="Sampling Steps"
          value={settings.tex_slat_sampling_steps || 12}
          onChange={(v) => update('tex_slat_sampling_steps', v)}
          min={1}
          max={50}
          step={1}
        />
        <Slider
          label="Rescale T"
          value={settings.tex_slat_rescale_t || 3}
          onChange={(v) => update('tex_slat_rescale_t', v)}
          min={1}
          max={10}
          step={1}
        />
      </div>

      {/* Mesh */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mesh</h3>
        <Slider
          label="Decimation Target"
          value={settings.decimation_target || 500000}
          onChange={(v) => update('decimation_target', v)}
          min={10000}
          max={1000000}
          step={10000}
        />
        <Toggle
          label="Remesh"
          checked={settings.remesh ?? true}
          onChange={(v) => update('remesh', v)}
        />
        {settings.remesh && (
          <Slider
            label="Remesh Band"
            value={settings.remesh_band || 1}
            onChange={(v) => update('remesh_band', v)}
            min={1}
            max={5}
            step={1}
          />
        )}
      </div>
    </div>
  );
}
