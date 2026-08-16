import { type EditxEngine, hexToColor, type ShapeGeometry } from "@editx/engine";
import type { TextToolConfig } from "../config/config.types";
import type { TextPreset, TextPresetBlock } from "../config/preset.types";
import {
  type PreparedTextCompositionShapeElement,
  prepareTextComposition,
} from "../config/text-composition";
import { applyTextBackgroundBox } from "../utils/apply-text-background-box";
import {
  convertTextPresetRunStyle,
  convertValidTextRunOverrides,
  toInitialTextRunStyle,
} from "../utils/text-preset-run-style";

interface InsertContext {
  engine: EditxEngine;
  pageId: number;
  pageW: number;
  pageH: number;
  scaleFactor: number;
  config: TextToolConfig;
}

export function insertTextPreset(context: InsertContext, preset: TextPreset): number | undefined {
  const prepared = prepareTextComposition(preset);
  context.engine.beginBatch();
  try {
    const ids = prepared
      ? prepared.elements.map((element) =>
          element.kind === "text"
            ? insertText(context, preset.blocks[element.block], element.layout, element.widthMode)
            : insertShape(context, element),
        )
      : preset.blocks.map((block) =>
          insertText(context, block, block, legacyWidthMode(preset, block)),
        );

    const shouldGroup = ids.length > 1 && (preset.group ?? true);
    const selectId = shouldGroup ? context.engine.block.group(ids) : ids[0];
    if (shouldGroup && selectId !== undefined) context.engine.block.refitGroupBounds(selectId);
    return selectId;
  } finally {
    context.engine.endBatch();
  }
}

function insertText(
  context: InsertContext,
  block: TextPresetBlock,
  layout: Partial<{ x: number; y: number; width: number; height: number; rotation: number }>,
  widthMode: "auto" | "fixed" = "fixed",
) {
  const { engine, pageId, pageW, pageH, scaleFactor, config } = context;
  const baseFontSize = config.defaultFontSize ?? 24;
  const converted = convertTextPresetRunStyle(block, baseFontSize, scaleFactor);
  const initialStyle = toInitialTextRunStyle(converted);
  initialStyle.fontSize ??= Math.round(baseFontSize * scaleFactor);
  initialStyle.fontFamily ??= config.defaultFontFamily ?? config.fonts?.[0] ?? "Arial";
  initialStyle.fontWeight ??= config.defaultFontWeight ?? "normal";
  initialStyle.fontStyle ??= config.defaultFontStyle ?? "normal";
  initialStyle.fill ??= config.defaultColor ?? "#ffffff";
  delete initialStyle.fillGradient;
  const fontSize = initialStyle.fontSize;
  const geometry =
    layout.x === undefined
      ? centeredTextGeometry(pageW, pageH, fontSize, scaleFactor)
      : {
          x: layout.x * pageW,
          y: layout.y! * pageH,
          width: layout.width! * pageW,
          height: layout.height! * pageH,
        };
  const textId = engine.block.addText(
    pageId,
    geometry.x,
    geometry.y,
    geometry.width,
    geometry.height,
    block.text,
    { style: initialStyle },
  );

  const align = block.align ?? config.defaultTextAlign;
  if (align) engine.block.setTextAlign(textId, align);
  const lineHeight = block.lineHeight ?? config.defaultLineHeight;
  if (lineHeight !== undefined) engine.block.setTextLineHeight(textId, lineHeight);
  if (block.curve && block.curve.radius > 0) {
    engine.block.setTextCurve(textId, block.curve.radius * scaleFactor, block.curve.direction);
  } else if (block.fillGradient) {
    engine.block.setTextGradient(textId, 0, block.text.length, block.fillGradient);
  }
  for (const override of convertValidTextRunOverrides(
    block.text,
    block.runOverrides,
    baseFontSize,
    scaleFactor,
  )) {
    engine.block.setTextStyle(textId, override.start, override.end, override.style);
  }
  if (block.backgroundBox) applyTextBackgroundBox(engine, textId, block.backgroundBox, scaleFactor);
  if (layout.rotation) engine.block.setRotation(textId, layout.rotation);
  if (widthMode === "auto") engine.block.setTextAutoWidth(textId, true);
  return textId;
}

function insertShape(context: InsertContext, element: PreparedTextCompositionShapeElement) {
  const { engine, pageId, pageW, pageH, scaleFactor } = context;
  const { layout, geometry, fill } = element;
  const id = engine.block.addShape(
    pageId,
    geometry.type,
    fill.kind,
    layout.x * pageW,
    layout.y * pageH,
    layout.width * pageW,
    layout.height * pageH,
    geometry.type === "path"
      ? { pathData: geometry.pathData, viewBox: geometry.viewBox }
      : { sides: geometry.type === "polygon" ? geometry.sides : undefined },
  );
  if (fill.kind === "gradient" && fill.gradient) {
    engine.block.setFillGradient(id, fill.gradient);
  } else if (fill.kind === "image" && fill.image) {
    engine.block.setFillImage(id, fill.image);
  } else {
    const color = hexToColor(fill.color ?? "#000000");
    engine.block.setFillSolidColor(id, color);
    if (color.a === 0) engine.block.setFillEnabled(id, false);
  }
  if (element.stroke) {
    engine.block.setStrokeEnabled(id, true);
    engine.block.setStrokeColor(id, hexToColor(element.stroke.color));
    engine.block.setStrokeWidth(id, element.stroke.width * scaleFactor);
  }
  if (element.opacity !== undefined) engine.block.setOpacity(id, element.opacity);
  if (layout.rotation) engine.block.setRotation(id, layout.rotation);
  engine.block.setShapeGeometry(id, scaleShapeGeometry(geometry, scaleFactor));
  return id;
}

function scaleShapeGeometry(geometry: ShapeGeometry, scaleFactor: number): ShapeGeometry {
  if (geometry.type === "rect") {
    return { ...geometry, cornerRadius: geometry.cornerRadius! * scaleFactor };
  }
  if (geometry.type === "line") {
    return {
      ...geometry,
      pointerLength: geometry.pointerLength! * scaleFactor,
      pointerWidth: geometry.pointerWidth! * scaleFactor,
    };
  }
  return geometry;
}

function legacyWidthMode(preset: TextPreset, block: TextPresetBlock): "auto" | "fixed" {
  return preset.blocks.length === 1 && !block.curve?.radius ? "auto" : "fixed";
}

function centeredTextGeometry(pageW: number, pageH: number, fontSize: number, scaleFactor: number) {
  const width = Math.min(pageW * 0.35, 400 * scaleFactor);
  const height = fontSize * 1.5;
  return { x: (pageW - width) / 2, y: (pageH - height) / 2, width, height };
}
