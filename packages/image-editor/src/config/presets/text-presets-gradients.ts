import type { TextPreset } from "../config.types";
import { style } from "./text-presets-style-factory";

/** Gradient-text "Text Styles" presets (flat only — never combined with curve). */
export const gradientStyles: TextPreset[] = [
  style({
    id: "sunset",
    label: "Sunset",
    text: "Sunset",
    block: {
      fontWeight: "bold",
      fillGradient: {
        type: "linear",
        angle: 90,
        stops: [
          { offset: 0, color: "#f97316" },
          { offset: 1, color: "#ef4444" },
        ],
      },
    },
  }),
  style({
    id: "colorful",
    label: "Colorful",
    text: "Colorful",
    block: {
      fontWeight: "bold",
      fillGradient: {
        type: "linear",
        angle: 90,
        stops: [
          { offset: 0, color: "#ec4899" },
          { offset: 0.5, color: "#8b5cf6" },
          { offset: 1, color: "#3b82f6" },
        ],
      },
    },
  }),
  style({
    id: "so-sunny",
    label: "So Sunny",
    text: "So Sunny",
    block: {
      fontWeight: "bold",
      fillGradient: {
        type: "linear",
        angle: 90,
        stops: [
          { offset: 0, color: "#f59e0b" },
          { offset: 1, color: "#fde047" },
        ],
      },
    },
  }),
];
