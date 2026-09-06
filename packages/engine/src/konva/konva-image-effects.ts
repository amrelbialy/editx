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

export interface ResolvedImageEffects {
  values: AdjustmentValues | null;
  presetName: string;
  hasEffective: boolean;
  key: string;
}

function isEffectEnabled(effectBlock: BlockData): boolean {
  return effectBlock.properties[EFFECT_ENABLED] !== false;
}

export function collectAdjustmentValues(
  block: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): AdjustmentValues | null {
  if (!resolveBlock || block.effectIds.length === 0) return null;

  for (const effectId of block.effectIds) {
    const effectBlock = resolveBlock(effectId);
    if (!effectBlock || effectBlock.kind !== "adjustments" || !isEffectEnabled(effectBlock)) {
      continue;
    }
    const properties = effectBlock.properties;
    return {
      brightness: (properties[EFFECT_ADJUSTMENTS_BRIGHTNESS] as number) ?? 0,
      saturation: (properties[EFFECT_ADJUSTMENTS_SATURATION] as number) ?? 0,
      contrast: (properties[EFFECT_ADJUSTMENTS_CONTRAST] as number) ?? 0,
      gamma: (properties[EFFECT_ADJUSTMENTS_GAMMA] as number) ?? 0,
      clarity: (properties[EFFECT_ADJUSTMENTS_CLARITY] as number) ?? 0,
      exposure: (properties[EFFECT_ADJUSTMENTS_EXPOSURE] as number) ?? 0,
      shadows: (properties[EFFECT_ADJUSTMENTS_SHADOWS] as number) ?? 0,
      highlights: (properties[EFFECT_ADJUSTMENTS_HIGHLIGHTS] as number) ?? 0,
      blacks: (properties[EFFECT_ADJUSTMENTS_BLACKS] as number) ?? 0,
      whites: (properties[EFFECT_ADJUSTMENTS_WHITES] as number) ?? 0,
      temperature: (properties[EFFECT_ADJUSTMENTS_TEMPERATURE] as number) ?? 0,
      sharpness: (properties[EFFECT_ADJUSTMENTS_SHARPNESS] as number) ?? 0,
    };
  }
  return null;
}

export function collectFilterPresetName(
  block: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): string {
  if (!resolveBlock || block.effectIds.length === 0) return "";

  for (const effectId of block.effectIds) {
    const effectBlock = resolveBlock(effectId);
    if (!effectBlock || effectBlock.kind !== "filter" || !isEffectEnabled(effectBlock)) continue;
    return (effectBlock.properties[EFFECT_FILTER_NAME] as string) ?? "";
  }
  return "";
}

export function resolveImageEffects(
  block: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): ResolvedImageEffects {
  const values = collectAdjustmentValues(block, resolveBlock);
  const presetName = collectFilterPresetName(block, resolveBlock);
  const hasEffective = (values != null && hasAnyAdjustment(values)) || presetName !== "";
  const effectiveValues = hasEffective ? values : null;
  const valueKey = effectiveValues
    ? `${effectiveValues.brightness},${effectiveValues.saturation},${effectiveValues.contrast},${effectiveValues.gamma},${effectiveValues.clarity},${effectiveValues.exposure},${effectiveValues.shadows},${effectiveValues.highlights},${effectiveValues.blacks},${effectiveValues.whites},${effectiveValues.temperature},${effectiveValues.sharpness}`
    : "";
  return { values, presetName, hasEffective, key: `${valueKey}|${presetName}` };
}

function toFilterParams(effects: ResolvedImageEffects): FilterParams {
  const values = effects.values;
  return {
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
    preset: effects.presetName,
  };
}

export function processImageSource(
  source: HTMLImageElement,
  effects: ResolvedImageEffects,
  webgl: WebGLFilterRenderer | null,
  ownedCanvas?: HTMLCanvasElement,
): HTMLImageElement | HTMLCanvasElement {
  if (!effects.hasEffective) return source;

  const width = source.naturalWidth || source.width || 1;
  const height = source.naturalHeight || source.height || 1;
  const canvas =
    ownedCanvas && ownedCanvas.width === width && ownedCanvas.height === height
      ? ownedCanvas
      : document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return source;

  context.clearRect(0, 0, width, height);
  if (webgl) {
    webgl.uploadImage(source, width, height);
    context.drawImage(webgl.render(toFilterParams(effects)), 0, 0);
    return canvas;
  }

  context.drawImage(source, 0, 0);
  const imageData = context.getImageData(0, 0, width, height);
  applyFilterChain(imageData, effects.values, getPresetOps(effects.presetName) ?? []);
  context.putImageData(imageData, 0, 0);
  return canvas;
}
