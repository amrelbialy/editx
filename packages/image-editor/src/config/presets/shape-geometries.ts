import type { ShapePreset } from "../preset.types";
import {
  ARCH_PATH,
  BLOB_PATH,
  BLOCK_ARROW_PATH,
  BURST_PATH,
  CHAT_PATH,
  CLOVER_PATH,
  CRESCENT_PATH,
  DIAMOND_PATH,
  HEART_PATH,
  PLUS_PATH,
  RIGHT_TRIANGLE_PATH,
  SEMICIRCLE_PATH,
  type ShapePath,
  SPARKLE_PATH,
  SUNBURST_PATH,
  TEARDROP_PATH,
  WAVE_PATH,
} from "./shape-paths";

export interface ShapeGeometryDefinition {
  id: string;
  label: string;
  shape: ShapePreset["shape"];
}

function pathGeometry(id: string, label: string, path: ShapePath): ShapeGeometryDefinition {
  return {
    id,
    label,
    shape: { kind: "path", name: id, pathData: path.data, viewBox: path.viewBox },
  };
}

export const SHARED_SHAPE_GEOMETRIES: ShapeGeometryDefinition[] = [
  { id: "rect", label: "Rectangle", shape: { kind: "rect" } },
  {
    id: "rounded-rect",
    label: "Rounded Rectangle",
    shape: { kind: "rect", cornerRadius: 12 },
  },
  { id: "circle", label: "Circle", shape: { kind: "ellipse" } },
  { id: "capsule", label: "Capsule", shape: { kind: "rect", cornerRadius: 50 } },
  { id: "triangle", label: "Triangle", shape: { kind: "polygon", sides: 3 } },
  pathGeometry("right-triangle", "Right Triangle", RIGHT_TRIANGLE_PATH),
  { id: "pentagon", label: "Pentagon", shape: { kind: "polygon", sides: 5 } },
  pathGeometry("diamond", "Diamond", DIAMOND_PATH),
  { id: "star", label: "Star", shape: { kind: "star", points: 5, innerDiameter: 0.45 } },
  pathGeometry("plus", "Plus", PLUS_PATH),
  pathGeometry("heart", "Heart", HEART_PATH),
  pathGeometry("block-arrow", "Block Arrow", BLOCK_ARROW_PATH),
];

export const ABSTRACT_SHAPE_GEOMETRIES: ShapeGeometryDefinition[] = [
  pathGeometry("path-burst", "Burst", BURST_PATH),
  pathGeometry("path-blob", "Blob", BLOB_PATH),
  pathGeometry("path-heart", "Heart", HEART_PATH),
  pathGeometry("path-chat", "Chat Bubble", CHAT_PATH),
  pathGeometry("path-crescent", "Crescent", CRESCENT_PATH),
  pathGeometry("path-clover", "Clover", CLOVER_PATH),
  pathGeometry("path-sparkle", "Sparkle", SPARKLE_PATH),
  pathGeometry("path-arch", "Arch", ARCH_PATH),
  pathGeometry("path-semicircle", "Semicircle", SEMICIRCLE_PATH),
  pathGeometry("path-teardrop", "Teardrop", TEARDROP_PATH),
  pathGeometry("path-wave", "Wave", WAVE_PATH),
  pathGeometry("path-sunburst", "Sunburst", SUNBURST_PATH),
];
