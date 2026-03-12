import React, { useCallback, useEffect, useState } from 'react';
import type { CreativeEngine } from '@creative-editor/engine';
import {
  colorToHex,
  hexToColor,
  FILL_SOLID_COLOR,
} from '@creative-editor/engine';
import { Slider } from '../ui/slider';
import { useImageEditorStore } from '../../store/image-editor-store';
import { cn } from '../../utils/cn';

interface ColorPropertyPanelProps {
  engine: CreativeEngine;
  blockId: number;
  blockType: 'text' | 'graphic';
}

const DEFAULT_COLORS = [
  '#FFFFFF', '#000000', '#3B82F6', '#6366F1',
  '#10B981', '#059669', '#EF4444', '#DC2626',
  '#F59E0B', '#D97706', '#8B5CF6', '#EC4899',
  '#14B8A6', '#06B6D4', '#F97316', '#84CC16',
];

export const ColorPropertyPanel: React.FC<ColorPropertyPanelProps> = ({
  engine,
  blockId,
  blockType,
}) => {
  const textSelectionRange = useImageEditorStore((s) => s.textSelectionRange);
  const editingTextBlockId = useImageEditorStore((s) => s.editingTextBlockId);

  const isText = blockType === 'text';
  const hasCharSelection = isText && editingTextBlockId === blockId &&
    textSelectionRange !== null && textSelectionRange.from !== textSelectionRange.to;

  const readColor = useCallback(() => {
    if (isText) {
      const runs = engine.block.getTextRuns(blockId);
      let targetStyle = runs[0]?.style ?? {};
      if (textSelectionRange?.from != null && textSelectionRange.from > 0) {
        let offset = 0;
        for (const run of runs) {
          if (offset + run.text.length > textSelectionRange.from) {
            targetStyle = run.style;
            break;
          }
          offset += run.text.length;
        }
      }
      return targetStyle.fill ?? '#000000';
    }
    const fillId = engine.block.getFill(blockId);
    if (fillId != null) {
      const c = engine.block.getColor(fillId, FILL_SOLID_COLOR);
      if (c) return colorToHex(c).substring(0, 7);
    }
    return '#4a90e2';
  }, [engine, blockId, isText, textSelectionRange]);

  const [color, setColor] = useState(readColor);
  const [opacity, setOpacity] = useState(() => engine.block.getOpacity(blockId));

  useEffect(() => {
    setColor(readColor());
    setOpacity(engine.block.getOpacity(blockId));
  }, [readColor, engine, blockId]);

  const getStyleRange = useCallback((): { start: number; end: number } => {
    if (hasCharSelection && textSelectionRange) {
      return { start: textSelectionRange.from, end: textSelectionRange.to };
    }
    if (isText) {
      return { start: 0, end: engine.block.getTextContent(blockId).length };
    }
    return { start: 0, end: 0 };
  }, [engine, blockId, hasCharSelection, isText, textSelectionRange]);

  const handleColorChange = useCallback((newColor: string) => {
    if (isText) {
      const { start, end } = getStyleRange();
      engine.block.setTextColor(blockId, start, end, newColor);
    } else {
      const fillId = engine.block.getFill(blockId);
      if (fillId != null) {
        engine.block.setColor(fillId, FILL_SOLID_COLOR, hexToColor(newColor));
      }
    }
    setColor(newColor);
  }, [engine, blockId, isText, getStyleRange]);

  const handleOpacityChange = useCallback(([v]: number[]) => {
    engine.block.setOpacity(blockId, v);
    setOpacity(v);
  }, [engine, blockId]);

  const handleHexInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9a-fA-F]/g, '').substring(0, 6);
    if (val.length === 6) {
      handleColorChange('#' + val);
    }
  }, [handleColorChange]);

  return (
    <div className="flex flex-col gap-4">
      {/* Color picker */}
      <div className="flex flex-col gap-3">
        <input
          type="color"
          value={color}
          onChange={(e) => handleColorChange(e.target.value)}
          className="w-full h-40 rounded-lg border border-border bg-transparent cursor-pointer"
        />
      </div>

      {/* Opacity */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Opacity</span>
          <span className="text-xs text-muted-foreground tabular-nums">{Math.round(opacity * 100)}</span>
        </div>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[opacity]}
          onValueChange={handleOpacityChange}
        />
      </div>

      {/* Hex input */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Hex</span>
        <div className="flex items-center gap-1 flex-1">
          <input
            type="text"
            value={color.replace('#', '').toUpperCase()}
            onChange={handleHexInput}
            maxLength={6}
            className="flex-1 h-7 rounded-md border border-border bg-background px-2 text-xs font-mono"
          />
          <span className="text-xs text-muted-foreground">#</span>
        </div>
      </div>

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
                color === c ? 'ring-2 ring-primary ring-offset-1 ring-offset-card' : 'border-border',
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
