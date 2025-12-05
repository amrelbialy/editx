import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../store/editor-store';
import { Layer, UpdateLayerCommand } from '@creative-editor/engine';

interface PropertiesPanelProps {
  layer: Layer | null;
  onUpdate?: (layerId: string, updates: Partial<Layer>) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  document,
  controller,
}) => {
  useEditorStore((state) => state.transformTick);
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId);

  const layer = selectedLayerId ? document.getLayer(selectedLayerId) : null;

  if (!layer) {
    return (
      <div className="w-64 bg-white border-l border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-4">Properties</h2>
        <p className="text-sm text-gray-500">No layer selected</p>
      </div>
    );
  }

  const handleChange = (field: keyof Layer, value: string | number) => {
    console.log('handleChange', field, value, layer.id);
    controller?.run(new UpdateLayerCommand(document, layer.id, { [field]: value }));
  };

  console.log('layerUpdated', layer);
  return (
    <div className="w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Properties</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={layer.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">X</label>
            <input
              type="number"
              value={layer.x ?? 0}
              onChange={(e) => handleChange('x', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Y</label>
            <input
              type="number"
              value={layer.y ?? 0}
              onChange={(e) => handleChange('y', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
            <input
              type="number"
              value={layer.width ?? 0}
              onChange={(e) => handleChange('width', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
            <input
              type="number"
              value={layer.height ?? 0}
              onChange={(e) => handleChange('height', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Opacity</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={layer.opacity ?? 1}
            onChange={(e) => handleChange('opacity', parseFloat(e.target.value) || 1)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fill</label>
          <input
            type="color"
            value={layer.fill || '#000000'}
            onChange={(e) => handleChange('fill', e.target.value)}
            className="w-full h-10 border border-gray-300 rounded"
          />
        </div>
      </div>
    </div>
  );
};
