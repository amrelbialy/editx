import type { EngineCore } from "../engine-core";
import type { EffectType, FillType, ShapeType } from "./block.types";
import type { BlockAPI } from "./block-api";
import * as H from "./block-api-helpers";
import { IMAGE_ORIGINAL_HEIGHT, IMAGE_ORIGINAL_WIDTH, IMAGE_SRC } from "./property-keys";

/** Add an image block as a child of `parentId`. */
export function addImageBlock(
  api: BlockAPI,
  engine: EngineCore,
  parentId: number,
  src: string,
  x: number,
  y: number,
  width: number,
  height: number,
  originalWidth: number,
  originalHeight: number,
): number {
  engine.beginBatch();
  const imageId = api.create("image");
  api.setPosition(imageId, x, y);
  api.setSize(imageId, width, height);
  H.setString(engine, imageId, IMAGE_SRC, src);
  H.setFloat(engine, imageId, IMAGE_ORIGINAL_WIDTH, originalWidth);
  H.setFloat(engine, imageId, IMAGE_ORIGINAL_HEIGHT, originalHeight);
  api.appendChild(parentId, imageId);
  engine.endBatch();
  return imageId;
}

/** Deep-duplicate a block (including sub-blocks) and offset by 20px. */
export function duplicateBlock(api: BlockAPI, engine: EngineCore, blockId: number): number {
  const parentId = api.getParent(blockId);
  if (parentId === null) throw new Error(`Block ${blockId} has no parent`);
  const store = engine.getBlockStore();
  const sourceBlock = store.get(blockId);
  if (!sourceBlock) throw new Error(`Block ${blockId} not found`);

  engine.beginBatch();
  const newId = api.create(sourceBlock.type);
  api.setKind(newId, sourceBlock.kind);

  const allKeys = store.findAllProperties(blockId);
  for (const key of allKeys) {
    const val = api.getProperty(blockId, key);
    if (val !== undefined) api.setProperty(newId, key, val);
  }

  const pos = api.getPosition(blockId);
  api.setPosition(newId, pos.x + 20, pos.y + 20);

  if (sourceBlock.shapeId != null) {
    const srcShape = store.get(sourceBlock.shapeId);
    if (srcShape) {
      const newShapeId = api.createShape(srcShape.kind as ShapeType);
      const shapeKeys = store.findAllProperties(sourceBlock.shapeId);
      for (const key of shapeKeys) {
        const val = api.getProperty(sourceBlock.shapeId, key);
        if (val !== undefined) api.setProperty(newShapeId, key, val);
      }
      api.setShape(newId, newShapeId);
    }
  }

  if (sourceBlock.fillId != null) {
    const srcFill = store.get(sourceBlock.fillId);
    if (srcFill) {
      const newFillId = api.createFill(srcFill.kind as FillType);
      const fillKeys = store.findAllProperties(sourceBlock.fillId);
      for (const key of fillKeys) {
        const val = api.getProperty(sourceBlock.fillId, key);
        if (val !== undefined) api.setProperty(newFillId, key, val);
      }
      api.setFill(newId, newFillId);
    }
  }

  for (const effectId of sourceBlock.effectIds) {
    const srcEffect = store.get(effectId);
    if (srcEffect) {
      const newEffectId = api.createEffect(srcEffect.kind as EffectType);
      const effectKeys = store.findAllProperties(effectId);
      for (const key of effectKeys) {
        const val = api.getProperty(effectId, key);
        if (val !== undefined) api.setProperty(newEffectId, key, val);
      }
      api.appendEffect(newId, newEffectId);
    }
  }

  api.appendChild(parentId, newId);
  api.select(newId);
  engine.endBatch();
  return newId;
}
