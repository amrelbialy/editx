import type { TextPreset } from "../config.types";
import { style } from "./text-presets-style-factory";

/** Single-block styles using the existing frame-only background box API. */
export const framedStyles: TextPreset[] = [
  style({
    id: "ink-frame",
    label: "Ink Frame",
    text: "INK FRAME",
    scale: 2.4,
    block: {
      fontFamily: "Georgia, serif",
      fontWeight: "bold",
      fill: "#f8fafc",
      letterSpacing: 2,
      transform: "uppercase",
      backgroundBox: {
        color: "#18181b",
        padding: { top: 10, right: 18, bottom: 10, left: 18 },
        cornerRadius: 2,
        stroke: { color: "#f8fafc", width: 2 },
      },
    },
  }),
  style({
    id: "offset-card",
    label: "Offset Card",
    text: "OFFSET",
    scale: 2.4,
    block: {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontWeight: "bold",
      fill: "#111827",
      transform: "uppercase",
      backgroundBox: {
        color: "#fef3c7",
        padding: { top: 9, right: 16, bottom: 9, left: 16 },
        cornerRadius: 4,
        shadow: { color: "#ef4444", offsetX: 8, offsetY: 8, blur: 0 },
      },
    },
  }),
];
