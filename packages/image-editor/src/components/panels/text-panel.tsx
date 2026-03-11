import React from 'react';
import { Heading, Type, AlignLeft } from 'lucide-react';
import type { TextPreset } from '../../hooks/use-text-tool';

export interface TextPanelProps {
  onAddText: (preset: TextPreset) => void;
}

const TEXT_PRESETS: Array<{ preset: TextPreset; label: string; icon: React.ReactNode }> = [
  { preset: 'heading',    label: 'Heading',    icon: <Heading className="h-5 w-5" /> },
  { preset: 'subheading', label: 'Subheading', icon: <Type className="h-5 w-5" /> },
  { preset: 'body',       label: 'Body Text',  icon: <AlignLeft className="h-5 w-5" /> },
];

export const TextPanel: React.FC<TextPanelProps> = ({ onAddText }) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-medium text-muted-foreground mb-1">Add Text</div>
      <div className="grid grid-cols-3 gap-1.5">
        {TEXT_PRESETS.map((item) => (
          <button
            key={item.preset}
            onClick={() => onAddText(item.preset)}
            data-testid={`text-${item.preset}`}
            className="flex flex-col items-center gap-1 rounded-md px-2 py-3 text-xs text-muted-foreground bg-muted hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
