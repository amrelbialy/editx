import type Konva from "konva";
import type { CropRect } from "../utils/crop-math";
import { clampCutoutPosition, normalizeCutoutTransform } from "./konva-crop-overlay-layout";

interface CropOverlayEventOptions {
  cutout: Konva.Rect;
  transformer: Konva.Transformer;
  layer: Konva.Layer;
  getImageRect: () => CropRect;
  getRatio: () => number | null;
  updateLayout: () => void;
  onChange?: (rect: CropRect) => void;
  onLiveUpdate?: (rect: CropRect) => void;
}

function getRect(cutout: Konva.Rect): CropRect {
  return {
    x: cutout.x(),
    y: cutout.y(),
    width: cutout.width() * cutout.scaleX(),
    height: cutout.height() * cutout.scaleY(),
  };
}

export function bindCropOverlayEvents(options: CropOverlayEventOptions): () => void {
  const { cutout, transformer, layer } = options;
  const dragMove = () => {
    const rect = getRect(cutout);
    const clamped = clampCutoutPosition(
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      options.getImageRect(),
    );
    if (rect.x !== clamped.x || rect.y !== clamped.y) cutout.setAttrs(clamped);
    options.updateLayout();
    options.onLiveUpdate?.(getRect(cutout));
  };
  const transformEnd = () => {
    const rect = getRect(cutout);
    const result = normalizeCutoutTransform(
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      options.getImageRect(),
      options.getRatio(),
    );
    cutout.setAttrs({ ...result, scaleX: 1, scaleY: 1 });
    options.updateLayout();
    options.onLiveUpdate?.(getRect(cutout));
    transformer.forceUpdate();
    layer.batchDraw();
    options.onChange?.(getRect(cutout));
  };

  cutout.on("dragmove", dragMove);
  cutout.on("dragend", () => {
    dragMove();
    options.onChange?.(getRect(cutout));
  });
  cutout.on("transform", options.updateLayout);
  cutout.on("transformend", transformEnd);
  return () => cutout.off("dragmove dragend transform transformend");
}
