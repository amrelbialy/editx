import type { TextPreset } from "../config.types";
import { combo } from "./text-presets-combo-factory";
import { onPhotoShadow } from "./text-presets-combo-shadow";

/**
 * "Text Combinations" built on the block-level background box: card, boxed
 * lines, and ticker-bar layouts. Every box length is authored against the 1080
 * reference edge and scaled with the canvas at insertion.
 */
export const boxedCombos: TextPreset[] = [
  combo({
    id: "promo-code",
    label: "Promo",
    sample: "LIMITED OFFER\n20% OFF",
    width: 0.64,
    lines: [
      {
        text: "Limited offer",
        scale: 1.05,
        fontWeight: "bold",
        fill: "#14532d",
        letterSpacing: 5,
        textTransform: "uppercase",
      },
      {
        text: "20% off",
        scale: 3.4,
        fontWeight: "bold",
        fill: "#15803d",
        textTransform: "uppercase",
        gap: 0.35,
        backgroundBox: {
          color: "#ffffff",
          padding: { top: 24, right: 36, bottom: 24, left: 36 },
          cornerRadius: 8,
          shadow: { color: "#052e16", offsetX: 12, offsetY: 12, blur: 0 },
          stroke: { color: "#166534", width: 3 },
        },
      },
    ],
  }),
  combo({
    id: "text-box",
    label: "Box",
    sample: "TEXT IN A BOX.\nNOT A MESSAGE\nIN A BOTTLE.",
    width: 0.68,
    lines: [
      {
        text: "Text in a box.\nNot a message\nin a bottle.",
        scale: 2.35,
        fontWeight: "bold",
        fill: "#172554",
        lineHeight: 1.12,
        widthMode: "fixed",
        backgroundBox: {
          color: "#c7d2fe",
          padding: { top: 28, right: 34, bottom: 28, left: 34 },
          cornerRadius: 2,
        },
      },
    ],
  }),
  combo({
    id: "breaking-news",
    label: "Breaking News",
    sample: "BREAKING NEWS\nMarkets hit record high",
    width: 0.78,
    shapes: [
      {
        kind: "shape",
        layout: { x: 0.11, y: 0.442, width: 0.78, height: 0.04 },
        shape: { kind: "rect" },
        fill: { kind: "color", color: "#dc2626" },
      },
    ],
    lines: [
      {
        text: "Breaking news",
        scale: 0.9,
        fontWeight: "bold",
        fill: "#ffffff",
        letterSpacing: 5,
        textTransform: "uppercase",
      },
      {
        text: "Markets hit record high",
        scale: 2.4,
        fontWeight: "bold",
        fill: "#ffffff",
        gap: 0.3,
        ...onPhotoShadow,
      },
    ],
  }),
];
