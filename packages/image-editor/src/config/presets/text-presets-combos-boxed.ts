import type { TextPreset } from "../config.types";
import { combo } from "./text-presets-combo-factory";
import { onPhotoShadow } from "./text-presets-combo-shadow";

/** Light-blue rounded box shared by every line of the "Text Box" preset. */
const boxedLine = {
  backgroundBox: { color: "#dbeafe", padding: 14, cornerRadius: 8 },
} as const;

/**
 * "Text Combinations" built on the block-level background box: card, boxed
 * lines, and ticker-bar layouts. Every box length is authored against the 1080
 * reference edge and scaled with the canvas at insertion.
 */
export const boxedCombos: TextPreset[] = [
  combo({
    id: "promo-code",
    label: "Promo Code",
    sample: "PROMO CODE\nGET 20",
    lines: [
      {
        text: "Promo code",
        scale: 0.9,
        fontWeight: "bold",
        fill: "#16a34a",
        letterSpacing: 6,
        textTransform: "uppercase",
        ...onPhotoShadow,
      },
      {
        text: "Get 20",
        scale: 3.5,
        fontWeight: "bold",
        fill: "#111827",
        textTransform: "uppercase",
        gap: 0.5,
        backgroundBox: {
          color: "#ffffff",
          padding: { top: 28, right: 40, bottom: 28, left: 40 },
          cornerRadius: 6,
          // Hard offset with zero blur: a black card peeking out behind the white one.
          shadow: { color: "#000000", offsetX: 14, offsetY: 14, blur: 0 },
        },
      },
    ],
  }),
  combo({
    id: "text-box",
    label: "Text Box",
    sample: "Simple.\nBold.\nClear.",
    align: "left",
    lines: [
      { text: "Simple.", scale: 1.8, fontWeight: "bold", fill: "#1e3a8a", ...boxedLine },
      {
        text: "Bold.",
        scale: 1.8,
        fontWeight: "bold",
        fill: "#1e3a8a",
        gap: 0.7,
        ...boxedLine,
      },
      {
        text: "Clear.",
        scale: 1.8,
        fontWeight: "bold",
        fill: "#1e3a8a",
        gap: 0.7,
        ...boxedLine,
      },
    ],
  }),
  combo({
    id: "breaking-news",
    label: "Breaking News",
    sample: "BREAKING NEWS\nMarkets hit record high",
    lines: [
      {
        text: "Breaking news",
        scale: 1,
        fontWeight: "bold",
        fill: "#ffffff",
        letterSpacing: 5,
        textTransform: "uppercase",
        backgroundBox: {
          color: "#dc2626",
          padding: { top: 10, right: 20, bottom: 10, left: 20 },
        },
      },
      {
        text: "Markets hit record high",
        scale: 2.6,
        fontWeight: "bold",
        fill: "#ffffff",
        gap: 0.5,
        ...onPhotoShadow,
      },
    ],
  }),
];
