import type { PresetGroup, ShapePreset } from "../config.types";
import { BLOB_PATH, BURST_PATH, CHAT_PATH, HEART_PATH } from "./shape-paths";

/**
 * Placeholder image fill source — an inline SVG data URI (no remote fetch), so
 * the Image category renders out of the box. Consumers override via config.
 */
const SAMPLE_IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%23f97316'/><stop offset='1' stop-color='%23ec4899'/></linearGradient></defs><rect width='120' height='120' fill='url(%23g)'/></svg>";

const filled: ShapePreset[] = [
  {
    id: "filled-rect",
    label: "Rectangle",
    shape: { kind: "rect", cornerRadius: 8 },
    fill: { kind: "color", color: "#3b82f6" },
    preview: { kind: "shape", style: { background: "#3b82f6", borderRadius: "6px" } },
  },
  {
    id: "filled-circle",
    label: "Circle",
    shape: { kind: "ellipse" },
    fill: { kind: "color", color: "#10b981" },
    preview: { kind: "shape", style: { background: "#10b981", borderRadius: "50%" } },
  },
  {
    id: "filled-star",
    label: "Star",
    shape: { kind: "star", points: 5 },
    fill: { kind: "color", color: "#f59e0b" },
    preview: {
      kind: "shape",
      style: {
        background: "#f59e0b",
        clipPath:
          "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
      },
    },
  },
];

const outline: ShapePreset[] = [
  {
    id: "outline-rect",
    label: "Outlined Box",
    shape: { kind: "rect", cornerRadius: 8 },
    fill: { kind: "color", color: "#00000000" },
    stroke: { color: "#3b82f6", width: 6 },
    preview: {
      kind: "shape",
      style: { border: "2px solid #3b82f6", borderRadius: "6px", background: "transparent" },
    },
  },
  {
    id: "outline-circle",
    label: "Outlined Circle",
    shape: { kind: "ellipse" },
    fill: { kind: "color", color: "#00000000" },
    stroke: { color: "#ec4899", width: 6 },
    preview: {
      kind: "shape",
      style: { border: "2px solid #ec4899", borderRadius: "50%", background: "transparent" },
    },
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
    preview: {
      kind: "shape",
      style: {
        background: "linear-gradient(45deg, #f97316, #ec4899)",
        borderRadius: "6px",
      },
    },
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
    preview: {
      kind: "shape",
      style: {
        background: "radial-gradient(circle, #06b6d4, #6366f1)",
        borderRadius: "50%",
      },
    },
  },
];

const image: ShapePreset[] = [
  {
    id: "image-rect",
    label: "Photo Box",
    shape: { kind: "rect", cornerRadius: 8 },
    fill: { kind: "image", image: { src: SAMPLE_IMAGE, fit: "cover" } },
    preview: {
      kind: "shape",
      style: { backgroundImage: `url("${SAMPLE_IMAGE}")`, borderRadius: "6px" },
    },
  },
  {
    id: "image-circle",
    label: "Photo Circle",
    shape: { kind: "ellipse" },
    fill: { kind: "image", image: { src: SAMPLE_IMAGE, fit: "cover" } },
    preview: {
      kind: "shape",
      style: { backgroundImage: `url("${SAMPLE_IMAGE}")`, borderRadius: "50%" },
    },
  },
];

const pathPresets: ShapePreset[] = [
  {
    id: "path-burst",
    label: "Burst",
    shape: { kind: "path", pathData: BURST_PATH.data, viewBox: BURST_PATH.viewBox },
    fill: { kind: "color", color: "#ef4444" },
    preview: { kind: "shape", style: { background: "#ef4444" } },
  },
  {
    id: "path-blob",
    label: "Blob",
    shape: { kind: "path", pathData: BLOB_PATH.data, viewBox: BLOB_PATH.viewBox },
    fill: { kind: "color", color: "#8b5cf6" },
    preview: { kind: "shape", style: { background: "#8b5cf6" } },
  },
  {
    id: "path-heart",
    label: "Heart",
    shape: { kind: "path", pathData: HEART_PATH.data, viewBox: HEART_PATH.viewBox },
    fill: { kind: "color", color: "#ec4899" },
    preview: { kind: "shape", style: { background: "#ec4899" } },
  },
  {
    id: "path-chat",
    label: "Chat Bubble",
    shape: { kind: "path", pathData: CHAT_PATH.data, viewBox: CHAT_PATH.viewBox },
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
