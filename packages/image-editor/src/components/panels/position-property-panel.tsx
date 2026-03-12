import React, { useCallback, useEffect, useState } from 'react';
import type { CreativeEngine } from '@creative-editor/engine';
import { SHAPE_RECT_CORNER_RADIUS } from '@creative-editor/engine';
import { Slider } from '../ui/slider';

interface PositionPropertyPanelProps {
  engine: CreativeEngine;
  blockId: number;
}

interface PosState {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
  shapeKind: string;
}

function readPos(engine: CreativeEngine, blockId: number): PosState {
  const pos = engine.block.getPosition(blockId);
  const size = engine.block.getSize(blockId);

  let cornerRadius = 0;
  let shapeKind = engine.block.getKind(blockId);
  const shapeId = engine.block.getShape(blockId);
  if (shapeId != null) {
    shapeKind = engine.block.getKind(shapeId) || shapeKind;
    if (shapeKind === 'rect') {
      cornerRadius = engine.block.getFloat(shapeId, SHAPE_RECT_CORNER_RADIUS) ?? 0;
    }
  }

  return { x: pos.x, y: pos.y, width: size.width, height: size.height, cornerRadius, shapeKind };
}

export const PositionPropertyPanel: React.FC<PositionPropertyPanelProps> = ({ engine, blockId }) => {
  const [state, setState] = useState(() => readPos(engine, blockId));

  useEffect(() => {
    setState(readPos(engine, blockId));
  }, [engine, blockId]);

  const update = useCallback(() => setState(readPos(engine, blockId)), [engine, blockId]);

  const handlePosX = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) { engine.block.setPosition(blockId, val, state.y); update(); }
  }, [engine, blockId, state.y, update]);

  const handlePosY = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) { engine.block.setPosition(blockId, state.x, val); update(); }
  }, [engine, blockId, state.x, update]);

  const handleWidth = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) { engine.block.setSize(blockId, val, state.height); update(); }
  }, [engine, blockId, state.height, update]);

  const handleHeight = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) { engine.block.setSize(blockId, state.width, val); update(); }
  }, [engine, blockId, state.width, update]);

  const handleCornerRadius = useCallback(([v]: number[]) => {
    const shapeId = engine.block.getShape(blockId);
    if (shapeId != null) {
      engine.block.setFloat(shapeId, SHAPE_RECT_CORNER_RADIUS, v);
      update();
    }
  }, [engine, blockId, update]);

  return (
    <div className="flex flex-col gap-4">
      {/* Position */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Position</span>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="X" value={state.x} onChange={handlePosX} />
          <NumberField label="Y" value={state.y} onChange={handlePosY} />
        </div>
      </div>

      {/* Size */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Size</span>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="W" value={state.width} onChange={handleWidth} />
          <NumberField label="H" value={state.height} onChange={handleHeight} />
        </div>
      </div>

      {/* Corner Radius (rect only) */}
      {state.shapeKind === 'rect' && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Border Radius</span>
          <div className="flex items-center gap-2">
            <Slider
              min={0}
              max={Math.min(state.width, state.height) / 2}
              step={1}
              value={[state.cornerRadius]}
              onValueChange={handleCornerRadius}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
              {Math.round(state.cornerRadius)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const NumberField: React.FC<{
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex items-center gap-1">
    <span className="text-xs text-muted-foreground w-4">{label}</span>
    <input
      type="number"
      value={Math.round(value)}
      onChange={onChange}
      className="w-full px-1.5 py-1 bg-muted border border-border rounded-md text-foreground text-xs"
    />
  </div>
);
