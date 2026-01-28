'use client';

import { useState } from 'react';
import { TrellisSettings as TrellisSettingsType } from '@/lib/services/base';
import { ChevronDown, ChevronRight, Zap, Scale, Gem, Camera } from 'lucide-react';

interface TrellisSettingsProps {
  settings: TrellisSettingsType;
  onChange: (settings: TrellisSettingsType) => void;
}

type Preset = 'fast' | 'balanced' | 'highQuality' | 'photorealistic';

const PRESETS: Record<Preset, TrellisSettingsType> = {
  fast: {
    resolution: 512,
    decimation_target: 100000,
    texture_size: 1024,
    ss_guidance_strength: 7.5,
    ss_guidance_rescale: 0.7,
    ss_sampling_steps: 8,
    ss_rescale_t: 5,
    shape_slat_guidance_strength: 7.5,
    shape_slat_guidance_rescale: 0.5,
    shape_slat_sampling_steps: 8,
    shape_slat_rescale_t: 3,
    tex_slat_guidance_strength: 3,
    tex_slat_sampling_steps: 8,
    tex_slat_rescale_t: 3,
    remesh: true,
    remesh_band: 1,
    remesh_project: 0.8,
  },
  balanced: {
    resolution: 1024,
    decimation_target: 500000,
    texture_size: 2048,
    ss_guidance_strength: 7.5,
    ss_guidance_rescale: 0.7,
    ss_sampling_steps: 12,
    ss_rescale_t: 5,
    shape_slat_guidance_strength: 7.5,
    shape_slat_guidance_rescale: 0.5,
    shape_slat_sampling_steps: 12,
    shape_slat_rescale_t: 3,
    tex_slat_guidance_strength: 3,
    tex_slat_sampling_steps: 12,
    tex_slat_rescale_t: 3,
    remesh: true,
    remesh_band: 1,
    remesh_project: 1,
  },
  highQuality: {
    resolution: 1536,
    decimation_target: 800000,
    texture_size: 4096,
    ss_guidance_strength: 7.5,
    ss_guidance_rescale: 0.7,
    ss_sampling_steps: 20,
    ss_rescale_t: 5,
    shape_slat_guidance_strength: 7.5,
    shape_slat_guidance_rescale: 0.5,
    shape_slat_sampling_steps: 20,
    shape_slat_rescale_t: 3,
    tex_slat_guidance_strength: 4,
    tex_slat_sampling_steps: 20,
    tex_slat_rescale_t: 3,
    remesh: true,
    remesh_band: 1,
    remesh_project: 1,
  },
  photorealistic: {
    resolution: 1536,
    decimation_target: 1000000,
    texture_size: 4096,
    ss_guidance_strength: 8.5,
    ss_guidance_rescale: 0.7,
    ss_sampling_steps: 25,
    ss_rescale_t: 5,
    shape_slat_guidance_strength: 8.5,
    shape_slat_guidance_rescale: 0.5,
    shape_slat_sampling_steps: 25,
    shape_slat_rescale_t: 3,
    tex_slat_guidance_strength: 5,
    tex_slat_sampling_steps: 25,
    tex_slat_rescale_t: 3,
    remesh: true,
    remesh_band: 1,
    remesh_project: 1,
  },
};

