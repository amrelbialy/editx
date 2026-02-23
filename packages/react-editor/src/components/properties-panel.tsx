import React from 'react';
import type { CreativeEngine } from '@creative-editor/engine';
import {
  useSelectedBlockId,
  useBlockFloat,
  useBlockColor,
  useBlockType,
} from '../hooks/use-engine';

interface PropertiesPanelProps {
  engine: CreativeEngine;
}

function colorToHex(c: { r: number; g: number; b: number; a: number }): string {
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function hexToColor(hex: string): { r: number; g: number; b: number; a: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b, a: 1 };
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ engine }) => {
  const selectedBlockId = useSelectedBlockId(engine);

  console.log("selectedBlockId", selectedBlockId);
  if (selectedBlockId === null || !engine.block.exists(selectedBlockId)) {
    return (
      <div className="w-60 bg-white border-l border-gray-200 p-4">
        <h2 className="text-sm font-semibold mb-3 text-gray-500 uppercase tracking-wide">Properties</h2>
        <p className="text-sm text-gray-400">No block selected</p>
      </div>
    );
  }

  return <BlockProperties engine={engine} blockId={selectedBlockId} />;
};

interface BlockPropertiesProps {
  engine: CreativeEngine;
  blockId: number;
}

const BlockProperties: React.FC<BlockPropertiesProps> = ({ engine, blockId }) => {
  const type = useBlockType(engine, blockId);
  const x = useBlockFloat(engine, blockId, 'transform/position/x');
  const y = useBlockFloat(engine, blockId, 'transform/position/y');
  const w = useBlockFloat(engine, blockId, 'transform/size/width');
  const h = useBlockFloat(engine, blockId, 'transform/size/height');
  const rotation = useBlockFloat(engine, blockId, 'transform/rotation');
  const opacity = useBlockFloat(engine, blockId, 'appearance/opacity');
  const fillColor = useBlockColor(engine, blockId, 'fill/color');

  const handleFloat = (key: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) engine.block.setFloat(blockId, key, num);
  };

  const handleColor = (hex: string) => {
    engine.block.setColor(blockId, 'fill/color', hexToColor(hex));
  };

  return (
    <div className="w-60 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-sm font-semibold mb-3 text-gray-500 uppercase tracking-wide">Properties</h2>

      <p className="text-xs text-gray-400 mb-3">
        {type} #{blockId}
      </p>

      <div className="space-y-3">
        <fieldset className="space-y-1">
          <legend className="text-xs font-medium text-gray-500">Position</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs text-gray-500">X</span>
              <input
                type="number"
                value={Math.round(x)}
                onChange={(e) => handleFloat('transform/position/x', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">Y</span>
              <input
                type="number"
                value={Math.round(y)}
                onChange={(e) => handleFloat('transform/position/y', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="space-y-1">
          <legend className="text-xs font-medium text-gray-500">Size</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs text-gray-500">W</span>
              <input
                type="number"
                value={Math.round(w)}
                onChange={(e) => handleFloat('transform/size/width', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">H</span>
              <input
                type="number"
                value={Math.round(h)}
                onChange={(e) => handleFloat('transform/size/height', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </label>
          </div>
        </fieldset>

        <label className="block">
          <span className="text-xs font-medium text-gray-500">Rotation</span>
          <input
            type="number"
            value={Math.round(rotation)}
            onChange={(e) => handleFloat('transform/rotation', e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-gray-500">Opacity</span>
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={opacity}
            onChange={(e) => handleFloat('appearance/opacity', e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-gray-500">Fill</span>
          <input
            type="color"
            value={colorToHex(fillColor)}
            onChange={(e) => handleColor(e.target.value)}
            className="w-full h-8 border border-gray-300 rounded cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};
