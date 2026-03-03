import React from 'react';
import { useImageEditorStore, type ImageEditorTool } from '../store/image-editor-store';

const tools: { id: ImageEditorTool; label: string; icon: string }[] = [
  { id: 'crop', label: 'Crop', icon: '⬔' },
  { id: 'rotate', label: 'Rotate', icon: '↻' },
  { id: 'adjust', label: 'Adjust', icon: '◐' },
  { id: 'filter', label: 'Filters', icon: '✦' },
  { id: 'resize', label: 'Resize', icon: '⤡' },
  { id: 'shapes', label: 'Shapes', icon: '△' },
  { id: 'text', label: 'Text', icon: 'T' },
  { id: 'pen', label: 'Draw', icon: '✎' },
];

export interface ImageEditorToolbarProps {
  /** Called when the user clicks a tool button. Parent decides how to handle mode transitions. */
  onToolChange?: (tool: ImageEditorTool) => void;
}

export const ImageEditorToolbar: React.FC<ImageEditorToolbarProps> = ({ onToolChange }) => {
  const activeTool = useImageEditorStore((s) => s.activeTool);

  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-gray-800 border-b border-gray-700">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolChange?.(tool.id)}
          className={`
            flex flex-col items-center px-3 py-1.5 rounded text-xs transition-colors
            ${activeTool === tool.id
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }
          `}
          title={tool.label}
        >
          <span className="text-base leading-none mb-0.5">{tool.icon}</span>
          <span>{tool.label}</span>
        </button>
      ))}
    </div>
  );
};