const PRESET_INFO: Record<Preset, { description: string; time: string }> = {
  fast: { description: 'Draft quality', time: '~30s' },
  balanced: { description: 'Good balance', time: '~1-2m' },
  highQuality: { description: 'Best detail', time: '~3-5m' },
  photorealistic: { description: 'Maximum realism', time: '~5-8m' },
};

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
        <span className="text-xs text-indigo-400 font-mono">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
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
    <div className="flex items-center justify-between py-2">
      <div>
        <label className="text-xs text-gray-400">{label}</label>
        {description && <p className="text-xs text-gray-600">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? 'bg-indigo-500' : 'bg-gray-800'
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
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
        className="w-full px-2.5 py-1.5 text-sm bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-300 focus:outline-none focus:border-indigo-500/50"
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

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, icon, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-800/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-xs font-medium text-gray-400 flex items-center gap-2">
          {icon}
          {title}
        </span>
        {isOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
      </button>
      {isOpen && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
}

export function TrellisSettings({ settings, onChange }: TrellisSettingsProps) {
  const update = (key: keyof TrellisSettingsType, value: number | boolean) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-300">3D Generation Settings</h2>
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-4 gap-1.5">
        <button
          onClick={() => onChange({ ...PRESETS.fast })}
          className={`group relative flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
            JSON.stringify(settings) === JSON.stringify(PRESETS.fast)
              ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
          }`}
          title={`${PRESET_INFO.fast.description} • ${PRESET_INFO.fast.time}`}
        >
          <Zap className="w-4 h-4" />
          <span className="text-xs font-medium">Fast</span>
        </button>
        <button
          onClick={() => onChange({ ...PRESETS.balanced })}
          className={`group relative flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
            JSON.stringify(settings) === JSON.stringify(PRESETS.balanced)
              ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
          }`}
          title={`${PRESET_INFO.balanced.description} • ${PRESET_INFO.balanced.time}`}
        >
          <Scale className="w-4 h-4" />
          <span className="text-xs font-medium">Balanced</span>
        </button>
        <button
          onClick={() => onChange({ ...PRESETS.highQuality })}
          className={`group relative flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
            JSON.stringify(settings) === JSON.stringify(PRESETS.highQuality)
              ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
          }`}
          title={`${PRESET_INFO.highQuality.description} • ${PRESET_INFO.highQuality.time}`}
        >
          <Gem className="w-4 h-4" />
          <span className="text-xs font-medium">Quality</span>
        </button>
        <button
          onClick={() => onChange({ ...PRESETS.photorealistic })}
          className={`group relative flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
            JSON.stringify(settings) === JSON.stringify(PRESETS.photorealistic)
              ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
          }`}
          title={`${PRESET_INFO.photorealistic.description} • ${PRESET_INFO.photorealistic.time}`}
        >
          <Camera className="w-4 h-4" />
          <span className="text-xs font-medium">Photo</span>
        </button>
      </div>

      {/* Preset info */}
      {JSON.stringify(settings) === JSON.stringify(PRESETS.fast) && (
        <div className="text-xs text-gray-500 text-center bg-amber-500/10 border border-amber-500/20 rounded-lg py-2">
          <span className="text-amber-400 font-medium">Fast preset:</span> Draft quality • ~30s per generation
        </div>
      )}
      {JSON.stringify(settings) === JSON.stringify(PRESETS.balanced) && (
        <div className="text-xs text-gray-500 text-center bg-blue-500/10 border border-blue-500/20 rounded-lg py-2">
          <span className="text-blue-400 font-medium">Balanced preset:</span> Good balance • ~1-2m per generation
        </div>
      )}
      {JSON.stringify(settings) === JSON.stringify(PRESETS.highQuality) && (
        <div className="text-xs text-gray-500 text-center bg-violet-500/10 border border-violet-500/20 rounded-lg py-2">
          <span className="text-violet-400 font-medium">High Quality preset:</span> Best detail • ~3-5m per generation
        </div>
      )}
      {JSON.stringify(settings) === JSON.stringify(PRESETS.photorealistic) && (
        <div className="text-xs text-gray-500 text-center bg-pink-500/10 border border-pink-500/20 rounded-lg py-2">
          <span className="text-pink-400 font-medium">Photorealistic preset:</span> Maximum realism • ~5-8m per generation
        </div>
      )}

      {/* Main Settings */}
      <div className="space-y-3 p-3 bg-gradient-to-br from-indigo-500/5 to-violet-500/5 border border-indigo-500/10 rounded-xl">
        <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wide flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
          Main Settings
        </h3>
        <Select
          label="Resolution"
          value={settings.resolution || 1024}
          onChange={(v) => update('resolution', v)}
          options={[
            { value: 512, label: '512px (Fast)' },
            { value: 1024, label: '1024px (Balanced)' },
            { value: 1536, label: '1536px (Quality)' },
          ]}
        />
        <Slider
          label="Decimation Target"
          value={settings.decimation_target || 500000}
          onChange={(v) => update('decimation_target', v)}
          min={10000}
          max={1000000}
          step={50000}
          description="Mesh vertex count (lower = simpler)"
        />
        <Select
          label="Texture Size"
          value={settings.texture_size || 2048}
          onChange={(v) => update('texture_size', v)}
          options={[
            { value: 1024, label: '1024px (Fast)' },
            { value: 2048, label: '2048px (Balanced)' },
            { value: 4096, label: '4096px (Quality)' },
          ]}
        />
      </div>

      {/* Advanced Settings */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Advanced Settings
        </h3>

        {/* Stage 1: Sparse Structure */}
        <CollapsibleSection
          title="Stage 1: Sparse Structure Generation"
          icon={<span className="text-indigo-400">1</span>}
          defaultOpen={false}
        >
          <div className="space-y-3">
            <Slider
              label="Guidance Strength"
              value={settings.ss_guidance_strength || 7.5}
              onChange={(v) => update('ss_guidance_strength', v)}
              min={0}
              max={10}
              step={0.5}
              description="Control over image guidance"
            />
            <Slider
              label="Guidance Rescale"
              value={settings.ss_guidance_rescale || 0.7}
              onChange={(v) => update('ss_guidance_rescale', v)}
              min={0}
              max={1}
              step={0.1}
              description="Rescale factor for guidance"
            />
            <Slider
              label="Sampling Steps"
              value={settings.ss_sampling_steps || 12}
              onChange={(v) => update('ss_sampling_steps', v)}
              min={1}
              max={50}
              step={1}
              description="Higher = better quality, slower"
            />
            <Slider
              label="Rescale T"
              value={settings.ss_rescale_t || 5}
              onChange={(v) => update('ss_rescale_t', v)}
              min={1}
              max={10}
              step={1}
              description="Rescale timestep"
            />
          </div>
        </CollapsibleSection>

        {/* Stage 2: Shape Generation */}
        <CollapsibleSection
          title="Stage 2: Shape Generation"
          icon={<span className="text-violet-400">2</span>}
          defaultOpen={false}
        >
          <div className="space-y-3">
            <Slider
              label="Guidance Strength"
              value={settings.shape_slat_guidance_strength || 7.5}
              onChange={(v) => update('shape_slat_guidance_strength', v)}
              min={0}
              max={10}
              step={0.5}
              description="Control over shape guidance"
            />
            <Slider
              label="Guidance Rescale"
              value={settings.shape_slat_guidance_rescale || 0.5}
              onChange={(v) => update('shape_slat_guidance_rescale', v)}
              min={0}
              max={1}
              step={0.1}
              description="Rescale factor for guidance"
            />
            <Slider
              label="Sampling Steps"
              value={settings.shape_slat_sampling_steps || 12}
              onChange={(v) => update('shape_slat_sampling_steps', v)}
              min={1}
              max={50}
              step={1}
              description="Higher = better shape, slower"
            />
            <Slider
              label="Rescale T"
              value={settings.shape_slat_rescale_t || 3}
              onChange={(v) => update('shape_slat_rescale_t', v)}
              min={1}
              max={10}
              step={1}
              description="Rescale timestep"
            />
          </div>
        </CollapsibleSection>

        {/* Stage 3: Texture Generation */}
        <CollapsibleSection
          title="Stage 3: Texture Generation"
          icon={<span className="text-pink-400">3</span>}
          defaultOpen={false}
        >
          <div className="space-y-3">
            <Slider
              label="Guidance Strength"
              value={settings.tex_slat_guidance_strength || 1}
              onChange={(v) => update('tex_slat_guidance_strength', v)}
              min={0}
              max={10}
              step={0.5}
              description="Control over texture guidance"
            />
            <Slider
              label="Sampling Steps"
              value={settings.tex_slat_sampling_steps || 12}
              onChange={(v) => update('tex_slat_sampling_steps', v)}
              min={1}
              max={50}
              step={1}
              description="Higher = better textures, slower"
            />
            <Slider
              label="Rescale T"
              value={settings.tex_slat_rescale_t || 3}
              onChange={(v) => update('tex_slat_rescale_t', v)}
              min={1}
              max={10}
              step={1}
              description="Rescale timestep"
            />
          </div>
        </CollapsibleSection>

        {/* Mesh Processing */}
        <CollapsibleSection
          title="Mesh Processing"
          defaultOpen={false}
        >
          <div className="space-y-3">
            <Toggle
              label="Enable Remeshing"
              checked={settings.remesh ?? true}
              onChange={(v) => update('remesh', v)}
              description="Improves mesh quality"
            />
            {settings.remesh && (
              <>
                 <Slider
                   label="Remesh Band"
                   value={settings.remesh_band || 1}
                   onChange={(v) => update('remesh_band', v)}
                   min={0.1}
                   max={1}
                   step={0.1}
                   description="Band size for remeshing"
                 />
                 <Slider
                   label="Remesh Project"
                   value={settings.remesh_project || 1}
                   onChange={(v) => update('remesh_project', v)}
                   min={0.1}
                   max={1}
                   step={0.1}
                   description="Projection iterations"
                 />
              </>
            )}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
