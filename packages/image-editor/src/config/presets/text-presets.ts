import type { PresetGroup, TextPreset } from "../config.types";
import { combinations } from "./text-presets-combos";
import { curved } from "./text-presets-curved";
import { styles } from "./text-presets-styles";

const plain: TextPreset[] = [
  {
    id: "title",
    label: "Title",
    blocks: [
      {
        text: "Title",
        x: 0.2,
        y: 0.4,
        width: 0.6,
        height: 0.16,
        fontSizeScale: 3.75,
        fontWeight: "bold",
      },
    ],
    preview: { kind: "text", sample: "Title" },
  },
  {
    id: "heading",
    label: "Heading",
    blocks: [
      {
        text: "Heading",
        x: 0.25,
        y: 0.42,
        width: 0.5,
        height: 0.12,
        fontSizeScale: 2.625,
        fontWeight: "bold",
      },
    ],
    preview: { kind: "text", sample: "Heading" },
  },
  {
    id: "subheading",
    label: "Subheading",
    blocks: [
      {
        text: "Subheading",
        x: 0.3,
        y: 0.44,
        width: 0.4,
        height: 0.1,
        fontSizeScale: 1.75,
        fontWeight: "bold",
      },
    ],
    preview: { kind: "text", sample: "Subheading" },
  },
  {
    id: "body",
    label: "Body Text",
    blocks: [
      {
        text: "Body text",
        x: 0.325,
        y: 0.46,
        width: 0.35,
        height: 0.08,
        fontSizeScale: 1,
        fontWeight: "normal",
      },
    ],
    preview: { kind: "text", sample: "Body text" },
  },
];

/** Built-in text preset categories (Plain / Styles / Combinations / Curved). */
export const DEFAULT_TEXT_PRESET_GROUPS: PresetGroup<TextPreset>[] = [
  { id: "plain", label: "Plain Text", labelKey: "presets.text.plain", presets: plain },
  { id: "styles", label: "Text Styles", labelKey: "presets.text.styles", presets: styles },
  {
    id: "combinations",
    label: "Text Combinations",
    labelKey: "presets.text.combinations",
    presets: combinations,
  },
  { id: "curved", label: "Curved Text", labelKey: "presets.text.curved", presets: curved },
];
