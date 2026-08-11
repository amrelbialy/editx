import type { TextPreset } from "../config.types";
import { combo } from "./text-presets-combo-factory";
import { onPhotoShadow } from "./text-presets-combo-shadow";

/** Editorial "Text Combinations": headline-driven stacks for photos/covers. */
export const editorialCombos: TextPreset[] = [
  combo({
    id: "heading-subtitle",
    label: "Heading + Subtitle",
    sample: "Main Heading\nA supporting subtitle",
    lines: [
      { text: "Main Heading", scale: 3, fontWeight: "bold", fill: "#ffffff", ...onPhotoShadow },
      {
        text: "A supporting subtitle",
        scale: 1.15,
        fill: "#e5e7eb",
        gap: 0.6,
        ...onPhotoShadow,
      },
    ],
  }),
  combo({
    id: "title-tag",
    label: "Kicker + Title",
    sample: "NEW\nBig Title",
    lines: [
      {
        text: "New",
        scale: 0.9,
        fontWeight: "bold",
        fill: "#f59e0b",
        letterSpacing: 4,
        textTransform: "uppercase",
        ...onPhotoShadow,
      },
      {
        text: "Big Title",
        scale: 3.25,
        fontWeight: "bold",
        fill: "#ffffff",
        gap: 0.4,
        ...onPhotoShadow,
      },
      { text: "Read the full story", scale: 1.05, fill: "#e5e7eb", gap: 0.7, ...onPhotoShadow },
    ],
  }),
  combo({
    id: "cinematic",
    label: "Cinematic",
    sample: "FREE CINEMATIC\nCOLORS",
    lines: [
      {
        text: "Free cinematic",
        scale: 0.9,
        fill: "#111827",
        letterSpacing: 5,
        textTransform: "uppercase",
      },
      {
        text: "Colors",
        scale: 4,
        fontFamily: "Georgia",
        fontWeight: "bold",
        fill: "#111827",
        letterSpacing: 2,
        textTransform: "uppercase",
        gap: 0.25,
      },
      {
        text: "Commercial use",
        scale: 0.9,
        fill: "#111827",
        letterSpacing: 5,
        textTransform: "uppercase",
        gap: 0.6,
      },
    ],
  }),
  combo({
    id: "quote",
    label: "Quote",
    sample: "»A quote is just a\nclever way…«\n— Someone smart",
    align: "left",
    width: 0.6,
    lines: [
      {
        text: "»A quote is just a clever\nway to sound wise\nwithout saying much.«",
        scale: 1.75,
        fontFamily: "Georgia",
        fontStyle: "italic",
        fill: "#1f2937",
        lineHeight: 1.35,
      },
      { text: "— Someone smart", scale: 1, fill: "#6b7280", gap: 1 },
    ],
  }),
  combo({
    id: "name-role",
    label: "Name + Role",
    sample: "Jane Doe\nPRODUCT DESIGNER",
    align: "left",
    width: 0.55,
    centerY: 0.78,
    lines: [
      { text: "Jane Doe", scale: 2.5, fontWeight: "bold", fill: "#ffffff", ...onPhotoShadow },
      {
        text: "Product designer",
        scale: 1,
        fill: "#e5e7eb",
        letterSpacing: 3,
        textTransform: "uppercase",
        gap: 0.6,
        ...onPhotoShadow,
      },
    ],
  }),
];
