import type Konva from "konva";
import type { Filter } from "konva/lib/Node";
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
  EFFECT_ENABLED,
  EFFECT_FILTER_NAME,
} from "../block/property-keys";
import { type AdjustmentValues, hasAnyAdjustment } from "./filters/build-filter-pipeline";
import { applyFilterChain } from "./filters/cpu-chain";
import { getPresetOps } from "./filters/presets";
import type { FilterParams, WebGLFilterRenderer } from "./webgl-filter-renderer";

/** True unless the effect block explicitly has its enabled flag set to false. */
function isEffectEnabled(effectBlock: BlockData): boolean {
  return effectBlock.properties[EFFECT_ENABLED] !== false;
}

/** Collect adjustment values from all adjustments-type effect blocks. */
export function collectAdjustmentValues(
  block: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): AdjustmentValues | null {
  if (!resolveBlock || block.effectIds.length === 0) return null;

  for (const effectId of block.effectIds) {
    const effectBlock = resolveBlock(effectId);
    if (!effectBlock || effectBlock.kind !== "adjustments") continue;
    if (!isEffectEnabled(effectBlock)) continue;

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
    if (!isEffectEnabled(effectBlock)) continue;
    return (effectBlock.properties[EFFECT_FILTER_NAME] as string) ?? "";
  }

  return "";
}

/**
 * Stable cache key from the effective filter inputs. Two runs with the same
 * key AND the same source image produce identical pixels, so the pipeline can
 * be skipped. Crop/flip are intentionally excluded — they change how the node
 * is drawn, not the filtered pixel buffer, so the cached result stays valid.
 */
function computeFilterKey(values: AdjustmentValues | null, presetName: string): string {
  if (!values) return `|${presetName}`;
  return (
    `${values.brightness},${values.saturation},${values.contrast},${values.gamma},` +
    `${values.clarity},${values.exposure},${values.shadows},${values.highlights},` +
    `${values.blacks},${values.whites},${values.temperature},${values.sharpness}` +
    `|${presetName}`
  );
}

function perfLog(message: string): void {
  if (typeof window !== "undefined" && (window as { __EX_PERF?: boolean }).__EX_PERF) {
    console.log(message);
  }
}

/** Apply adjustment/filter effects to a Konva.Image node (WebGL or CPU fallback). */
export function applyFilters(
  imgNode: Konva.Image,
  block: BlockData,
  _stage: Konva.Stage | null,
  webgl: WebGLFilterRenderer | null,
  resolveBlock?: (id: number) => BlockData | undefined,
): void {
  const values = collectAdjustmentValues(block, resolveBlock);
  const presetName = collectFilterPresetName(block, resolveBlock);
  const hasPreset = presetName !== "";
  const hasEffective = (values != null && hasAnyAdjustment(values)) || hasPreset;
  const effectiveValues = hasEffective ? values : null;

  const sourceImg = imgNode.getAttr("_sourceImage") as HTMLImageElement | undefined;

  // ── Dirty check: skip when nothing that affects the pixels changed ──
  const key = computeFilterKey(effectiveValues, presetName);
  const lastKey = imgNode.getAttr("_lastFilterKey") as string | undefined;
  const lastSource = imgNode.getAttr("_lastFilterSource") as HTMLImageElement | undefined;
  if (lastKey === key && lastSource === sourceImg) {
    perfLog("[perf:applyFilters] cache hit, skipping");
    return;
  }

  // ── No effective filters: clear back to the original source ──
  if (!hasEffective) {
    if (imgNode.filters()?.length) {
      imgNode.filters([]);
      imgNode.clearCache();
    }
    if (sourceImg && imgNode.image() !== sourceImg) {
      imgNode.image(sourceImg);
    }
    imgNode.setAttr("_filteredCanvas", undefined);
    imgNode.setAttr("_lastFilterKey", key);
    imgNode.setAttr("_lastFilterSource", sourceImg);
    return;
  }

  // ── WebGL path ──
  if (webgl) {
    let usedSource = sourceImg;
    if (!usedSource) {
      const currentImg = imgNode.image();
      if (currentImg instanceof HTMLImageElement) {
        usedSource = currentImg;
        imgNode.setAttr("_sourceImage", usedSource);
      }
    }
    if (usedSource) {
      const t0 = typeof window !== "undefined" ? performance.now() : 0;
      webgl.uploadImage(usedSource, usedSource.naturalWidth, usedSource.naturalHeight);

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

      // Copy into a per-node canvas so each Image node owns its own buffer
      // (the WebGL renderer returns the same shared canvas every time).
      let copyCanvas = imgNode.getAttr("_filteredCanvas") as HTMLCanvasElement | undefined;
      if (
        !copyCanvas ||
        copyCanvas.width !== filteredCanvas.width ||
        copyCanvas.height !== filteredCanvas.height
      ) {
        copyCanvas = document.createElement("canvas");
        copyCanvas.width = filteredCanvas.width;
        copyCanvas.height = filteredCanvas.height;
        imgNode.setAttr("_filteredCanvas", copyCanvas);
      }
      const ctx2d = copyCanvas.getContext("2d");
      if (ctx2d) {
        ctx2d.clearRect(0, 0, copyCanvas.width, copyCanvas.height);
        ctx2d.drawImage(filteredCanvas, 0, 0);
      }
      imgNode.image(copyCanvas);

      imgNode.setAttr("_lastFilterKey", key);
      imgNode.setAttr("_lastFilterSource", usedSource);
      perfLog(`[perf:applyFilters] WebGL total: ${(performance.now() - t0).toFixed(2)}ms`);
      return;
    }
    perfLog("[perf:applyFilters] WebGL path: source is null, falling through to CPU");
  } else {
    perfLog("[perf:applyFilters] webgl is null, using CPU fallback");
  }

  // ── CPU fallback path ──
  const t1 = typeof window !== "undefined" ? performance.now() : 0;
  const presetOps = presetName ? (getPresetOps(presetName) ?? []) : [];

  // Reset the node's image back to the unfiltered source so the CPU chain never
  // double-filters a canvas left behind by a previous WebGL run.
  if (sourceImg && imgNode.image() !== sourceImg) {
    imgNode.image(sourceImg);
  }

  const runner: Filter = (imageData: ImageData): void => {
    applyFilterChain(imageData, values, presetOps);
  };
  imgNode.filters([runner]);

  if (imgNode.image()) {
    imgNode.cache();
  }

  imgNode.setAttr("_lastFilterKey", key);
  imgNode.setAttr("_lastFilterSource", sourceImg);
  perfLog(`[perf:applyFilters] CPU fallback total: ${(performance.now() - t1).toFixed(2)}ms`);
}
