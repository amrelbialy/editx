import type { TextPreset } from "../config.types";
import { combo } from "./text-presets-combo-factory";
import { onPhotoShadow } from "./text-presets-combo-shadow";

/** Promo / card-style "Text Combinations": badges and price stacks. */
export const promoCombos: TextPreset[] = [
  combo({
    id: "sale-badge",
    label: "Sale Badge",
    sample: "SALE\n50% OFF",
    lines: [
      {
        text: "Sale",
        scale: 4,
        fontWeight: "bold",
        fill: "#ffffff",
        letterSpacing: 8,
        textTransform: "uppercase",
        ...onPhotoShadow,
      },
      {
        text: "50% off",
        scale: 1.6,
        fontWeight: "bold",
        fill: "#111827",
        backgroundColor: "#facc15",
        textTransform: "uppercase",
        gap: 0.4,
      },
      { text: "Limited time only", scale: 1, fill: "#e5e7eb", gap: 0.8, ...onPhotoShadow },
    ],
  }),
  combo({
    id: "postcard",
    label: "Postcard",
    sample: "Greetings from\nLE MARAIS",
    lines: [
      {
        text: "Greetings from",
        scale: 1.1,
        fontFamily: "Georgia",
        fontStyle: "italic",
        fill: "#4b5563",
      },
      {
        text: "Le Marais",
        scale: 3,
        fontWeight: "bold",
        fill: "#374151",
        letterSpacing: 2,
        textTransform: "uppercase",
        gap: 0.3,
      },
      {
        text: "Paris, France",
        scale: 1,
        fontFamily: "Georgia",
        fontStyle: "italic",
        fill: "#6b7280",
        gap: 0.6,
      },
    ],
  }),
  combo({
    id: "event-details",
    label: "Event Details",
    sample: "SAT 12 JUL · 8 PM\nLive in Concert",
    lines: [
      {
        text: "Sat 12 Jul · 8 pm",
        scale: 0.9,
        fontWeight: "bold",
        fill: "#f59e0b",
        letterSpacing: 4,
        textTransform: "uppercase",
        ...onPhotoShadow,
      },
      {
        text: "Live in Concert",
        scale: 3,
        fontWeight: "bold",
        fill: "#ffffff",
        gap: 0.4,
        ...onPhotoShadow,
      },
      { text: "Downtown Arena", scale: 1.1, fill: "#e5e7eb", gap: 0.7, ...onPhotoShadow },
    ],
  }),
  combo({
    id: "price-stack",
    label: "Price",
    sample: "Starting at\n$29",
    lines: [
      { text: "Starting at", scale: 1, fill: "#e5e7eb", ...onPhotoShadow },
      { text: "$29", scale: 4.5, fontWeight: "bold", fill: "#ffffff", gap: 0.15, ...onPhotoShadow },
      { text: "per month", scale: 1, fill: "#e5e7eb", gap: 0.4, ...onPhotoShadow },
    ],
  }),
];
