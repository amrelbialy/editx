import { type EditxEngine, hexToColor, type ShapeGeometry } from "@editx/engine";
import type { ShapePreset, ShapesToolConfig } from "../config/config.types";
import { normalizeShapePresetGeometry } from "../config/shape-geometry-options";

interface InsertShapePresetContext {
  engine: EditxEngine;
  pageId: number;
  pageW: number;
  pageH: number;
  config: ShapesToolConfig;
}

export function insertShapePreset(
  context: InsertShapePresetContext,
  preset: ShapePreset,
): number | undefined {
  let geometry: ShapeGeometry;
  try {
    geometry = normalizeShapePresetGeometry(preset.shape, preset.id);
  } catch {
    return;
  }

  const { engine, pageId, pageW, pageH, config } = context;
  const sizeFraction = preset.sizeFraction ?? config.defaultSize ?? 0.25;
  const size = Math.min(pageW, pageH) * sizeFraction;
  const width = preset.shape.kind === "line" ? pageW * 0.5 : size;
  const height = size;
  const x = (pageW - width) / 2;
  const y = (pageH - height) / 2;

  engine.beginBatch();
  try {
    const id = engine.block.addShape(
      pageId,
      preset.shape.kind,
      preset.fill.kind,
      x,
      y,
      width,
      height,
      {
        sides: preset.shape.sides,
        pathData: preset.shape.pathData,
        viewBox: preset.shape.viewBox,
      },
    );
    applyShapePaint(engine, id, preset, config.defaultColor ?? "#3b82f6");
    if ((config.defaultOpacity ?? 1) !== 1) {
      engine.block.setOpacity(id, config.defaultOpacity ?? 1);
    }
    engine.block.setShapeGeometry(id, geometry);
    return id;
  } catch {
    return;
  } finally {
    engine.endBatch();
  }
}

function applyShapePaint(
  engine: EditxEngine,
  id: number,
  preset: ShapePreset,
  defaultColor: string,
): void {
  if (preset.fill.kind === "gradient" && preset.fill.gradient) {
    engine.block.setFillGradient(id, preset.fill.gradient);
  } else if (preset.fill.kind === "image" && preset.fill.image) {
    engine.block.setFillImage(id, preset.fill.image);
  } else {
    const color = hexToColor(preset.fill.color ?? defaultColor);
    engine.block.setFillSolidColor(id, color);
    if (color.a === 0) engine.block.setFillEnabled(id, false);
  }
  if (preset.stroke) {
    engine.block.setStrokeEnabled(id, true);
    engine.block.setStrokeColor(id, hexToColor(preset.stroke.color));
    engine.block.setStrokeWidth(id, preset.stroke.width);
  }
}
