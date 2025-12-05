import React from 'react';
import { useEditorStore } from '../store/editor-store';
import { Layer } from '@creative-editor/engine';

interface LayerPanelProps {
  layers: Layer[];
  onLayerSelect?: (layerId: string) => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({ layers, onLayerSelect }) => {
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId);
  // useEditorStore((state) => state.uiTick);

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4">
      <h2 className="text-lg font-semibold mb-4">Layers</h2>
      <div className="space-y-2">
        {layers.length === 0 ? (
          <p className="text-sm text-gray-500">No layers</p>
        ) : (
          layers.map((layer) => (
            <div
              key={layer.id}
              onClick={() => onLayerSelect?.(layer.id)}
              className={`p-2 rounded cursor-pointer transition-colors ${
                selectedLayerId === layer.id
                  ? 'bg-blue-100 border border-blue-300'
                  : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{layer.name || layer.type}</span>
                <span className="text-xs text-gray-500">{layer.type}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
