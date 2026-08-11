import type { TextPreset } from "../config.types";
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
    scale: 2,
    block: { fontWeight: "bold", fill: "#111827", backgroundColor: "#fde68a" },
  }),
  style({
    id: "sticker",
    label: "Sticker",
    text: "Sticker",
    scale: 2,
    block: { fontWeight: "bold", fill: "#ffffff", backgroundColor: "#111827" },
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
    text: "Loading",
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
    block: { fontFamily: "Georgia", fontWeight: "bold", fill: "#9f1239" },
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
export const styles: TextPreset[] = [...solidStyles, ...gradientStyles];
