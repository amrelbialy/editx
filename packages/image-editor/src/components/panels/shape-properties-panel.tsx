import {
  type Color,
  type CreativeEngine,
  colorToHex,
  FILL_SOLID_COLOR,
  hexToColor,
  SHAPE_RECT_CORNER_RADIUS,
} from "@creative-editor/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Separator } from "../ui/separator";
import { Slider } from "../ui/slider";

export interface ShapePropertiesPanelProps {
  engine: CreativeEngine;
  blockId: number;
}

interface ShapeState {
  fillColor: string;
  opacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
  shapeKind: string;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
}

function colorToInputHex(c: Color): string {
  return colorToHex(c).substring(0, 7);
}

function readShapeState(engine: CreativeEngine, blockId: number): ShapeState {
  const b = engine.block;
  const pos = b.getPosition(blockId);
  const size = b.getSize(blockId);

  let fillColor = "#4a90e2";
  const fillId = b.getFill(blockId);
  if (fillId != null) {
    const c = b.getColor(fillId, FILL_SOLID_COLOR);
    if (c) fillColor = colorToInputHex(c);
  }

  let cornerRadius = 0;
  let shapeKind = b.getKind(blockId);
  const shapeId = b.getShape(blockId);
  if (shapeId != null) {
    shapeKind = b.getKind(shapeId) || shapeKind;
    if (shapeKind === "rect") {
      cornerRadius = b.getFloat(shapeId, SHAPE_RECT_CORNER_RADIUS) ?? 0;
    }
  }

  const shadowEnabled = b.isShadowEnabled(blockId);
  const sc = b.getShadowColor(blockId);

  return {
    fillColor,
    opacity: b.getOpacity(blockId),
    x: pos.x,
    y: pos.y,
    width: size.width,
    height: size.height,
    cornerRadius,
    shapeKind,
    shadowEnabled,
    shadowColor: sc ? colorToInputHex(sc) : "#000000",
    shadowOffsetX: b.getShadowOffsetX(blockId),
    shadowOffsetY: b.getShadowOffsetY(blockId),
    shadowBlur: b.getShadowBlur(blockId),
    strokeEnabled: b.isStrokeEnabled(blockId),
    strokeColor: colorToInputHex(b.getStrokeColor(blockId)),
    strokeWidth: b.getStrokeWidth(blockId),
  };
}

