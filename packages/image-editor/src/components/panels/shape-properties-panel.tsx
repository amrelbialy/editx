import { type EditxEngine, SHAPE_RECT_CORNER_RADIUS } from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Input } from "../ui/input";
import { Section } from "../ui/section";
import { Separator } from "../ui/separator";
import { SliderField } from "../ui/slider-field";
import { ShapeDecorationSection } from "./shape-decoration-section.component";
import { ShapeFillPanel } from "./shape-fill-panel";

export interface ShapePropertiesPanelProps {
  engine: EditxEngine;
  blockId: number;
}

interface ShapeState {
  opacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
  shapeKind: string;
}

function readShapeState(engine: EditxEngine, blockId: number): ShapeState {
  const b = engine.block;
  const pos = b.getPosition(blockId);
  const size = b.getSize(blockId);

  let cornerRadius = 0;
  let shapeKind = b.getKind(blockId);
  const shapeId = b.getShape(blockId);
  if (shapeId != null) {
    shapeKind = b.getKind(shapeId) || shapeKind;
    if (shapeKind === "rect") cornerRadius = b.getFloat(shapeId, SHAPE_RECT_CORNER_RADIUS) ?? 0;
  }

  return {
    opacity: b.getOpacity(blockId),
    x: pos.x,
    y: pos.y,
    width: size.width,
    height: size.height,
    cornerRadius,
    shapeKind,
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

  const handleOpacity = useCallback(
    ([v]: number[]) => {
      engine.block.setOpacity(blockId, v);
      update();
    },
    [engine, blockId, update],
  );

  const handlePos = useCallback(
    (axis: "x" | "y", e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (Number.isNaN(val)) return;
      engine.block.setPosition(blockId, axis === "x" ? val : state.x, axis === "y" ? val : state.y);
      update();
    },
    [engine, blockId, state.x, state.y, update],
  );

  const handleSize = useCallback(
    (axis: "w" | "h", e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (Number.isNaN(val) || val <= 0) return;
      engine.block.setSize(
        blockId,
        axis === "w" ? val : state.width,
        axis === "h" ? val : state.height,
      );
      update();
    },
    [engine, blockId, state.width, state.height, update],
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

  return (
    <div className="flex flex-col gap-4">
      <div className="text-fluid font-medium text-muted-foreground uppercase tracking-wider">
        Shape Properties
      </div>

      <ShapeFillPanel engine={engine} blockId={blockId} />

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

      <Section label="Position">
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" label="X" value={state.x} onChange={(e) => handlePos("x", e)} />
          <Input type="number" label="Y" value={state.y} onChange={(e) => handlePos("y", e)} />
        </div>
      </Section>

      <Section label="Size">
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" label="W" value={state.width} onChange={(e) => handleSize("w", e)} />
          <Input
            type="number"
            label="H"
            value={state.height}
            onChange={(e) => handleSize("h", e)}
          />
        </div>
      </Section>

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

      <ShapeDecorationSection engine={engine} blockId={blockId} />
    </div>
  );
};
