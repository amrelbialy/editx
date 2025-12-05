import React from 'react';
import { useEditorStore, type Tool } from '../store/editor-store';
import { cn } from '../utils/cn';

const tools: { id: Tool; label: string; icon: string }[] = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'rectangle', label: 'Rectangle', icon: '▭' },
  { id: 'circle', label: 'Circle', icon: '○' },
  { id: 'text', label: 'Text', icon: 'T' },
];

export const Toolbar: React.FC = () => {
  const activeTool = useEditorStore((state) => state.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-100 border-b border-gray-200">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          className={cn(
            'px-4 py-2 rounded transition-colors',
            activeTool === tool.id
              ? 'bg-blue-500 text-white'
              : 'bg-white hover:bg-gray-200 text-gray-700'
          )}
          title={tool.label}
        >
          <span className="text-lg">{tool.icon}</span>
          <span className="ml-2 text-sm">{tool.label}</span>
        </button>
      ))}
    </div>
  );
};
