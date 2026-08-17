import { useEffect, useState } from "react";
import { defaultConfig } from "../src/config/default-config";
import { DEFAULT_SHAPE_PRESET_GROUPS, DEFAULT_TEXT_PRESET_GROUPS } from "../src/config/presets";
import { PresetThumbnailRenderer } from "../src/services/preset-thumbnail-renderer";
import {
  getPresetThumbnailFingerprint,
  PRESET_THUMBNAIL_EXPORT,
  type RasterPreset,
} from "../src/services/preset-thumbnail-spec";
import { getPresetThumbnailManifestKey } from "../src/services/preset-thumbnail-static";

export interface GeneratedPresetThumbnail {
  dataUrl: string;
  filename: string;
  key: string;
}

declare global {
  interface Window {
    __generatedPresetThumbnails?: GeneratedPresetThumbnail[];
    __presetThumbnailGenerationError?: string;
  }
}

const presets: Array<{ kind: "shape" | "text"; preset: RasterPreset }> = [
  ...DEFAULT_TEXT_PRESET_GROUPS.flatMap((group) =>
    group.presets.map((preset) => ({ kind: "text" as const, preset })),
  ),
  ...DEFAULT_SHAPE_PRESET_GROUPS.flatMap((group) =>
    group.presets.map((preset) => ({ kind: "shape" as const, preset })),
  ),
];

export function PresetThumbnailGenerator() {
  const [status, setStatus] = useState("rendering");

  useEffect(() => {
    let active = true;
    const renderer = new PresetThumbnailRenderer(defaultConfig);

    async function generate() {
      const results: GeneratedPresetThumbnail[] = [];
      for (const { kind, preset } of presets) {
        const url = await renderer.render(preset);
        const blob = await fetch(url).then((response) => response.blob());
        await validatePng(blob, preset.id);
        const fingerprint = getPresetThumbnailFingerprint(preset, defaultConfig);
        results.push({
          dataUrl: await blobToDataUrl(blob),
          filename: `${kind}-${slugify(preset.id)}-${fingerprint}.png`,
          key: getPresetThumbnailManifestKey(preset, defaultConfig),
        });
      }
      if (active) {
        window.__generatedPresetThumbnails = results;
        setStatus("done");
      }
    }

    generate().catch((error: unknown) => {
      if (!active) return;
      window.__presetThumbnailGenerationError = error instanceof Error ? error.message : String(error);
      setStatus("failed");
    });
    return () => {
      active = false;
      renderer.dispose();
      delete window.__generatedPresetThumbnails;
      delete window.__presetThumbnailGenerationError;
    };
  }, []);

  return <output data-status={status}>{status}</output>;
}

async function validatePng(blob: Blob, presetId: string): Promise<void> {
  const bitmap = await createImageBitmap(blob);
  const expectedWidth = PRESET_THUMBNAIL_EXPORT.width * PRESET_THUMBNAIL_EXPORT.pixelRatio;
  const expectedHeight = PRESET_THUMBNAIL_EXPORT.height * PRESET_THUMBNAIL_EXPORT.pixelRatio;
  if (bitmap.width !== expectedWidth || bitmap.height !== expectedHeight) {
    bitmap.close();
    throw new Error(`${presetId}: expected ${expectedWidth}x${expectedHeight} PNG`);
  }
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error(`${presetId}: canvas context unavailable`);
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let painted = false;
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] > 0) painted = true;
  }
  if (!painted) throw new Error(`${presetId}: PNG is transparent`);
  for (let x = 0; x < canvas.width; x += 1) {
    if (alphaAt(pixels, canvas.width, x, 0) || alphaAt(pixels, canvas.width, x, canvas.height - 1)) {
      throw new Error(`${presetId}: painted pixel touches horizontal edge`);
    }
  }
  for (let y = 0; y < canvas.height; y += 1) {
    if (alphaAt(pixels, canvas.width, 0, y) || alphaAt(pixels, canvas.width, canvas.width - 1, y)) {
      throw new Error(`${presetId}: painted pixel touches vertical edge`);
    }
  }
}

function alphaAt(pixels: Uint8ClampedArray, width: number, x: number, y: number): number {
  return pixels[(y * width + x) * 4 + 3];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}