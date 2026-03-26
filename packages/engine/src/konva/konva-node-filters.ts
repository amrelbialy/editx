import type Konva from "konva";
import type { BlockData } from "../block/block.types";
import {
  EFFECT_ADJUSTMENTS_BLACKS,
  EFFECT_ADJUSTMENTS_BRIGHTNESS,
  EFFECT_ADJUSTMENTS_CLARITY,
  EFFECT_ADJUSTMENTS_CONTRAST,
  EFFECT_ADJUSTMENTS_EXPOSURE,
  EFFECT_ADJUSTMENTS_GAMMA,
  EFFECT_ADJUSTMENTS_HIGHLIGHTS,
  EFFECT_ADJUSTMENTS_SATURATION,
  EFFECT_ADJUSTMENTS_SHADOWS,
  EFFECT_ADJUSTMENTS_SHARPNESS,
  EFFECT_ADJUSTMENTS_TEMPERATURE,
  EFFECT_ADJUSTMENTS_WHITES,
  EFFECT_FILTER_NAME,
} from "../block/property-keys";
import { type AdjustmentValues, buildFilterPipeline } from "./filters/build-filter-pipeline";
import { getFilterPreset } from "./filters/presets";
import type { FilterParams, WebGLFilterRenderer } from "./webgl-filter-renderer";

/** Collect adjustment values from all adjustments-type effect blocks. */
export function collectAdjustmentValues(
  block: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): AdjustmentValues | null {
  if (!resolveBlock || block.effectIds.length === 0) return null;

  for (const effectId of block.effectIds) {
    const effectBlock = resolveBlock(effectId);
    if (!effectBlock || effectBlock.kind !== "adjustments") continue;

    const p = effectBlock.properties;
    return {
      brightness: (p[EFFECT_ADJUSTMENTS_BRIGHTNESS] as number) ?? 0,
      saturation: (p[EFFECT_ADJUSTMENTS_SATURATION] as number) ?? 0,
      contrast: (p[EFFECT_ADJUSTMENTS_CONTRAST] as number) ?? 0,
      gamma: (p[EFFECT_ADJUSTMENTS_GAMMA] as number) ?? 0,
      clarity: (p[EFFECT_ADJUSTMENTS_CLARITY] as number) ?? 0,
      exposure: (p[EFFECT_ADJUSTMENTS_EXPOSURE] as number) ?? 0,
      shadows: (p[EFFECT_ADJUSTMENTS_SHADOWS] as number) ?? 0,
      highlights: (p[EFFECT_ADJUSTMENTS_HIGHLIGHTS] as number) ?? 0,
      blacks: (p[EFFECT_ADJUSTMENTS_BLACKS] as number) ?? 0,
      whites: (p[EFFECT_ADJUSTMENTS_WHITES] as number) ?? 0,
      temperature: (p[EFFECT_ADJUSTMENTS_TEMPERATURE] as number) ?? 0,
      sharpness: (p[EFFECT_ADJUSTMENTS_SHARPNESS] as number) ?? 0,
    };
  }

  return null;
}

/** Collect filter preset name from the first filter-type effect block. */
export function collectFilterPresetName(
  block: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): string {
  if (!resolveBlock || block.effectIds.length === 0) return "";

  for (const effectId of block.effectIds) {
    const effectBlock = resolveBlock(effectId);
    if (!effectBlock || effectBlock.kind !== "filter") continue;
    return (effectBlock.properties[EFFECT_FILTER_NAME] as string) ?? "";
  }

  return "";
}

