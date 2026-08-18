import Konva from "konva";
import type { CropRect } from "../utils/crop-math";
import {
  absBoxToWorld,
  type Box,
  cropBoundBoxFunc,
  worldBoxToAbs,
} from "./konva-crop-overlay-layout";
import { constrainBoxToPolygon } from "./konva-crop-overlay-polygon";

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
  isConstrained: () => boolean = () => true,
  getBlockImagePolygon: () => { x: number; y: number }[] | null = () => null,
): (oldBox: Box, newBox: Box) => Box {
  return (oldBox, newBox) => {
    if (!isConstrained()) {
      const minimum = 10 * (layer.scaleX?.() || 1);
      const polygon = getBlockImagePolygon();
      if (polygon) return constrainBoxToPolygon(oldBox, newBox, polygon, minimum);
      return Math.abs(newBox.width) < minimum || Math.abs(newBox.height) < minimum
        ? oldBox
        : newBox;
    }
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

/** Plain overlay shapes whose stroke must stay screen-constant across zoom. */
export interface CropStrokeNodes {
  cutout: Konva.Rect;
  gridLines: Konva.Line[];
}

/** The static (non-transformer) scene nodes that make up the crop overlay. */
export interface CropOverlayNodes {
  group: Konva.Group;
  visualGroup: Konva.Group;
  darkTop: Konva.Rect;
  darkBottom: Konva.Rect;
  darkLeft: Konva.Rect;
  darkRight: Konva.Rect;
  cutout: Konva.Rect;
  gridLines: Konva.Group;
}

/**
 * Build the crop overlay's scene nodes (the four dark mask rects, the draggable
 * cutout, and the rule-of-thirds grid) and assemble them into a hidden group.
 * The transformer is added by the overlay itself since it needs the boundBoxFunc.
 */
export function createCropOverlayNodes(): CropOverlayNodes {
  const group = new Konva.Group({ name: "crop-overlay", visible: false });
  const visualGroup = new Konva.Group();

  const darkFill = "rgba(0, 0, 0, 0.5)";
  const darkTop = new Konva.Rect({ fill: darkFill, listening: false });
  const darkBottom = new Konva.Rect({ fill: darkFill, listening: false });
  const darkLeft = new Konva.Rect({ fill: darkFill, listening: false });
  const darkRight = new Konva.Rect({ fill: darkFill, listening: false });

  const cutout = new Konva.Rect({
    fill: "transparent",
    stroke: "#ffffff",
    strokeWidth: 2,
    draggable: true,
    name: "crop-cutout",
    hitFunc: (ctx, shape) => {
      ctx.beginPath();
      ctx.rect(0, 0, shape.width(), shape.height());
      ctx.closePath();
      ctx.fillStrokeShape(shape);
    },
  });

  const gridLines = new Konva.Group({ listening: false });
  for (let i = 0; i < 4; i++) {
    gridLines.add(
      new Konva.Line({
        points: [0, 0, 0, 0],
        stroke: "rgba(255, 255, 255, 0.4)",
        strokeWidth: 1,
        listening: false,
      }),
    );
  }

  visualGroup.add(darkTop, darkBottom, darkLeft, darkRight, cutout, gridLines);
  group.add(visualGroup);
  return { group, visualGroup, darkTop, darkBottom, darkLeft, darkRight, cutout, gridLines };
}

/**
 * Counter-scale the cutout stroke and grid lines by 1/zoom so they stay a
 * constant on-screen size (they are plain shapes on the zoom-scaled uiLayer).
 *
 * The crop `Konva.Transformer` is deliberately left untouched: Konva already
 * neutralizes the layer zoom on transformers, so its anchors/border are screen-
 * constant with their base sizes. Positions/bounds are unchanged.
 */
export function applyCropStrokeScale(zoom: number, nodes: CropStrokeNodes): void {
  const inv = 1 / (zoom || 1);
  nodes.cutout.strokeWidth(2 * inv);
  for (const line of nodes.gridLines) {
    line.strokeWidth(1 * inv);
  }
}
