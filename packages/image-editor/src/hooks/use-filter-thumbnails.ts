import { FILTER_PRESETS, loadImage } from "@editx/engine";
import { useEffect, useRef, useState } from "react";
import { useImageEditorStore } from "../store/image-editor-store";

const THUMB_WIDTH = 240;
const THUMB_HEIGHT = 48;

export interface FilterThumbnail {
  name: string;
  label: string;
  dataUrl: string;
}

/**
 * Generates small preview thumbnails with each filter preset applied.
 * Computes once when the source image changes, caches via dataURL strings.
 */
export function useFilterThumbnails(): FilterThumbnail[] | null {
  const originalImage = useImageEditorStore((s) => s.originalImage);
  const [thumbnails, setThumbnails] = useState<FilterThumbnail[] | null>(null);
  const lastSrcRef = useRef<string | null>(null);

  useEffect(() => {
    if (!originalImage?.src || originalImage.src === lastSrcRef.current) return;
    lastSrcRef.current = originalImage.src;

    let cancelled = false;

    generateThumbnails(originalImage.src).then((result) => {
      if (!cancelled) setThumbnails(result);
    });

    return () => {
      cancelled = true;
    };
  }, [originalImage?.src]);

  return thumbnails;
}

async function generateThumbnails(src: string): Promise<FilterThumbnail[]> {
  const img = await loadImage(src);

  // Fixed strip dimensions — cover-crop the image to fill
  const thumbW = THUMB_WIDTH;
  const thumbH = THUMB_HEIGHT;

  // Compute cover-crop source rect (center crop)
  const imgRatio = img.width / img.height;
  const stripRatio = thumbW / thumbH;
  let sx: number;
  let sy: number;
  let sw: number;
  let sh: number;
  if (imgRatio > stripRatio) {
    sh = img.height;
    sw = img.height * stripRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = img.width / stripRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }

  // Draw cover-cropped source into an offscreen canvas once
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = thumbW;
  sourceCanvas.height = thumbH;
  const sourceCtx = sourceCanvas.getContext("2d")!;
  sourceCtx.drawImage(img, sx, sy, sw, sh, 0, 0, thumbW, thumbH);
  const baseImageData = sourceCtx.getImageData(0, 0, thumbW, thumbH);

  // Generate "Original" thumbnail (no filter)
  const results: FilterThumbnail[] = [
    { name: "", label: "Original", dataUrl: sourceCanvas.toDataURL("image/jpeg", 0.7) },
  ];

  // Apply each filter to a clone of the base image data
  const workCanvas = document.createElement("canvas");
  workCanvas.width = thumbW;
  workCanvas.height = thumbH;
  const workCtx = workCanvas.getContext("2d")!;

  for (const [name, info] of FILTER_PRESETS) {
    const clone = new ImageData(new Uint8ClampedArray(baseImageData.data), thumbW, thumbH);
    info.filter(clone);
    workCtx.putImageData(clone, 0, 0);
    results.push({
      name,
      label: info.label,
      dataUrl: workCanvas.toDataURL("image/jpeg", 0.7),
    });
  }

  return results;
}
