import Konva from "konva";
import type { BlockData, Color } from "../block/block.types";
import {
  CROP_ENABLED,
  CROP_FLIP_HORIZONTAL,
  CROP_FLIP_VERTICAL,
  CROP_HEIGHT,
  CROP_WIDTH,
  CROP_X,
  CROP_Y,
  FILL_COLOR,
  IMAGE_ORIGINAL_HEIGHT,
  IMAGE_ORIGINAL_WIDTH,
  IMAGE_ROTATION,
  IMAGE_SRC,
  OPACITY,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  VISIBLE,
} from "../block/property-keys";
import { colorToHex } from "../utils/color";
import { loadImage } from "../utils/image-loader";
import { applyFilters } from "./konva-node-filters";
import type { WebGLFilterRenderer } from "./webgl-filter-renderer";

export function createPageNode(id: number): Konva.Group {
  const group = new Konva.Group({
    name: `block-${id}`,
    draggable: false,
  });
  group.setAttr("blockId", id);
  group.setAttr("isPage", true);

  const bgRect = new Konva.Rect({
    name: "page-bg",
    fill: "#ffffff",
    listening: true,
  });
  bgRect.setAttr("isPageBackground", true);
  group.add(bgRect);

  const bgImg = new Konva.Image({
    name: "page-img",
    image: undefined as unknown as CanvasImageSource,
    visible: false,
    listening: true,
  });
  bgImg.setAttr("isPageBackground", true);
  group.add(bgImg);

  return group;
}

export function updatePageNode(
  group: Konva.Group,
  block: BlockData,
  stage: Konva.Stage | null,
  webgl: WebGLFilterRenderer | null,
  resolveBlock?: (id: number) => BlockData | undefined,
): void {
  const props = block.properties;
  const pageW = (props[PAGE_WIDTH] as number) ?? 1080;
  const pageH = (props[PAGE_HEIGHT] as number) ?? 1080;
  const opacity = (props[OPACITY] as number) ?? 1;
  const visible = (props[VISIBLE] as boolean) ?? true;
  const src = (props[IMAGE_SRC] as string) ?? "";

  group.setAttrs({ x: 0, y: 0, opacity, visible });

  const bgRect = group.children[0] as Konva.Rect;
  const imgNode = group.children[1] as Konva.Image;

  if (src) {
    bgRect.visible(true);
    bgRect.fill("transparent");
    imgNode.visible(true);

    const imageRotation = (props[IMAGE_ROTATION] as number) ?? 0;
    const origW = (props[IMAGE_ORIGINAL_WIDTH] as number) ?? 0;
    const origH = (props[IMAGE_ORIGINAL_HEIGHT] as number) ?? 0;

    let sourceW: number;
    let sourceH: number;
    if (origW > 0 && origH > 0) {
      sourceW = origW;
      sourceH = origH;
    } else {
      const isSwapAngle = Math.abs(Math.round(imageRotation / 90)) % 2 === 1;
      sourceW = isSwapAngle ? pageH : pageW;
      sourceH = isSwapAngle ? pageW : pageH;
    }

    const cropEnabled = (props[CROP_ENABLED] as boolean) ?? false;
    const cropX = (props[CROP_X] as number) ?? 0;
    const cropY = (props[CROP_Y] as number) ?? 0;
    const cropW = (props[CROP_WIDTH] as number) ?? 0;
    const cropH = (props[CROP_HEIGHT] as number) ?? 0;
    const cropOverlayActive = group.getAttr("_cropOverlayActive") === true;
    const flipH = (props[CROP_FLIP_HORIZONTAL] as boolean) ?? false;
    const flipV = (props[CROP_FLIP_VERTICAL] as boolean) ?? false;

    if (cropOverlayActive) {
      imgNode.rotation(imageRotation);
      imgNode.scaleX(flipH ? -1 : 1);
      imgNode.scaleY(flipV ? -1 : 1);
    } else {
      if (cropEnabled && cropW > 0 && cropH > 0) {
        imgNode.crop({ x: cropX, y: cropY, width: cropW, height: cropH });
        imgNode.width(cropW);
        imgNode.height(cropH);
      } else {
        imgNode.crop({ x: 0, y: 0, width: 0, height: 0 });
        imgNode.width(sourceW);
        imgNode.height(sourceH);
      }

      const renderW = cropEnabled && cropW > 0 ? cropW : sourceW;
      const renderH = cropEnabled && cropH > 0 ? cropH : sourceH;

      imgNode.rotation(imageRotation);
      imgNode.scaleX(flipH ? -1 : 1);
      imgNode.scaleY(flipV ? -1 : 1);
      imgNode.offsetX(renderW / 2);
      imgNode.offsetY(renderH / 2);
      imgNode.x(pageW / 2);
      imgNode.y(pageH / 2);

      bgRect.width(pageW);
      bgRect.height(pageH);
    }

    if (imgNode.getAttr("loadedSrc") !== src) {
      imgNode.setAttr("loadedSrc", src);
      loadImage(src).then((htmlImg) => {
        imgNode.setAttr("_sourceImage", htmlImg);
        imgNode.image(htmlImg);
        if (imgNode.filters()?.length) {
          imgNode.cache();
        }
        stage?.batchDraw();
      });
    }

    applyFilters(imgNode, block, stage, webgl, resolveBlock);
  } else {
    imgNode.visible(false);
    bgRect.visible(true);
    bgRect.width(pageW);
    bgRect.height(pageH);
    const fillColor = props[FILL_COLOR];
    bgRect.fill(
      fillColor && typeof fillColor === "object" ? colorToHex(fillColor as Color) : "#ffffff",
    );
  }
}
