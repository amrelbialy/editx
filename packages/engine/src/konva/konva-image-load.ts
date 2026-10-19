import type Konva from "konva";
import { loadImage } from "../utils/image-loader";

/** Track decoding and processing together so exports can wait for the final pixels. */
export function loadNodeImage(
  node: Konva.Image,
  src: string,
  onLoaded: (image: HTMLImageElement) => void,
): void {
  node.setAttr("loadedSrc", src);
  node.setAttr("__pendingSrc", src);
  node.setAttr("__imageLoadError", undefined);
  const ready = loadImage(src)
    .then((image) => {
      if (node.getAttr("__pendingSrc") !== src || !node.getStage()) return;
      node.setAttr("_sourceImage", image);
      node.image(image);
      onLoaded(image);
    })
    .catch((error: unknown) => {
      if (node.getAttr("__pendingSrc") !== src) return;
      if (node.getAttr("loadedSrc") === src) node.setAttr("loadedSrc", undefined);
      node.setAttr("__imageLoadError", error);
      console.error(`[editx] Failed to load image: ${src}`, error);
    });
  node.setAttr("__imageReady", ready);
}
