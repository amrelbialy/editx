import type { EngineCore } from "../engine-core";
import type { EffectType, FillType, ShapeType } from "./block.types";
import type { BlockAPI } from "./block-api";
import * as H from "./block-api-helpers";
import type { BlockStore } from "./block-store";
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

function copyProperties(
  api: BlockAPI,
  store: BlockStore,
  sourceId: number,
  targetId: number,
): void {
  for (const key of store.findAllProperties(sourceId)) {
    const value = api.getProperty(sourceId, key);
    if (value !== undefined) api.setProperty(targetId, key, structuredClone(value));
  }
}

function cloneBlockTree(
  api: BlockAPI,
  store: BlockStore,
  sourceId: number,
  positionOffset: number,
): number {
  const sourceBlock = store.get(sourceId);
  if (!sourceBlock) throw new Error(`Block ${sourceId} not found`);

  const newId = api.create(sourceBlock.type);
  api.setKind(newId, sourceBlock.kind);
  api.setName(newId, sourceBlock.name);
  copyProperties(api, store, sourceId, newId);

  const position = api.getPosition(sourceId);
  api.setPosition(newId, position.x + positionOffset, position.y + positionOffset);

  if (sourceBlock.shapeId != null) {
    const srcShape = store.get(sourceBlock.shapeId);
    if (srcShape) {
      const newShapeId = api.createShape(srcShape.kind as ShapeType);
      copyProperties(api, store, sourceBlock.shapeId, newShapeId);
      api.setShape(newId, newShapeId);
    }
  }

  if (sourceBlock.fillId != null) {
    const srcFill = store.get(sourceBlock.fillId);
    if (srcFill) {
      const newFillId = api.createFill(srcFill.kind as FillType);
      copyProperties(api, store, sourceBlock.fillId, newFillId);
      api.setFill(newId, newFillId);
    }
  }

  for (const effectId of sourceBlock.effectIds) {
    const srcEffect = store.get(effectId);
    if (srcEffect) {
      const newEffectId = api.createEffect(srcEffect.kind as EffectType);
      copyProperties(api, store, effectId, newEffectId);
      api.appendEffect(newId, newEffectId);
    }
  }

  for (const childId of sourceBlock.children) {
    api.appendChild(newId, cloneBlockTree(api, store, childId, 0));
  }

  return newId;
}

/** Deep-duplicate a block (including sub-blocks) and offset by 20px. */
export function duplicateBlock(api: BlockAPI, engine: EngineCore, blockId: number): number {
  const parentId = api.getParent(blockId);
  if (parentId === null) throw new Error(`Block ${blockId} has no parent`);
  const store = engine._getBlockStore();

  engine.beginBatch();
  const newId = cloneBlockTree(api, store, blockId, 20);
  api.appendChild(parentId, newId);
  api.select(newId);
  engine.endBatch();
  return newId;
}
