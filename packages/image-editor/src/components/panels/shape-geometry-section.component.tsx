import {
  type EditxEngine,
  SHAPE_LINE_POINTER_LENGTH,
  SHAPE_LINE_POINTER_WIDTH,
  SHAPE_POLYGON_SIDES,
  SHAPE_RECT_CORNER_RADIUS,
  SHAPE_STAR_INNER_DIAMETER,
  SHAPE_STAR_POINTS,
  type ShapeType,
} from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useCoalescedHistory } from "../../hooks/use-coalesced-history";
import { Input } from "../ui/input";
import { SliderField } from "../ui/slider-field";
import { buildClampedGeometry, type NumericShapeKey } from "./shape-geometry-clamp";

interface ShapeGeometrySectionProps {
  engine: EditxEngine;
  blockId: number;
}

interface GeometryState {
  kind: ShapeType;
  cornerRadius: number;
  sides: number;
  points: number;
  innerDiameter: number;
  pointerLength: number;
  pointerWidth: number;
}

function readState(engine: EditxEngine, blockId: number): GeometryState {
  const shapeId = engine.block.getShape(blockId);
  const kind = (
    shapeId == null ? engine.block.getKind(blockId) : engine.block.getKind(shapeId)
  ) as ShapeType;
  const read = (key: string, fallback: number) =>
    shapeId == null ? fallback : (engine.block.getFloat(shapeId, key) ?? fallback);
  return {
    kind,
    cornerRadius: read(SHAPE_RECT_CORNER_RADIUS, 0),
    sides: read(SHAPE_POLYGON_SIDES, 5),
    points: read(SHAPE_STAR_POINTS, 5),
    innerDiameter: read(SHAPE_STAR_INNER_DIAMETER, 0.5),
    pointerLength: read(SHAPE_LINE_POINTER_LENGTH, 15),
    pointerWidth: read(SHAPE_LINE_POINTER_WIDTH, 15),
  };
}

export const ShapeGeometrySection: React.FC<ShapeGeometrySectionProps> = (props) => {
  const { engine, blockId } = props;
  const { commit, flush } = useCoalescedHistory(engine);

  const [state, setState] = useState(() => readState(engine, blockId));

  useEffect(() => setState(readState(engine, blockId)), [engine, blockId]);
  useEffect(
    () => engine.onHistoryChanged(() => setState(readState(engine, blockId))),
    [engine, blockId],
  );

  const changeNumber = useCallback(
    (key: NumericShapeKey, value: number) => {
      if (!Number.isFinite(value)) return;
      const geometry = buildClampedGeometry(state, key, value);
      if (!geometry) return;
      commit(() => engine.block.setShapeGeometry(blockId, geometry));
      setState((current) => ({ ...current, [key]: value }));
    },
    [engine, blockId, state, commit],
  );

  const numericInput = (label: string, key: NumericShapeKey, value: number) => (
    <Input
      type="number"
      label={label}
      aria-label={label}
      value={value}
      onChange={(event) => {
        if (event.target.value === "") return;
        changeNumber(key, Number(event.target.value));
      }}
      onBlur={flush}
    />
  );
  if (state.kind === "ellipse" || state.kind === "path") return null;

  return (
    <div className="flex flex-col gap-3">
      {state.kind === "rect" && (
        <SliderField
          label="Corner Radius"
          value={state.cornerRadius}
          min={0}
          max={500}
          step={1}
          onChange={(value) => changeNumber("cornerRadius", value)}
          onCommit={flush}
        />
      )}
      {state.kind === "polygon" && numericInput("Sides", "sides", state.sides)}
      {state.kind === "star" && (
        <div className="flex flex-col gap-2">
          {numericInput("Points", "points", state.points)}
          <SliderField
            label="Inner Diameter"
            value={state.innerDiameter}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => changeNumber("innerDiameter", value)}
            onCommit={flush}
          />
        </div>
      )}
      {state.kind === "line" && (
        <div className="grid grid-cols-2 gap-2">
          {numericInput("Pointer Length", "pointerLength", state.pointerLength)}
          {numericInput("Pointer Width", "pointerWidth", state.pointerWidth)}
        </div>
      )}
    </div>
  );
};
