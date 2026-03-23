import React, { useCallback, useEffect, useState } from 'react';
import type { CreativeEngine } from '@creative-editor/engine';
import {
  colorToHex,
  hexToColor,
  FILL_SOLID_COLOR,
  FILL_COLOR,
} from '@creative-editor/engine';
import { cn } from '../../utils/cn';

interface BackgroundPropertyPanelProps {
  engine: CreativeEngine;
  blockId: number;
}

const DEFAULT_COLORS = [
  '#FFFFFF', '#000000', '#3B82F6', '#6366F1',
  '#10B981', '#059669', '#EF4444', '#DC2626',
  '#F59E0B', '#D97706', '#8B5CF6', '#EC4899',
  '#14B8A6', '#06B6D4', '#F97316', '#84CC16',
];

function readFillState(engine: CreativeEngine, blockId: number) {
  const fillEnabled = engine.block.isFillEnabled(blockId);
  let color = '#000000';
  const fillId = engine.block.getFill(blockId);
  if (fillId != null) {
    const c = engine.block.getColor(fillId, FILL_SOLID_COLOR);
    if (c) color = colorToHex(c).substring(0, 7);
  } else {
    // Text blocks don't have fill sub-blocks; read FILL_COLOR directly
    const c = engine.block.getColor(blockId, FILL_COLOR);
    if (c) color = colorToHex(c).substring(0, 7);
  }
  return { enabled: fillEnabled, color };
}

export const BackgroundPropertyPanel: React.FC<BackgroundPropertyPanelProps> = ({ engine, blockId }) => {
  const [state, setState] = useState(() => readFillState(engine, blockId));

  useEffect(() => {
    setState(readFillState(engine, blockId));
  }, [engine, blockId]);

  // Re-sync when undo/redo changes engine state
  useEffect(() => {
    const handler = () => setState(readFillState(engine, blockId));
    engine.on('history:undo', handler);
    engine.on('history:redo', handler);
    return () => {
      engine.off('history:undo', handler);
      engine.off('history:redo', handler);
    };
  }, [engine, blockId]);

  const refresh = useCallback(() => setState(readFillState(engine, blockId)), [engine, blockId]);

  const handleToggle = useCallback(() => {
    engine.block.setFillEnabled(blockId, !state.enabled);
    refresh();
  }, [engine, blockId, state.enabled, refresh]);

  const handleColorChange = useCallback((newColor: string) => {
    const fillId = engine.block.getFill(blockId);
    if (fillId != null) {
      engine.block.setColor(fillId, FILL_SOLID_COLOR, hexToColor(newColor));
    } else {
      // Text blocks: set fill color directly on the block
      engine.block.setColor(blockId, FILL_COLOR, hexToColor(newColor));
    }
    if (!state.enabled) {
      engine.block.setFillEnabled(blockId, true);
    }
    refresh();
  }, [engine, blockId, state.enabled, refresh]);

  return (
    <div className="flex flex-col gap-4">
      {/* Enable toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={state.enabled}
          onChange={handleToggle}
          className="w-4 h-4 rounded border-border accent-primary"
        />
        <span className="text-sm text-foreground">Enable Background</span>
      </label>

      {state.enabled && (
        <>
          {/* Color picker */}
          <input
            type="color"
            value={state.color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-full h-40 rounded-lg border border-border bg-transparent cursor-pointer"
          />

          {/* Default Colors */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">Default Colors</span>
            <div className="grid grid-cols-8 gap-1.5">
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => handleColorChange(c)}
                  className={cn(
                    'w-7 h-7 rounded-md border transition-transform hover:scale-110',
                    state.color === c ? 'ring-2 ring-primary ring-offset-1 ring-offset-card' : 'border-border',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
