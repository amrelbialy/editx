import type Konva from "konva";
import type { Filter } from "konva/lib/Node";
import type { BlockData } from "../block/block.types";
import { applyFilterChain } from "./filters/cpu-chain";
import { getPresetOps } from "./filters/presets";
import {
  collectAdjustmentValues,
  collectFilterPresetName,
  resolveImageEffects,
} from "./konva-image-effects";
import type { FilterParams, WebGLFilterRenderer } from "./webgl-filter-renderer";

export { collectAdjustmentValues, collectFilterPresetName };

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
  const effects = resolveImageEffects(block, resolveBlock);
  const { values, presetName, hasEffective, key } = effects;

  const sourceImg = imgNode.getAttr("_sourceImage") as HTMLImageElement | undefined;

  // ── Dirty check: skip when nothing that affects the pixels changed ──
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
