import React from 'react';
import { Scan, Square, RectangleHorizontal, RectangleVertical, Monitor, Smartphone } from 'lucide-react';
import { useImageEditorStore, type CropPresetId } from '../../store/image-editor-store';
import { cn } from '../../utils/cn';

const presets: { id: CropPresetId; label: string; icon: React.ReactNode }[] = [
  { id: 'free', label: 'Free', icon: <Scan className="h-4 w-4" /> },
  { id: 'original', label: 'Original', icon: <RectangleHorizontal className="h-4 w-4" /> },
  { id: '1:1', label: '1:1', icon: <Square className="h-4 w-4" /> },
  { id: '4:3', label: '4:3', icon: <RectangleHorizontal className="h-4 w-4" /> },
  { id: '3:4', label: '3:4', icon: <RectangleVertical className="h-4 w-4" /> },
  { id: '16:9', label: '16:9', icon: <Monitor className="h-4 w-4" /> },
  { id: '9:16', label: '9:16', icon: <Smartphone className="h-4 w-4" /> },
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
    <div className="flex flex-col gap-1">
      <div className="text-xs font-medium text-muted-foreground mb-1">Aspect Ratio</div>
      <div className="grid grid-cols-2 gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleSelect(preset.id)}
            data-testid={`crop-preset-${preset.id}`}
            className={cn(
              'flex flex-col items-center gap-1 rounded-md px-2 py-2.5 text-xs transition-colors',
              cropPreset === preset.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {preset.icon}
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
};
