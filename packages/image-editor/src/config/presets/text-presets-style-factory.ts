import type { TextPreset, TextStyleSpec } from "../config.types";

export interface StyleSpec {
  id: string;
  label: string;
  text: string;
  scale?: number;
  block: Partial<TextStyleSpec>;
}

/**
 * Build a single-block "Text Styles" preset. The thumbnail is derived from the
 * block's real style at the gallery layer (see `derive-text-preview.ts`), so no
 * hand-authored `preview.style` is duplicated here.
 */
export function style(spec: StyleSpec): TextPreset {
  return {
    id: spec.id,
    label: spec.label,
    blocks: [
      {
        text: spec.text,
        fontSizeScale: spec.scale ?? 2.5,
        ...spec.block,
      },
    ],
    preview: { kind: "text", sample: spec.text },
  };
}
