import React from 'react';
import type { ShapeType } from '@creative-editor/engine';

export interface ShapesPanelProps {
  onAddShape: (shapeType: ShapeType, sides?: number) => void;
}

const SHAPES: Array<{ type: ShapeType; label: string; icon: string }> = [
  { type: 'rect', label: 'Rectangle', icon: '▬' },
  { type: 'ellipse', label: 'Ellipse', icon: '⬭' },
  { type: 'polygon', label: 'Triangle', icon: '△' },
  { type: 'polygon', label: 'Pentagon', icon: '⬠' },
  { type: 'polygon', label: 'Hexagon', icon: '⬡' },
  { type: 'star', label: 'Star', icon: '★' },
  { type: 'line', label: 'Arrow', icon: '→' },
];

/** Extra polygon sides for named shapes. */
const POLYGON_SIDES: Record<string, number> = {
  Triangle: 3,
  Pentagon: 5,
  Hexagon: 6,
};

export const ShapesPanel: React.FC<ShapesPanelProps> = ({ onAddShape }) => {
  return (
    <div className="flex flex-col gap-1 p-2 bg-gray-800 border-r border-gray-700 min-w-[200px] overflow-y-auto">
      <div className="text-xs text-gray-400 font-medium px-2 py-1">Shapes</div>
      {SHAPES.map((shape) => (
        <button
          key={shape.label}
          onClick={() => onAddShape(shape.type, POLYGON_SIDES[shape.label])}
          data-testid={`shape-${shape.label.toLowerCase()}`}
          className="w-full text-left px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <span className="text-lg">{shape.icon}</span>
          {shape.label}
        </button>
      ))}
    </div>
  );
};
