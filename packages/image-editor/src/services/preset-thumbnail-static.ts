import type { ImageEditorConfig } from "../config/config.types";
import { BUILT_IN_PRESET_THUMBNAILS } from "../config/presets/preset-thumbnail-manifest.generated";
import { getPresetThumbnailFingerprint, type RasterPreset } from "./preset-thumbnail-spec";

export function getStaticPresetThumbnail(
  preset: RasterPreset,
  config: ImageEditorConfig,
): string | null {
  return BUILT_IN_PRESET_THUMBNAILS[getPresetThumbnailManifestKey(preset, config)] ?? null;
}

export function getPresetThumbnailManifestKey(
  preset: RasterPreset,
  config: ImageEditorConfig,
): string {
  const kind = "blocks" in preset ? "text" : "shape";
  return `${kind}:${preset.id}:${getPresetThumbnailFingerprint(preset, config)}`;
}
