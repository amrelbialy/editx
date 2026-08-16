import type { PresetGroup, ShapePreset } from "../config.types";
import {
  ABSTRACT_SHAPE_GEOMETRIES,
  SHARED_SHAPE_GEOMETRIES,
  type ShapeGeometryDefinition,
} from "./shape-geometries";

/** Self-contained raster landscape so image presets work without a remote fetch. */
const SAMPLE_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAYAAAA5ZDbSAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAANxSURBVHhe7dY7chRBEEXRWRWbQQ4m+yJkY7ATDDaCP4QMEcNV93R9MuvzeMZxRFdl1lyH2+uv+9103fgH0+LA4hxYnAOLc2BxDizOgcU5sDgHFufA4hxYnAOLc2BxDizOgQe4//5xiWeiOHAyhnyGZyM4cBLGq8G7ejhwAgZrwTtbOXACxmrBO1s5cDCG6sG7WzhwIAaKwBm1HDgQ40TgjFoOHIhxInBGLQcOxDgROKOWAwdhmCicU8uBAzFOBM6o5cCBGCcCZ9Ry4ECME4EzajlwIMaJwBm1HDgYA/Xg3S0cOAFDteK9LRw4AUO14J2tHDgJg9XgXT0cOBnjXeH5Xg4c5NPnlw9/e8eIR3gmigMHeIv7jv82mwMHeAy8WmQH7sS4q0V24E4M68BCGJX4/QwO3Igxz/DcaA7ciCGf4dmRlgk8+4eowYBXeH6kJQKv8mOUYsASvGOU6YH5Q8z8MUpw1xq8a4SpgfkDzPwhSnHXWrwv27TAfDjx+xVwxxa8M9uUwHz0GZ6bibv14N2ZHLgQd+vF+7MMD8yHXuH5GbhTFM7JMDQwH1iK94zGfaJwToZhgfm4WrxvFO4RjfOiDQnMR7XgnaNwjwycGSk9MB/Tg3dn4/xMnB0lNTAfEYEzsnBuNs6P4sAnOHcE7hAhLTCXj8RZ0ThvJO7SKyUwl87AmZE4azTu0yM8MJfNwrlROGcG7tQjNDAXzcb5EThjFu7VKiwwFxyFe/Tg3bNxvxYhgbnYaNynBe9cBfes5cCLvOEZ7lqjOzCXmYV71eBdq+G+NboCc5HZuF8p3rMi7lyqOTAXWAF3LME7VsbdSzQF5uCVcNcrPL867n+lOjAHrog7n+G5HfANVyQDv+HexO93wrc8UxWYg1bG3Ynf74bvOVMcmAN2wDfs/JYjfNeRosC8eCd8y+7vecR3HbkMzEt3o/Ye4vvoaWBetivFNz1it0engXnJ7hTf9Ij9/rvA6tjvaWAetj2w42FgHrK9sOc/gfmx7ekwMD+yfX0IzA9sf38Df/n2cjddDizOgcU5sDgHFufA4hxYnAOLc2BxDizOgcU5sDgHFufA4hxY3O37z6930+XA4hxYnAOLc2Bx/l+0OAcW58DiHFicA4tzYHEOLM6BxTmwOAcW58DiHFicA4tzYHEOLM6BxTmwOAcW9wckijXCIfPyFgAAAABJRU5ErkJggg==";

type PresetPaint = Pick<ShapePreset, "fill" | "stroke">;

const filledPaint: PresetPaint = { fill: { kind: "color", color: "#3b82f6" } };
const outlinePaint: PresetPaint = {
  fill: { kind: "color", color: "#00000000" },
  stroke: { color: "#3b82f6", width: 6 },
};
const gradientPaint: PresetPaint = {
  fill: {
    kind: "gradient",
    gradient: {
      type: "linear",
      angle: 45,
      stops: [
        { offset: 0, color: "#f97316" },
        { offset: 1, color: "#ec4899" },
      ],
    },
  },
};
const imagePaint: PresetPaint = {
  fill: { kind: "image", image: { src: SAMPLE_IMAGE, fit: "cover" } },
};

function createStyledPresets(
  prefix: string,
  paint: PresetPaint,
  idOverrides: Record<string, string> = {},
): ShapePreset[] {
  return SHARED_SHAPE_GEOMETRIES.map((geometry) => ({
    id: idOverrides[geometry.id] ?? `${prefix}-${geometry.id}`,
    label: geometry.label,
    shape: geometry.shape,
    ...paint,
    preview: { kind: "shape" },
  }));
}

const abstractColors = [
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#22c55e",
  "#eab308",
  "#6366f1",
  "#06b6d4",
  "#f43f5e",
  "#0ea5e9",
  "#f97316",
];

function createAbstractPreset(geometry: ShapeGeometryDefinition, index: number): ShapePreset {
  const color = abstractColors[index];
  return {
    id: geometry.id,
    label: geometry.label,
    shape: geometry.shape,
    fill: { kind: "color", color },
    preview: { kind: "shape", style: { background: color } },
  };
}

export const LEGACY_FILLED_ARROW_PRESET: ShapePreset = {
  id: "filled-arrow",
  label: "Arrow",
  shape: { kind: "line", pointerLength: 15, pointerWidth: 15 },
  fill: { kind: "color", color: "#3b82f6" },
  stroke: { color: "#3b82f6", width: 10 },
  preview: { kind: "shape" },
};

const filled = createStyledPresets("filled", filledPaint);
const outline = createStyledPresets("outline", outlinePaint, {
  rect: "outline-rect",
  circle: "outline-circle",
});
const gradient = createStyledPresets("gradient", gradientPaint, {
  rect: "gradient-sunset",
  circle: "gradient-ocean",
});
const image = createStyledPresets("image", imagePaint, {
  rect: "image-rect",
  circle: "image-circle",
});
const abstract = ABSTRACT_SHAPE_GEOMETRIES.map(createAbstractPreset);

/** Built-in shape preset categories. The `path` id is retained for group merging compatibility. */
export const DEFAULT_SHAPE_PRESET_GROUPS: PresetGroup<ShapePreset>[] = [
  { id: "filled", label: "Filled", labelKey: "presets.shapes.filled", presets: filled },
  { id: "outline", label: "Outline", labelKey: "presets.shapes.outline", presets: outline },
  { id: "gradient", label: "Gradient", labelKey: "presets.shapes.gradient", presets: gradient },
  { id: "image", label: "Image", labelKey: "presets.shapes.image", presets: image },
  { id: "path", label: "Abstract", labelKey: "presets.shapes.path", presets: abstract },
];