/** Apply adjustment/filter effects to a Konva.Image node (WebGL or CPU fallback). */
export function applyFilters(
  imgNode: Konva.Image,
  block: BlockData,
  stage: Konva.Stage | null,
  webgl: WebGLFilterRenderer | null,
  resolveBlock?: (id: number) => BlockData | undefined,
): void {
  const values = collectAdjustmentValues(block, resolveBlock);
  const presetName = collectFilterPresetName(block, resolveBlock);
  const hasAdjustments = values != null;
  const hasPreset = presetName !== "";

  const _perf = typeof window !== "undefined" && (window as any).__CE_PERF;

  if (!hasAdjustments && !hasPreset) {
    if (_perf) console.log("[perf:applyFilters] no adjustments/preset, skipping");
    if (imgNode.filters()?.length) {
      imgNode.filters([]);
      imgNode.clearCache();
    }
    const orig = imgNode.getAttr("_sourceImage") as HTMLImageElement | undefined;
    if (orig && imgNode.image() !== orig) {
      imgNode.image(orig);
    }
    return;
  }

  // ── WebGL path ──
  if (webgl) {
    let sourceImg = imgNode.getAttr("_sourceImage") as HTMLImageElement | undefined;
    if (!sourceImg) {
      const currentImg = imgNode.image();
      if (_perf)
        console.log(
          "[perf:applyFilters] _sourceImage missing, imgNode.image() is:",
          currentImg?.constructor?.name,
          "value:",
          currentImg,
        );
      if (currentImg instanceof HTMLImageElement) {
        sourceImg = currentImg;
        imgNode.setAttr("_sourceImage", sourceImg);
      }
    }
    if (sourceImg) {
      const t0 = typeof window !== "undefined" && (window as any).__CE_PERF ? performance.now() : 0;
      webgl.uploadImage(sourceImg, sourceImg.naturalWidth, sourceImg.naturalHeight);

      const params: FilterParams = {
        brightness: values?.brightness ?? 0,
        contrast: values?.contrast ?? 0,
        saturation: values?.saturation ?? 0,
        gamma: values?.gamma ?? 0,
        exposure: values?.exposure ?? 0,
        temperature: values?.temperature ?? 0,
        shadows: values?.shadows ?? 0,
        highlights: values?.highlights ?? 0,
        blacks: values?.blacks ?? 0,
        whites: values?.whites ?? 0,
        clarity: values?.clarity ?? 0,
        sharpness: values?.sharpness ?? 0,
        preset: presetName,
      };

      const filteredCanvas = webgl.render(params);

      if (imgNode.filters()?.length) {
        imgNode.filters([]);
        imgNode.clearCache();
      }
      imgNode.image(filteredCanvas);
      if (typeof window !== "undefined" && (window as any).__CE_PERF) {
        console.log(`[perf:applyFilters] WebGL total: ${(performance.now() - t0).toFixed(2)}ms`);
      }
      return;
    }
    if (_perf)
      console.log("[perf:applyFilters] WebGL path: sourceImg is null, falling through to CPU");
  } else {
    if (_perf) console.log("[perf:applyFilters] #webgl is null, using CPU fallback");
  }

  // ── CPU fallback path ──
  if (_perf) console.log("[perf:applyFilters] CPU fallback running");
  const t1 = _perf ? performance.now() : 0;
  const filterPresetFn = presetName ? (getFilterPreset(presetName) ?? null) : null;

  const allFilters: Array<(imageData: ImageData) => void> = [];

  if (values) {
    const pipeline = buildFilterPipeline(values);
    if (pipeline.hasFilters) {
      for (const [key, val] of Object.entries(pipeline.attrs)) {
        imgNode.setAttr(key, val);
      }
      allFilters.push(...(pipeline.filters as Array<(imageData: ImageData) => void>));
    }
  }

  if (filterPresetFn) {
    allFilters.push(filterPresetFn);
  }

  if (allFilters.length === 0) {
    if (imgNode.filters()?.length) {
      imgNode.filters([]);
      imgNode.clearCache();
    }
    return;
  }

  imgNode.filters(allFilters as any);

  if (imgNode.image()) {
    imgNode.cache();
  }
  if (_perf)
    console.log(
      `[perf:applyFilters] CPU fallback total: ${(performance.now() - t1).toFixed(2)}ms (${allFilters.length} filters)`,
    );
}