export const ShapePropertiesPanel: React.FC<ShapePropertiesPanelProps> = ({ engine, blockId }) => {
  const [state, setState] = useState<ShapeState>(() => readShapeState(engine, blockId));

  useEffect(() => {
    setState(readShapeState(engine, blockId));
  }, [engine, blockId]);

  // Re-sync when undo/redo changes engine state
  useEffect(() => {
    const handler = () => setState(readShapeState(engine, blockId));
    engine.on("history:undo", handler);
    engine.on("history:redo", handler);
    return () => {
      engine.off("history:undo", handler);
      engine.off("history:redo", handler);
    };
  }, [engine, blockId]);

  const update = useCallback(() => {
    setState(readShapeState(engine, blockId));
  }, [engine, blockId]);

  const handleFillColor = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fillId = engine.block.getFill(blockId);
      if (fillId != null) {
        engine.block.setColor(fillId, FILL_SOLID_COLOR, hexToColor(e.target.value));
      }
      update();
    },
    [engine, blockId, update],
  );

  const handleOpacity = useCallback(
    ([v]: number[]) => {
      engine.block.setOpacity(blockId, v);
      update();
    },
    [engine, blockId, update],
  );

  const handlePosX = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!Number.isNaN(val)) {
        engine.block.setPosition(blockId, val, state.y);
        update();
      }
    },
    [engine, blockId, state.y, update],
  );

  const handlePosY = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!Number.isNaN(val)) {
        engine.block.setPosition(blockId, state.x, val);
        update();
      }
    },
    [engine, blockId, state.x, update],
  );

  const handleWidth = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!Number.isNaN(val) && val > 0) {
        engine.block.setSize(blockId, val, state.height);
        update();
      }
    },
    [engine, blockId, state.height, update],
  );

  const handleHeight = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!Number.isNaN(val) && val > 0) {
        engine.block.setSize(blockId, state.width, val);
        update();
      }
    },
    [engine, blockId, state.width, update],
  );

  const handleCornerRadius = useCallback(
    ([v]: number[]) => {
      const shapeId = engine.block.getShape(blockId);
      if (shapeId != null) {
        engine.block.setFloat(shapeId, SHAPE_RECT_CORNER_RADIUS, v);
        update();
      }
    },
    [engine, blockId, update],
  );

  const handleShadowToggle = useCallback(() => {
    engine.block.setShadowEnabled(blockId, !state.shadowEnabled);
    update();
  }, [engine, blockId, state.shadowEnabled, update]);

  const handleShadowColor = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      engine.block.setShadowColor(blockId, hexToColor(e.target.value));
      update();
    },
    [engine, blockId, update],
  );

  const handleShadowOffsetX = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      engine.block.setShadowOffsetX(blockId, parseFloat(e.target.value));
      update();
    },
    [engine, blockId, update],
  );

  const handleShadowOffsetY = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      engine.block.setShadowOffsetY(blockId, parseFloat(e.target.value));
      update();
    },
    [engine, blockId, update],
  );

  const handleShadowBlur = useCallback(
    ([v]: number[]) => {
      engine.block.setShadowBlur(blockId, v);
      update();
    },
    [engine, blockId, update],
  );

  const handleStrokeToggle = useCallback(() => {
    engine.block.setStrokeEnabled(blockId, !state.strokeEnabled);
    update();
  }, [engine, blockId, state.strokeEnabled, update]);

  const handleStrokeColor = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      engine.block.setStrokeColor(blockId, hexToColor(e.target.value));
      update();
    },
    [engine, blockId, update],
  );

  const handleStrokeWidth = useCallback(
    ([v]: number[]) => {
      engine.block.setStrokeWidth(blockId, v);
      update();
    },
    [engine, blockId, update],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Shape Properties
      </div>

      {/* Fill Color */}
      <Section label="Fill Color">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={state.fillColor}
            onChange={handleFillColor}
            className="w-8 h-8 rounded border border-border bg-transparent cursor-pointer"
          />
          <span className="text-xs font-mono text-muted-foreground">{state.fillColor}</span>
        </div>
      </Section>

      {/* Opacity */}
      <Section label="Opacity">
        <div className="flex items-center gap-2">
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[state.opacity]}
            onValueChange={handleOpacity}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
            {Math.round(state.opacity * 100)}%
          </span>
        </div>
      </Section>

      <Separator />

      {/* Position */}
      <Section label="Position">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="X" value={state.x} onChange={handlePosX} />
          <NumberField label="Y" value={state.y} onChange={handlePosY} />
        </div>
      </Section>

      {/* Size */}
      <Section label="Size">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="W" value={state.width} onChange={handleWidth} />
          <NumberField label="H" value={state.height} onChange={handleHeight} />
        </div>
      </Section>

      {/* Corner Radius (rect only) */}
      {state.shapeKind === "rect" && (
        <Section label="Border Radius">
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
        </Section>
      )}

      <Separator />

      {/* Stroke */}
      <Section label="Stroke">
        <ToggleRow checked={state.strokeEnabled} onToggle={handleStrokeToggle} label="Enabled" />
        {state.strokeEnabled && (
          <div className="flex flex-col gap-2 mt-1.5">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={state.strokeColor}
                onChange={handleStrokeColor}
                className="w-8 h-8 rounded border border-border bg-transparent cursor-pointer"
              />
              <span className="text-xs font-mono text-muted-foreground">{state.strokeColor}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-10">Width</span>
              <Slider
                min={0}
                max={20}
                step={0.5}
                value={[state.strokeWidth]}
                onValueChange={handleStrokeWidth}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
                {state.strokeWidth.toFixed(1)}
              </span>
            </div>
          </div>
        )}
      </Section>

      <Separator />

      {/* Shadow */}
      <Section label="Shadow">
        <ToggleRow checked={state.shadowEnabled} onToggle={handleShadowToggle} label="Enabled" />
        {state.shadowEnabled && (
          <div className="flex flex-col gap-2 mt-1.5">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={state.shadowColor}
                onChange={handleShadowColor}
                className="w-8 h-8 rounded border border-border bg-transparent cursor-pointer"
              />
              <span className="text-xs font-mono text-muted-foreground">{state.shadowColor}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="X" value={state.shadowOffsetX} onChange={handleShadowOffsetX} />
              <NumberField label="Y" value={state.shadowOffsetY} onChange={handleShadowOffsetY} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-10">Blur</span>
              <Slider
                min={0}
                max={50}
                step={1}
                value={[state.shadowBlur]}
                onValueChange={handleShadowBlur}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
                {Math.round(state.shadowBlur)}
              </span>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
};

// --- Reusable sub-components ---

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <div className="text-xs font-medium text-muted-foreground">{label}</div>
    {children}
  </div>
);

const ToggleRow: React.FC<{ checked: boolean; onToggle: () => void; label: string }> = ({
  checked,
  onToggle,
  label,
}) => (
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={onToggle}
      className="w-4 h-4 rounded border-border accent-primary"
    />
    <span className="text-xs text-foreground">{label}</span>
  </label>
);

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
