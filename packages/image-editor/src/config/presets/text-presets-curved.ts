import type { TextPreset } from "../config.types";

/** "Curved Text" presets rendered along an arc. */
export const curved: TextPreset[] = [
  {
    id: "arc-up",
    label: "Arc Up",
    blocks: [
      {
        text: "CURVED TEXT",
        x: 0.2,
        y: 0.4,
        width: 0.6,
        height: 0.2,
        fontSizeScale: 2.5,
        fontWeight: "bold",
        textTransform: "uppercase",
        curve: { radius: 220, direction: "up" },
      },
    ],
    preview: { kind: "text", sample: "CURVED" },
  },
  {
    id: "arc-down",
    label: "Arc Down",
    blocks: [
      {
        text: "ARC BELOW",
        x: 0.2,
        y: 0.4,
        width: 0.6,
        height: 0.2,
        fontSizeScale: 2.5,
        fontWeight: "bold",
        textTransform: "uppercase",
        curve: { radius: 220, direction: "down" },
      },
    ],
    preview: { kind: "text", sample: "ARC" },
  },
];
