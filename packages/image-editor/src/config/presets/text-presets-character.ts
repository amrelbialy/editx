import type { TextPreset } from "../config.types";
import { style } from "./text-presets-style-factory";

/** Character-focused single-block styles with authored UTF-16 run overrides. */
export const characterStyles: TextPreset[] = [
  style({
    id: "color-pop",
    label: "Color Pop",
    text: "COLOR",
    scale: 3,
    block: {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontWeight: "bold",
      fill: "#111827",
      letterSpacing: 1,
      transform: "uppercase",
      runOverrides: [
        {
          start: 2,
          end: 3,
          style: {
            fill: "#f43f5e",
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSizeScale: 3.6,
          },
        },
      ],
    },
  }),
  style({
    id: "glitch-cut",
    label: "Glitch Cut",
    text: "GLITCH",
    scale: 3,
    block: {
      fontFamily: "Courier New, monospace",
      fontWeight: "bold",
      fill: "#f8fafc",
      textStrokeColor: "#111827",
      textStrokeWidth: 1,
      textShadowColor: "#ef4444",
      textShadowOffsetX: 4,
      textShadowOffsetY: 0,
      transform: "uppercase",
      runOverrides: [
        { start: 0, end: 1, style: { fill: "#22d3ee", textShadowColor: "#ef4444" } },
        { start: 2, end: 3, style: { fill: "#ef4444", textShadowOffsetX: -4 } },
        { start: 4, end: 5, style: { fill: "#22d3ee", textDecoration: "line-through" } },
      ],
    },
  }),
  style({
    id: "editorial-switch",
    label: "Editorial Switch",
    text: "EDITORIAL",
    scale: 2.7,
    block: {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontWeight: "bold",
      fill: "#18181b",
      letterSpacing: 2,
      transform: "uppercase",
      runOverrides: [
        {
          start: 4,
          end: 5,
          style: {
            fontFamily: "Georgia, Times New Roman, serif",
            fontStyle: "italic",
            fontWeight: "normal",
            fill: "#dc2626",
            fontSizeScale: 3.4,
          },
        },
      ],
    },
  }),
];
