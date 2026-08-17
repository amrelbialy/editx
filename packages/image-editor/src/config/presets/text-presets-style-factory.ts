import type { TextPreset, TextStyleSpec } from "../config.types";

export interface StyleSpec {
  id: string;
  label: string;
  text: string;
  scale?: number;
  block: Partial<TextStyleSpec>;
}

/** Build a single-block text preset rendered directly by the thumbnail engine. */
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
