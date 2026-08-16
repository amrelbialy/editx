import type { PresetGroup, ShapePreset } from "../config.types";
import { BLOB_PATH, BURST_PATH, CHAT_PATH, HEART_PATH } from "./shape-paths";

/** Self-contained raster landscape so image presets work without a remote fetch. */
const SAMPLE_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAYAAAA5ZDbSAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAANxSURBVHhe7dY7chRBEEXRWRWbQQ4m+yJkY7ATDDaCP4QMEcNV93R9MuvzeMZxRFdl1lyH2+uv+9103fgH0+LA4hxYnAOLc2BxDizOgcU5sDgHFufA4hxYnAOLc2BxDizOgQe4//5xiWeiOHAyhnyGZyM4cBLGq8G7ejhwAgZrwTtbOXACxmrBO1s5cDCG6sG7WzhwIAaKwBm1HDgQ40TgjFoOHIhxInBGLQcOxDgROKOWAwdhmCicU8uBAzFOBM6o5cCBGCcCZ9Ry4ECME4EzajlwIMaJwBm1HDgYA/Xg3S0cOAFDteK9LRw4AUO14J2tHDgJg9XgXT0cOBnjXeH5Xg4c5NPnlw9/e8eIR3gmigMHeIv7jv82mwMHeAy8WmQH7sS4q0V24E4M68BCGJX4/QwO3Igxz/DcaA7ciCGf4dmRlgk8+4eowYBXeH6kJQKv8mOUYsASvGOU6YH5Q8z8MUpw1xq8a4SpgfkDzPwhSnHXWrwv27TAfDjx+xVwxxa8M9uUwHz0GZ6bibv14N2ZHLgQd+vF+7MMD8yHXuH5GbhTFM7JMDQwH1iK94zGfaJwToZhgfm4WrxvFO4RjfOiDQnMR7XgnaNwjwycGSk9MB/Tg3dn4/xMnB0lNTAfEYEzsnBuNs6P4sAnOHcE7hAhLTCXj8RZ0ThvJO7SKyUwl87AmZE4azTu0yM8MJfNwrlROGcG7tQjNDAXzcb5EThjFu7VKiwwFxyFe/Tg3bNxvxYhgbnYaNynBe9cBfes5cCLvOEZ7lqjOzCXmYV71eBdq+G+NboCc5HZuF8p3rMi7lyqOTAXWAF3LME7VsbdSzQF5uCVcNcrPL867n+lOjAHrog7n+G5HfANVyQDv+HexO93wrc8UxWYg1bG3Ynf74bvOVMcmAN2wDfs/JYjfNeRosC8eCd8y+7vecR3HbkMzEt3o/Ye4vvoaWBetivFNz1it0engXnJ7hTf9Ij9/rvA6tjvaWAetj2w42FgHrK9sOc/gfmx7ekwMD+yfX0IzA9sf38Df/n2cjddDizOgcU5sDgHFufA4hxYnAOLc2BxDizOgcU5sDgHFufA4hxY3O37z6930+XA4hxYnAOLc2Bx/l+0OAcW58DiHFicA4tzYHEOLM6BxTmwOAcW58DiHFicA4tzYHEOLM6BxTmwOAcW9wckijXCIfPyFgAAAABJRU5ErkJggg==";

const filled: ShapePreset[] = [
  {
    id: "filled-rect",
    label: "Rectangle",
    shape: { kind: "rect", cornerRadius: 8 },
    fill: { kind: "color", color: "#3b82f6" },
    preview: { kind: "shape" },
  },
  {
    id: "filled-circle",
    label: "Circle",
    shape: { kind: "ellipse" },
    fill: { kind: "color", color: "#10b981" },
    preview: { kind: "shape" },
  },
  {
    id: "filled-arrow",
    label: "Arrow",
    shape: { kind: "line", pointerLength: 15, pointerWidth: 15 },
    fill: { kind: "color", color: "#3b82f6" },
    stroke: { color: "#3b82f6", width: 10 },
    preview: { kind: "shape" },
  },
  {
    id: "filled-star",
    label: "Star",
    shape: { kind: "star", points: 5 },
    fill: { kind: "color", color: "#f59e0b" },
    preview: { kind: "shape" },
  },
];

