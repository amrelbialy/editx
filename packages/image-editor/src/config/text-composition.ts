import type { TextLayoutSpec, TextPreset } from "./preset.types";
import type { TextCompositionTextElement } from "./text-composition.types";

export interface PreparedTextComposition {
  elements: NonNullable<TextPreset["composition"]>["elements"];
  bounds: TextLayoutSpec;
  widthModes: Map<number, "auto" | "fixed">;
}

export function prepareTextComposition(preset: TextPreset): PreparedTextComposition | undefined {
  const composition = preset.composition;
  if (!composition) return undefined;
  if (composition.elements.length === 0) throw new Error(`Text preset "${preset.id}" is empty`);

  const referenced = new Set<number>();
  const widthModes = new Map<number, "auto" | "fixed">();
  for (const element of composition.elements) {
    validateLayout(preset.id, element.layout);
    if (element.kind !== "text") continue;
    validateTextElement(preset, element, referenced);
    widthModes.set(element.block, element.widthMode ?? "fixed");
  }
  if (referenced.size !== preset.blocks.length) {
    throw new Error(`Text preset "${preset.id}" must reference every block exactly once`);
  }

  return { elements: composition.elements, bounds: unionBounds(composition.elements), widthModes };
}

function validateTextElement(
  preset: TextPreset,
  element: TextCompositionTextElement,
  referenced: Set<number>,
) {
  const block = preset.blocks[element.block];
  if (!block || referenced.has(element.block)) {
    throw new Error(`Text preset "${preset.id}" has an invalid block reference`);
  }
  if (
    (["x", "y", "width", "height", "rotation"] as const).some(
      (property) => block[property] !== undefined,
    )
  ) {
    throw new Error(`Text preset "${preset.id}" composition owns block geometry`);
  }
  referenced.add(element.block);
}

function validateLayout(id: string, layout: TextLayoutSpec) {
  const values = [layout.x, layout.y, layout.width, layout.height, layout.rotation ?? 0];
  if (!values.every(Number.isFinite) || layout.width <= 0 || layout.height <= 0) {
    throw new Error(`Text preset "${id}" has invalid composition geometry`);
  }
}

function unionBounds(elements: NonNullable<TextPreset["composition"]>["elements"]): TextLayoutSpec {
  const corners = elements.flatMap(({ layout }) => rotatedCorners(layout));
  const left = Math.min(...corners.map((corner) => corner.x));
  const top = Math.min(...corners.map((corner) => corner.y));
  const right = Math.max(...corners.map((corner) => corner.x));
  const bottom = Math.max(...corners.map((corner) => corner.y));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function rotatedCorners(layout: TextLayoutSpec): { x: number; y: number }[] {
  const radians = ((layout.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [
    [0, 0],
    [layout.width, 0],
    [0, layout.height],
    [layout.width, layout.height],
  ].map(([offsetX, offsetY]) => ({
    x: layout.x + offsetX * cos - offsetY * sin,
    y: layout.y + offsetX * sin + offsetY * cos,
  }));
}
