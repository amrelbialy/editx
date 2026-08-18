import type Konva from "konva";
import type { KonvaCropOverlay } from "./konva-crop-overlay";
import {
  getImageFillCropLocalPointer,
  isImageFillCropDismissTarget,
} from "./konva-image-fill-crop-node";

export interface ImageFillCropInteraction {
  node: Konva.Shape;
  lastPoint: { x: number; y: number } | null;
  suppressNextClick: boolean;
  dismissed: boolean;
}

interface ImageFillCropEventOptions {
  stage: Konva.Stage;
  cropOverlay: KonvaCropOverlay;
  getActive: () => ImageFillCropInteraction | null;
  move: () => void;
  dismiss: () => void;
  setCursor: (cursor: string) => void;
}

export function bindImageFillCropEvents(
  node: Konva.Shape,
  options: ImageFillCropEventOptions,
): void {
  const { stage, cropOverlay, getActive, move, dismiss, setCursor } = options;
  node.on("mouseenter.imageFillCrop", () => setCursor("grab"));
  node.on("mouseleave.imageFillCrop", () => {
    if (!getActive()?.lastPoint) setCursor("");
  });
  node.on("mousedown.imageFillCrop touchstart.imageFillCrop", (event) => {
    const active = getActive();
    if (!active) return;
    event.cancelBubble = true;
    active.suppressNextClick = false;
    active.lastPoint = getImageFillCropLocalPointer(stage, active.node);
    setCursor("grabbing");
  });
  stage.on("mousemove.imageFillCrop touchmove.imageFillCrop", move);
  stage.on("mouseup.imageFillCrop touchend.imageFillCrop", () => {
    const active = getActive();
    if (!active?.lastPoint) return;
    active.lastPoint = null;
    setCursor("grab");
  });
  stage.on("click.imageFillCrop tap.imageFillCrop", (event) => {
    const active = getActive();
    if (!active || active.dismissed) return;
    if (active.suppressNextClick) {
      active.suppressNextClick = false;
      return;
    }
    if (!isImageFillCropDismissTarget(event.target)) return;
    const point = stage.getPointerPosition();
    if (point && cropOverlay.containsBlockPoint(point)) return;
    event.cancelBubble = true;
    active.dismissed = true;
    dismiss();
  });
}
