import { DuplicateBlockCommand } from "../controller/commands/duplicate-block-command";
import type { EngineCore } from "../engine-core";
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
  const command = new DuplicateBlockCommand(engine._getBlockStore(), blockId, 20);

  engine.beginBatch();
  try {
    engine.exec(command);
    const newId = command.getCreatedId()!;
    api.select(newId);
    return newId;
  } finally {
    engine.endBatch();
  }
}
