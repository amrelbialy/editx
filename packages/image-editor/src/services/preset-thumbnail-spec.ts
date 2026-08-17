import type { ImageEditorConfig, ShapePreset, TextPreset } from "../config/config.types";

export type RasterPreset = ShapePreset | TextPreset;

export const PRESET_THUMBNAIL_PAGE = { width: 1920, height: 1080 } as const;
export const PRESET_THUMBNAIL_EXPORT = {
  width: 128,
  height: 72,
  padding: 4,
  pixelRatio: 2,
} as const;
export const PRESET_THUMBNAIL_RENDER_VERSION = 1;

export function getPresetThumbnailFingerprint(
  preset: RasterPreset,
  config: ImageEditorConfig,
): string {
  const { id: _id, label: _label, preview: _preview, ...renderPreset } = preset;
  const renderConfig = isTextPreset(preset)
    ? {
        defaultColor: config.text?.defaultColor ?? "#ffffff",
        defaultFontFamily: config.text?.defaultFontFamily ?? config.text?.fonts?.[0] ?? "Arial",
        defaultFontSize: config.text?.defaultFontSize ?? 24,
        defaultFontStyle: config.text?.defaultFontStyle ?? "normal",
        defaultFontWeight: config.text?.defaultFontWeight ?? "normal",
        defaultLineHeight: inheritsMultilineLineHeight(preset)
          ? (config.text?.defaultLineHeight ?? 1.1)
          : undefined,
        defaultTextAlign: config.text?.defaultTextAlign,
      }
    : {
        defaultColor: config.shapes?.defaultColor ?? "#3b82f6",
        defaultOpacity: config.shapes?.defaultOpacity ?? 1,
        defaultSize: config.shapes?.defaultSize ?? 0.25,
      };
  const serialized = stableSerialize({
    version: PRESET_THUMBNAIL_RENDER_VERSION,
    page: PRESET_THUMBNAIL_PAGE,
    export: PRESET_THUMBNAIL_EXPORT,
    type: isTextPreset(preset) ? "text" : "shape",
    preset: renderPreset,
    config: renderConfig,
  });
  return `v${PRESET_THUMBNAIL_RENDER_VERSION}-${fnv1a(serialized)}`;
}

function stableSerialize(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortValue(entry)]),
  );
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function isTextPreset(preset: RasterPreset): preset is TextPreset {
  return "blocks" in preset;
}

function inheritsMultilineLineHeight(preset: TextPreset): boolean {
  return preset.blocks.some((block) => block.lineHeight === undefined && block.text.includes("\n"));
}
