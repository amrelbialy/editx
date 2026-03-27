import {
  type Color,
  colorToHex,
  type EditxEngine,
  FILL_SOLID_COLOR,
  hexToColor,
  SHAPE_RECT_CORNER_RADIUS,
} from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { InputGroup } from "../ui/input-group";
import { Section } from "../ui/section";
import { Separator } from "../ui/separator";
import { SliderField } from "../ui/slider-field";
import { SwitchField } from "../ui/switch-field";

export interface ShapePropertiesPanelProps {
  engine: EditxEngine;
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

function readShapeState(engine: EditxEngine, blockId: number): ShapeState {
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
    return engine.onHistoryChanged(() => setState(readShapeState(engine, blockId)));
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
    <div className="flex flex-col gap-4">
      <div className="text-base font-medium text-muted-foreground uppercase tracking-wider">
        Shape Properties
      </div>

      {/* Fill Color */}
      <Section label="Fill Color">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={state.fillColor}
            onChange={handleFillColor}
            className="w-8 h-8 rounded border border-border bg-transparent cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          />
          <span className="text-base font-mono text-muted-foreground">{state.fillColor}</span>
        </div>
      </Section>

      {/* Opacity */}
      <SliderField
        label="Opacity"
        value={state.opacity}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => handleOpacity([v])}
        formatValue={(v) => `${Math.round(v * 100)}%`}
      />

      <Separator />

      {/* Position */}
      <Section label="Position">
        <div className="grid grid-cols-2 gap-2">
          <InputGroup label="X" value={state.x} onChange={handlePosX} />
          <InputGroup label="Y" value={state.y} onChange={handlePosY} />
        </div>
      </Section>

      {/* Size */}
      <Section label="Size">
        <div className="grid grid-cols-2 gap-2">
          <InputGroup label="W" value={state.width} onChange={handleWidth} />
          <InputGroup label="H" value={state.height} onChange={handleHeight} />
        </div>
      </Section>

      {/* Corner Radius (rect only) */}
      {state.shapeKind === "rect" && (
        <SliderField
          label="Border Radius"
          value={state.cornerRadius}
          min={0}
          max={Math.min(state.width, state.height) / 2}
          step={1}
          onChange={(v) => handleCornerRadius([v])}
        />
      )}

      <Separator />

      {/* Stroke */}
      <SwitchField
        label="Enable Stroke"
        checked={state.strokeEnabled}
        onChange={handleStrokeToggle}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={state.strokeColor}
              onChange={handleStrokeColor}
              className="w-8 h-8 rounded border border-border bg-transparent cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            />
            <span className="text-base font-mono text-muted-foreground">{state.strokeColor}</span>
          </div>
          <SliderField
            label="Width"
            value={state.strokeWidth}
            min={0}
            max={20}
            step={0.5}
            onChange={(v) => handleStrokeWidth([v])}
            formatValue={(v) => v.toFixed(1)}
          />
        </div>
      </SwitchField>

      <Separator />

      {/* Shadow */}
      <SwitchField
        label="Enable Shadow"
        checked={state.shadowEnabled}
        onChange={handleShadowToggle}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={state.shadowColor}
              onChange={handleShadowColor}
              className="w-8 h-8 rounded border border-border bg-transparent cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            />
            <span className="text-base font-mono text-muted-foreground">{state.shadowColor}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <InputGroup label="X" value={state.shadowOffsetX} onChange={handleShadowOffsetX} />
            <InputGroup label="Y" value={state.shadowOffsetY} onChange={handleShadowOffsetY} />
          </div>
          <SliderField
            label="Blur"
            value={state.shadowBlur}
            min={0}
            max={50}
            step={1}
            onChange={(v) => handleShadowBlur([v])}
          />
        </div>
      </SwitchField>
    </div>
  );
};
