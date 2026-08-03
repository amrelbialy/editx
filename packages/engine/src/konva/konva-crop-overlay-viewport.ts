import Konva from "konva";
import type { CropRect } from "../utils/crop-math";
import {
  absBoxToWorld,
  type Box,
  cropBoundBoxFunc,
  worldBoxToAbs,
} from "./konva-crop-overlay-layout";

/** Full anchor set for the crop transformer (all edges + corners). */
export const CROP_ANCHORS_ALL = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "middle-left",
  "middle-right",
  "top-center",
  "bottom-center",
];

/** Corner-only anchor set, used when a fixed aspect ratio is enforced. */
export const CROP_ANCHORS_CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"];

/**
 * Build the crop transformer's `boundBoxFunc`.
 *
 * Konva feeds `boundBoxFunc` absolute/stage-space boxes, but `imageRect` and the
 * cutout live in the overlay's world space (the uiLayer is zoom-scaled). This
 * converts incoming boxes → world, clamps, then converts the result back → abs.
 */
export function makeCropBoundBoxFunc(
  layer: Konva.Layer,
  getImageRect: () => CropRect,
  getRatio: () => number | null,
): (oldBox: Box, newBox: Box) => Box {
  return (oldBox, newBox) => {
    const scale = layer.scaleX() || 1;
    const pan = layer.position();
    const world = cropBoundBoxFunc(
      getImageRect(),
      getRatio(),
      absBoxToWorld(oldBox, scale, pan),
      absBoxToWorld(newBox, scale, pan),
    );
    return worldBoxToAbs(world, scale, pan);
  };
}

/** Create the styled crop transformer with the supplied bound-box constraint. */
export function createCropTransformer(
  boundBoxFunc: (oldBox: Box, newBox: Box) => Box,
): Konva.Transformer {
  return new Konva.Transformer({
    rotateEnabled: false,
    flipEnabled: false,
    centeredScaling: false,
    anchorSize: 12,
    anchorCornerRadius: 6,
    anchorStroke: "#2563eb",
    anchorFill: "#ffffff",
    anchorStrokeWidth: 2,
    borderStroke: "#2563eb",
    borderStrokeWidth: 2,
    keepRatio: false,
    enabledAnchors: CROP_ANCHORS_ALL,
    // Structurally identical Box shape; cast to satisfy Konva's exact type.
    boundBoxFunc: boundBoxFunc as Konva.TransformerConfig["boundBoxFunc"],
  });
}

/** Nodes whose stroke/handle sizes must stay screen-constant across zoom. */
export interface CropStrokeNodes {
  cutout: Konva.Rect;
  gridLines: Konva.Line[];
  transformer: Konva.Transformer;
}

/**
 * Counter-scale the cutout stroke, grid lines, and crop handles by 1/zoom so
 * they stay a constant on-screen size (the overlay lives on the zoom-scaled
 * uiLayer). Positions/bounds are unchanged.
 */
export function applyCropStrokeScale(zoom: number, nodes: CropStrokeNodes): void {
  const inv = 1 / (zoom || 1);
  nodes.cutout.strokeWidth(2 * inv);
  for (const line of nodes.gridLines) {
    line.strokeWidth(1 * inv);
  }
  nodes.transformer.anchorSize(12 * inv);
  nodes.transformer.anchorCornerRadius(6 * inv);
  nodes.transformer.anchorStrokeWidth(2 * inv);
  nodes.transformer.borderStrokeWidth(2 * inv);
}
