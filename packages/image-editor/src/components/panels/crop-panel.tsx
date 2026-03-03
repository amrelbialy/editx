import React from 'react';
import { useImageEditorStore, type CropPresetId } from '../../store/image-editor-store';

const presets: { id: CropPresetId; label: string }[] = [
  { id: 'free', label: 'Free' },
  { id: 'original', label: 'Original' },
  { id: '1:1', label: '1:1' },
  { id: '4:3', label: '4:3' },
  { id: '3:4', label: '3:4' },
  { id: '16:9', label: '16:9' },
  { id: '9:16', label: '9:16' },
];

export interface CropPanelProps {
  /** Called when user selects a preset. */
  onPresetChange?: (presetId: CropPresetId) => void;
}

export const CropPanel: React.FC<CropPanelProps> = ({ onPresetChange }) => {
  const cropPreset = useImageEditorStore((s) => s.cropPreset);
  const setCropPreset = useImageEditorStore((s) => s.setCropPreset);

  const handleSelect = (id: CropPresetId) => {
    if (id === cropPreset) return;
    setCropPreset(id);
    onPresetChange?.(id);
  };

  return (
    <div className="flex flex-col gap-1 p-2 bg-gray-800 border-r border-gray-700 min-w-[140px]">
      <div className="text-xs text-gray-400 font-medium px-2 py-1">Crop Ratio</div>
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => handleSelect(preset.id)}
          data-testid={`crop-preset-${preset.id}`}
          className={`
            px-3 py-1.5 rounded text-sm text-left transition-colors
            ${cropPreset === preset.id
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }
          `}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
};