const outline: ShapePreset[] = [
  {
    id: "outline-rect",
    label: "Outlined Box",
    shape: { kind: "rect", cornerRadius: 8 },
    fill: { kind: "color", color: "#00000000" },
    stroke: { color: "#3b82f6", width: 6 },
    preview: { kind: "shape" },
  },
  {
    id: "outline-circle",
    label: "Outlined Circle",
    shape: { kind: "ellipse" },
    fill: { kind: "color", color: "#00000000" },
    stroke: { color: "#ec4899", width: 6 },
    preview: { kind: "shape" },
  },
];

const gradient: ShapePreset[] = [
  {
    id: "gradient-sunset",
    label: "Sunset",
    shape: { kind: "rect", cornerRadius: 8 },
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
    preview: { kind: "shape" },
  },
  {
    id: "gradient-ocean",
    label: "Ocean",
    shape: { kind: "ellipse" },
    fill: {
      kind: "gradient",
      gradient: {
        type: "radial",
        stops: [
          { offset: 0, color: "#06b6d4" },
          { offset: 1, color: "#6366f1" },
        ],
      },
    },
    preview: { kind: "shape" },
  },
];

const image: ShapePreset[] = [
  {
    id: "image-rect",
    label: "Photo Box",
    shape: { kind: "rect", cornerRadius: 8 },
    fill: { kind: "image", image: { src: SAMPLE_IMAGE, fit: "cover" } },
    preview: { kind: "shape" },
  },
  {
    id: "image-circle",
    label: "Photo Circle",
    shape: { kind: "ellipse" },
    fill: { kind: "image", image: { src: SAMPLE_IMAGE, fit: "cover" } },
    preview: { kind: "shape" },
  },
];

const pathPresets: ShapePreset[] = [
  {
    id: "path-burst",
    label: "Burst",
    shape: {
      kind: "path",
      name: "path-burst",
      pathData: BURST_PATH.data,
      viewBox: BURST_PATH.viewBox,
    },
    fill: { kind: "color", color: "#ef4444" },
    preview: { kind: "shape", style: { background: "#ef4444" } },
  },
  {
    id: "path-blob",
    label: "Blob",
    shape: {
      kind: "path",
      name: "path-blob",
      pathData: BLOB_PATH.data,
      viewBox: BLOB_PATH.viewBox,
    },
    fill: { kind: "color", color: "#8b5cf6" },
    preview: { kind: "shape", style: { background: "#8b5cf6" } },
  },
  {
    id: "path-heart",
    label: "Heart",
    shape: {
      kind: "path",
      name: "path-heart",
      pathData: HEART_PATH.data,
      viewBox: HEART_PATH.viewBox,
    },
    fill: { kind: "color", color: "#ec4899" },
    preview: { kind: "shape", style: { background: "#ec4899" } },
  },
  {
    id: "path-chat",
    label: "Chat Bubble",
    shape: {
      kind: "path",
      name: "path-chat",
      pathData: CHAT_PATH.data,
      viewBox: CHAT_PATH.viewBox,
    },
    fill: { kind: "color", color: "#14b8a6" },
    preview: { kind: "shape", style: { background: "#14b8a6" } },
  },
];

/** Built-in shape preset categories (Filled / Outline / Gradient / Image / Path). */
export const DEFAULT_SHAPE_PRESET_GROUPS: PresetGroup<ShapePreset>[] = [
  { id: "filled", label: "Filled", labelKey: "presets.shapes.filled", presets: filled },
  { id: "outline", label: "Outline", labelKey: "presets.shapes.outline", presets: outline },
  { id: "gradient", label: "Gradient", labelKey: "presets.shapes.gradient", presets: gradient },
  { id: "image", label: "Image", labelKey: "presets.shapes.image", presets: image },
  { id: "path", label: "Shapes", labelKey: "presets.shapes.path", presets: pathPresets },
];
