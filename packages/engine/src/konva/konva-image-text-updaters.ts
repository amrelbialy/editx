import type Konva from "konva";
import type { BlockData, Color, TextRun } from "../block/block.types";
import {
  CROP_ENABLED,
  CROP_FLIP_HORIZONTAL,
  CROP_FLIP_VERTICAL,
  CROP_HEIGHT,
  CROP_WIDTH,
  CROP_X,
  CROP_Y,
  FILL_COLOR,
  FILL_ENABLED,
  FILL_SOLID_COLOR,
  FONT_FAMILY,
  FONT_SIZE,
  IMAGE_SRC,
  SHADOW_BLUR,
  SHADOW_COLOR,
  SHADOW_ENABLED,
  SHADOW_OFFSET_X,
  SHADOW_OFFSET_Y,
  TEXT_ALIGN,
  TEXT_AUTO_HEIGHT,
  TEXT_CONTENT,
  TEXT_LINE_HEIGHT,
  TEXT_PADDING,
  TEXT_RUNS,
  TEXT_VERTICAL_ALIGN,
  TEXT_WRAP,
} from "../block/property-keys";
import { colorToHex } from "../utils/color";
import { loadImage } from "../utils/image-loader";
import type { FormattedText } from "./formatted-text";
import { applyFilters } from "./konva-node-filters";
import type { WebGLFilterRenderer } from "./webgl-filter-renderer";

export function updateImageNode(
  imgNode: Konva.Image,
  props: Record<string, unknown>,
  width: number,
  height: number,
  stage: Konva.Stage | null,
  webgl: WebGLFilterRenderer | null,
  block?: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
): void {
  const cropEnabled = (props[CROP_ENABLED] as boolean) ?? false;
  const cropX = (props[CROP_X] as number) ?? 0;
  const cropY = (props[CROP_Y] as number) ?? 0;
  const cropW = (props[CROP_WIDTH] as number) ?? 0;
  const cropH = (props[CROP_HEIGHT] as number) ?? 0;

  if (cropEnabled && cropW > 0 && cropH > 0) {
    imgNode.width(width);
    imgNode.height(height);
    imgNode.crop({ x: cropX, y: cropY, width: cropW, height: cropH });
  } else {
    imgNode.width(width);
    imgNode.height(height);
    imgNode.crop({ x: 0, y: 0, width: 0, height: 0 });
  }

  const flipH = (props[CROP_FLIP_HORIZONTAL] as boolean) ?? false;
  const flipV = (props[CROP_FLIP_VERTICAL] as boolean) ?? false;
  imgNode.scaleX(flipH ? -1 : 1);
  imgNode.scaleY(flipV ? -1 : 1);
  if (flipH) imgNode.offsetX(width);
  else imgNode.offsetX(0);
  if (flipV) imgNode.offsetY(height);
  else imgNode.offsetY(0);

  const src = (props[IMAGE_SRC] as string) ?? "";
  if (src && imgNode.getAttr("loadedSrc") !== src) {
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

  if (block) {
    applyFilters(imgNode, block, stage, webgl, resolveBlock);
  }
}

export function updateTextNode(
  textNode: FormattedText,
  props: Record<string, unknown>,
  width: number,
  height: number,
  block?: BlockData,
  resolveBlock?: (id: number) => BlockData | undefined,
  resolveText?: (text: string) => string,
): { computedHeight: number | null } {
  let runs = props[TEXT_RUNS] as TextRun[] | undefined;
  if (!runs || !Array.isArray(runs) || runs.length === 0) {
    const text = (props[TEXT_CONTENT] as string) ?? "Text";
    const fillColor = props[FILL_COLOR];
    const fill =
      fillColor && typeof fillColor === "object" ? colorToHex(fillColor as Color) : "#000000";
    runs = [
      {
        text,
        style: {
          fontSize: (props[FONT_SIZE] as number) ?? 24,
          fontFamily: (props[FONT_FAMILY] as string) ?? "Arial",
          fill,
        },
      },
    ];
  }
  if (resolveText) {
    runs = runs.map((run) => ({ ...run, text: resolveText(run.text) }));
  }
  textNode.textRuns(runs);
  textNode.width(width);
  textNode.align((props[TEXT_ALIGN] as string) ?? "left");
  textNode.lineHeight((props[TEXT_LINE_HEIGHT] as number) ?? 1.2);
  textNode.verticalAlign((props[TEXT_VERTICAL_ALIGN] as string) ?? "top");
  textNode.padding((props[TEXT_PADDING] as number) ?? 0);
  textNode.wrap((props[TEXT_WRAP] as string) ?? "word");

  let bgFill = "";
  const fillEnabled = (props[FILL_ENABLED] as boolean) ?? false;
  if (fillEnabled) {
    let bgColor: Color | undefined;
    if (block?.fillId != null && resolveBlock) {
      const fillBlock = resolveBlock(block.fillId);
      if (fillBlock) {
        const c = fillBlock.properties[FILL_SOLID_COLOR];
        if (c && typeof c === "object") bgColor = c as Color;
      }
    }
    if (!bgColor) {
      const fc = props[FILL_COLOR];
      if (fc && typeof fc === "object") bgColor = fc as Color;
    }
    if (bgColor) bgFill = colorToHex(bgColor);
  }
  textNode.setAttr("backgroundFill", bgFill);

  const shadowEnabled = (props[SHADOW_ENABLED] as boolean) ?? false;
  if (shadowEnabled) {
    const sc = props[SHADOW_COLOR];
    textNode.shadowColor(
      sc && typeof sc === "object" ? colorToHex(sc as Color) : "rgba(0,0,0,0.5)",
    );
    textNode.shadowOffsetX((props[SHADOW_OFFSET_X] as number) ?? 4);
    textNode.shadowOffsetY((props[SHADOW_OFFSET_Y] as number) ?? 4);
    textNode.shadowBlur((props[SHADOW_BLUR] as number) ?? 8);
    textNode.shadowEnabled(true);
    textNode.shadowForStrokeEnabled(false);
  } else {
    textNode.shadowEnabled(false);
  }

  const autoHeight = (props[TEXT_AUTO_HEIGHT] as boolean) ?? true;
  if (autoHeight) {
    const computed = textNode.getComputedHeight();
    textNode.height(Math.max(computed, 10));
    return { computedHeight: computed };
  }
  textNode.height(height);
  return { computedHeight: null };
}
