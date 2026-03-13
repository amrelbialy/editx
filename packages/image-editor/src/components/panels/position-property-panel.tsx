import React, { useCallback, useEffect, useState } from 'react';
import type { CreativeEngine } from '@creative-editor/engine';
import { SHAPE_RECT_CORNER_RADIUS } from '@creative-editor/engine';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
} from 'lucide-react';
import { Slider } from '../ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../utils/cn';

interface PositionPropertyPanelProps {
  engine: CreativeEngine;
  blockId: number;
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onAlign?: (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
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

export const PositionPropertyPanel: React.FC<PositionPropertyPanelProps> = ({
  engine,
  blockId,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onAlign,
}) => {
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

      {/* Move (z-order) */}
      {(onBringForward || onSendBackward || onBringToFront || onSendToBack) && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Move</span>
          <div className="flex gap-1">
            <ZOrderButton icon={<ChevronsUp className="h-4 w-4" />} label="Bring to Front" onClick={onBringToFront} />
            <ZOrderButton icon={<ChevronUp className="h-4 w-4" />} label="Bring Forward" onClick={onBringForward} />
            <ZOrderButton icon={<ChevronDown className="h-4 w-4" />} label="Send Backward" onClick={onSendBackward} />
            <ZOrderButton icon={<ChevronsDown className="h-4 w-4" />} label="Send to Back" onClick={onSendToBack} />
          </div>
        </div>
      )}

      {/* Align to Page */}
      {onAlign && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Align to Page</span>
          <div className="grid grid-cols-3 gap-1">
            <ZOrderButton icon={<AlignStartVertical className="h-4 w-4" />} label="Align Left" onClick={() => onAlign('left')} />
            <ZOrderButton icon={<AlignCenterVertical className="h-4 w-4" />} label="Align Center" onClick={() => onAlign('center')} />
            <ZOrderButton icon={<AlignEndVertical className="h-4 w-4" />} label="Align Right" onClick={() => onAlign('right')} />
            <ZOrderButton icon={<AlignStartHorizontal className="h-4 w-4" />} label="Align Top" onClick={() => onAlign('top')} />
            <ZOrderButton icon={<AlignCenterHorizontal className="h-4 w-4" />} label="Align Middle" onClick={() => onAlign('middle')} />
            <ZOrderButton icon={<AlignEndHorizontal className="h-4 w-4" />} label="Align Bottom" onClick={() => onAlign('bottom')} />
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

const ZOrderButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}> = ({ icon, label, onClick }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        onClick={onClick}
        disabled={!onClick}
        className={cn(
          'flex items-center justify-center h-8 w-8 rounded-md transition-colors',
          onClick
            ? 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            : 'text-muted-foreground/40 cursor-not-allowed',
        )}
      >
        {icon}
      </button>
    </TooltipTrigger>
    <TooltipContent side="bottom">{label}</TooltipContent>
  </Tooltip>
);
