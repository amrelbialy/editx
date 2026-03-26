import type { BlockStore } from "../block/block-store";
import {
  CROP_ENABLED,
  CROP_FLIP_HORIZONTAL,
  CROP_FLIP_VERTICAL,
  CROP_HEIGHT,
  CROP_WIDTH,
  CROP_X,
  CROP_Y,
  IMAGE_ORIGINAL_HEIGHT,
  IMAGE_ORIGINAL_WIDTH,
  IMAGE_ROTATION,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  SIZE_HEIGHT,
  SIZE_WIDTH,
} from "../block/property-keys";
import { SetPropertyCommand } from "../controller/commands";
import type { EngineCore } from "../engine-core";
import type { CropRect } from "../utils/crop-math";
import { normalizeRotation, visualCropToSource } from "../utils/rotation-math";

/** Reads the source (pre-rotation) image dimensions for a block. */
export function getBlockImageDimensions(
  store: BlockStore,
  blockId: number,
): { imgW: number; imgH: number } {
  const origW = store.getFloat(blockId, IMAGE_ORIGINAL_WIDTH);
  const origH = store.getFloat(blockId, IMAGE_ORIGINAL_HEIGHT);
  if (origW > 0 && origH > 0) return { imgW: origW, imgH: origH };

  const blockType = store.getType(blockId);
  if (blockType === "page") {
    return {
      imgW: store.getFloat(blockId, PAGE_WIDTH),
      imgH: store.getFloat(blockId, PAGE_HEIGHT),
    };
  }
  return { imgW: store.getFloat(blockId, SIZE_WIDTH), imgH: store.getFloat(blockId, SIZE_HEIGHT) };
}

/** Commit a visual crop rect to block properties. Returns null if unchanged. */
export function commitCropToBlock(
  engine: EngineCore,
  store: BlockStore,
  blockId: number,
  visualRect: CropRect,
  initialCropState: {
    enabled: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null,
): CropRect | null {
  const { imgW, imgH } = getBlockImageDimensions(store, blockId);
  const blockType = store.getType(blockId);

  const rotation = store.getFloat(blockId, IMAGE_ROTATION);
  const flipH = store.getBool(blockId, CROP_FLIP_HORIZONTAL);
  const flipV = store.getBool(blockId, CROP_FLIP_VERTICAL);
  const sourceRect = visualCropToSource(visualRect, imgW, imgH, rotation, flipH, flipV);

  if (initialCropState) {
    const EPS = 0.5;
    if (initialCropState.enabled) {
      const same =
        Math.abs(initialCropState.x - sourceRect.x) < EPS &&
        Math.abs(initialCropState.y - sourceRect.y) < EPS &&
        Math.abs(initialCropState.width - sourceRect.width) < EPS &&
        Math.abs(initialCropState.height - sourceRect.height) < EPS;
      if (same) return null;
    } else {
      const fullImage =
        Math.abs(sourceRect.x) < EPS &&
        Math.abs(sourceRect.y) < EPS &&
        Math.abs(sourceRect.width - imgW) < EPS &&
        Math.abs(sourceRect.height - imgH) < EPS;
      if (fullImage) return null;
    }
  }

  engine.beginBatch();
  engine.exec(new SetPropertyCommand(store, blockId, CROP_X, sourceRect.x));
  engine.exec(new SetPropertyCommand(store, blockId, CROP_Y, sourceRect.y));
  engine.exec(new SetPropertyCommand(store, blockId, CROP_WIDTH, sourceRect.width));
  engine.exec(new SetPropertyCommand(store, blockId, CROP_HEIGHT, sourceRect.height));
  engine.exec(new SetPropertyCommand(store, blockId, CROP_ENABLED, true));
  if (blockType === "page") {
    engine.exec(new SetPropertyCommand(store, blockId, PAGE_WIDTH, visualRect.width));
    engine.exec(new SetPropertyCommand(store, blockId, PAGE_HEIGHT, visualRect.height));
  }
  engine.endBatch();
  return visualRect;
}

/** Reset all crop properties for a block. Single undo batch. */
export function resetCropBlock(engine: EngineCore, store: BlockStore, blockId: number): void {
  const origW = store.getFloat(blockId, IMAGE_ORIGINAL_WIDTH);
  const origH = store.getFloat(blockId, IMAGE_ORIGINAL_HEIGHT);
  if (origW <= 0 || origH <= 0) return;

  engine.beginBatch();
  engine.exec(new SetPropertyCommand(store, blockId, CROP_X, 0));
  engine.exec(new SetPropertyCommand(store, blockId, CROP_Y, 0));
  engine.exec(new SetPropertyCommand(store, blockId, CROP_WIDTH, 0));
  engine.exec(new SetPropertyCommand(store, blockId, CROP_HEIGHT, 0));
  engine.exec(new SetPropertyCommand(store, blockId, CROP_ENABLED, false));

  const blockType = store.getType(blockId);
  if (blockType === "page") {
    const rotation = store.getFloat(blockId, IMAGE_ROTATION);
    const isSwap = Math.abs(Math.round(normalizeRotation(rotation) / 90)) % 2 === 1;
    engine.exec(new SetPropertyCommand(store, blockId, PAGE_WIDTH, isSwap ? origH : origW));
    engine.exec(new SetPropertyCommand(store, blockId, PAGE_HEIGHT, isSwap ? origW : origH));
  }
  engine.endBatch();
}
