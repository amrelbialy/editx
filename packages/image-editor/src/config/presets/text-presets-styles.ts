import type { TextPreset } from "../config.types";
import { characterStyles } from "./text-presets-character";
import { framedStyles } from "./text-presets-framed";
import { gradientStyles } from "./text-presets-gradients";
import { style } from "./text-presets-style-factory";

/** Solid / stroke / shadow / highlight "Text Styles" presets. */
const solidStyles: TextPreset[] = [
  style({
    id: "outline",
    label: "Outline",
    text: "OUTLINE",
    scale: 3,
    block: {
      fontWeight: "bold",
      fill: "#00000000",
      textStrokeColor: "#ffffff",
      textStrokeWidth: 2,
      textTransform: "uppercase",
    },
  }),
  style({
    id: "shadow",
    label: "Shadow",
    text: "Shadow",
    scale: 3,
    block: {
      fontWeight: "bold",
      fill: "#ffffff",
      textShadowColor: "#000000",
      textShadowBlur: 6,
      textShadowOffsetX: 3,
      textShadowOffsetY: 3,
    },
  }),
  style({
    id: "soft-shadow",
    label: "Soft Shadow",
    text: "Soft Shadow",
    block: {
      fontWeight: "bold",
      fill: "#e5e7eb",
      textShadowColor: "#000000",
      textShadowBlur: 10,
      textShadowOffsetX: 1,
      textShadowOffsetY: 2,
    },
  }),
  style({
    id: "highlight",
    label: "Highlight",
    text: "Highlight",
    scale: 3,
    block: {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontWeight: "bold",
      fill: "#111827",
      backgroundColor: "#facc15",
      backgroundOpacity: 0.82,
      backgroundCornerRadius: 3,
      backgroundPadding: { top: 3, right: 8, bottom: 3, left: 8 },
      transform: "uppercase",
    },
  }),
  style({
    id: "sticker",
    label: "Sticker",
    text: "Sticker",
    scale: 3,
    block: {
      fontFamily: "Arial, sans-serif",
      fontWeight: "bold",
      fill: "#ffffff",
      backgroundColor: "#2563eb",
      backgroundOpacity: 1,
      backgroundCornerRadius: 18,
      backgroundPadding: { top: 5, right: 14, bottom: 5, left: 14 },
      letterSpacing: 2,
      transform: "uppercase",
    },
  }),
  style({
    id: "modern",
    label: "Modern",
    text: "MODERN",
    scale: 2,
    block: { fontWeight: "normal", fill: "#6b7280", letterSpacing: 6, textTransform: "uppercase" },
  }),
  style({
    id: "phantom",
    label: "Phantom",
    text: "PHANTOM",
    scale: 3,
    block: {
      fontWeight: "bold",
      fill: "#00000000",
      textStrokeColor: "#d1d5db",
      textStrokeWidth: 2,
      textTransform: "uppercase",
    },
  }),
  style({
    id: "bold-caps",
    label: "Bold Caps",
    text: "BOLD CAPS",
    scale: 2.75,
    block: { fontWeight: "bold", fill: "#111827", letterSpacing: -1, textTransform: "uppercase" },
  }),
  style({
    id: "chapter",
    label: "Serif Italic",
    text: "Chapter",
    block: { fontFamily: "Georgia", fontStyle: "italic", fontWeight: "normal", fill: "#1f2937" },
  }),
  style({
    id: "elegant",
    label: "Elegant",
    text: "Elegant",
    block: {
      fontFamily: "Times New Roman",
      fontStyle: "italic",
      fontWeight: "normal",
      fill: "#1f2937",
      letterSpacing: 2,
    },
  }),
  style({
    id: "mono-loading",
    label: "Mono",
    text: "Loading...",
    block: { fontFamily: "Courier New", fontWeight: "bold", fill: "#2563eb", letterSpacing: 1 },
  }),
  style({
    id: "team",
    label: "Team",
    text: "TEAM",
    block: {
      fontFamily: "Georgia",
      fontWeight: "bold",
      fill: "#991b1b",
      textTransform: "uppercase",
    },
  }),
  style({
    id: "strawberry",
    label: "Strawberry",
    text: "Strawberry",
    scale: 3,
    block: {
      fontFamily: "Georgia, Times New Roman, serif",
      fontStyle: "italic",
      fontWeight: "bold",
      fill: "#fff1f2",
      textStrokeColor: "#9f1239",
      textStrokeWidth: 1,
      textShadowColor: "#881337",
      textShadowOffsetX: 3,
      textShadowOffsetY: 3,
      runOverrides: [
        {
          start: 5,
          end: 10,
          style: {
            fontFamily: "Arial Black, Arial, sans-serif",
            fontStyle: "normal",
            fill: "#9f1239",
            textStrokeWidth: null,
            backgroundColor: "#fda4af",
            backgroundCornerRadius: 12,
            backgroundPadding: { top: 3, right: 7, bottom: 3, left: 7 },
            transform: "uppercase",
          },
        },
      ],
    },
  }),
  style({
    id: "soft-club",
    label: "Soft Club",
    text: "soft club",
    block: { fontWeight: "normal", fill: "#10b981", textTransform: "lowercase" },
  }),
  style({
    id: "neon",
    label: "Neon",
    text: "Neon",
    block: {
      fontWeight: "bold",
      fill: "#ec4899",
      textShadowColor: "#ec4899",
      textShadowBlur: 16,
      textShadowOffsetX: 0,
      textShadowOffsetY: 0,
    },
  }),
];

/** Full built-in "Text Styles" catalog (solid + gradient). */
export const styles: TextPreset[] = [
  ...characterStyles,
  ...solidStyles,
  ...framedStyles,
  ...gradientStyles,
];
