import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BlockData } from "./block/block.types";
import { CROP_X, IMAGE_SRC } from "./block/property-keys";
import { EditxEngine } from "./editx-engine";

function snapshot(engine: EditxEngine) {
  const scene = JSON.parse(engine.scene.saveToString()) as {
    blocks: BlockData[];
    activeSceneId: number | null;
    activePageId: number | null;
  };
  scene.blocks.sort((a, b) => a.id - b.id);
  return scene;
}

describe("atomic page history", () => {
  let engine: EditxEngine;
  let firstPage: number;

  beforeEach(async () => {
    engine = new EditxEngine();
    await engine.scene.create({ width: 800, height: 600 });
    firstPage = engine.getActivePage()!;
  });

  it("adds defaults, attaches and activates in one reversible history entry", () => {
    const before = snapshot(engine);
    const history = vi.fn();
    engine.onHistoryChanged(history);

    const added = engine.scene.addPage();
    const after = snapshot(engine);

    expect(engine.scene.getPages()).toEqual([firstPage, added]);
    expect(engine.block.getPageDimensions(added)).toEqual({ width: 800, height: 600 });
    expect(engine.getActivePage()).toBe(added);
    expect(history).toHaveBeenCalledTimes(1);
    engine.undo();
    expect(snapshot(engine)).toEqual(before);
    expect(engine.block.exists(added)).toBe(false);
    expect(engine.canUndo()).toBe(false);
    expect(engine.canRedo()).toBe(true);
    engine.redo();
    expect(snapshot(engine)).toEqual(after);
    expect(engine.canRedo()).toBe(false);
    expect(history).toHaveBeenCalledTimes(3);
  });

  it("creates and replays a page in an empty active scene", () => {
    engine.block.destroy(firstPage);
    engine.clearHistory();
    const before = snapshot(engine);
    const added = engine.scene.addPage({ width: 320, height: 240 });
    expect(engine.block.getPageDimensions(added)).toEqual({ width: 320, height: 240 });
    engine.undo();
    expect(snapshot(engine)).toEqual(before);
    expect(engine.getActivePage()).toBeNull();
    expect(engine.canUndo()).toBe(false);
    engine.redo();
    expect(engine.scene.getPages()).toEqual([added]);
    expect(engine.getActivePage()).toBe(added);
  });

  it("restores removed nested content, sub-blocks, page properties and page order", () => {
    const removed = engine.scene.addPage({ width: 500, height: 700 });
    const last = engine.scene.addPage();
    engine.scene.setActivePage(removed);
    engine.block.setName(removed, "Campaign");
    engine.block.setPageFillColor(removed, { r: 0.2, g: 0.4, b: 0.6, a: 1 });
    const image = engine.block.create("image");
    engine.block.appendChild(removed, image);
    engine.block.setString(image, IMAGE_SRC, "/photo.png");
    engine.block.setFloat(image, CROP_X, 12);
    const text = engine.block.create("text");
    engine.block.appendChild(removed, text);
    engine.block.setString(text, "text/content", "Nested content");
    const graphic = engine.block.create("graphic");
    engine.block.appendChild(removed, graphic);
    const shape = engine.block.createShape("rect");
    engine.block.setShape(graphic, shape);
    const fill = engine.block.createFill("color");
    engine.block.setFill(graphic, fill);
    const effect = engine.block.createEffect("adjustments");
    engine.block.appendEffect(graphic, effect);
    engine.block.setFloat(effect, "effect/adjustments/brightness", 0.3);
    const inner = engine.block.group([text, graphic]);
    const outer = engine.block.group([image, inner]);
    engine.block.select(text);
    engine.clearHistory();
    const before = snapshot(engine);
    const history = vi.fn();
    engine.onHistoryChanged(history);

    engine.scene.removePage(removed);
    const after = snapshot(engine);

    expect(engine.scene.getPages()).toEqual([firstPage, last]);
    expect(engine.getActivePage()).toBe(firstPage);
    for (const id of [removed, image, text, graphic, shape, fill, effect, inner, outer]) {
      expect(engine.block.exists(id)).toBe(false);
    }
    expect(engine.block.findAllSelected()).toEqual([]);
    expect(history).toHaveBeenCalledTimes(1);
    for (let cycle = 0; cycle < 3; cycle++) {
      engine.undo();
      expect(snapshot(engine)).toEqual(before);
      expect(engine.scene.getPages()).toEqual([firstPage, removed, last]);
      expect(engine.getActivePage()).toBe(removed);
      expect(engine.canUndo()).toBe(false);
      engine.redo();
      expect(snapshot(engine)).toEqual(after);
      expect(engine.canRedo()).toBe(false);
    }
  });

  it("does not override later navigation when undoing a non-active removal", () => {
    const second = engine.scene.addPage();
    const third = engine.scene.addPage();
    engine.clearHistory();
    engine.scene.removePage(firstPage);
    engine.scene.setActivePage(second);
    const callback = vi.fn();
    engine.onActivePageChanged(callback);

    engine.undo();
    expect(engine.scene.getPages()).toEqual([firstPage, second, third]);
    expect(engine.getActivePage()).toBe(second);
    engine.redo();
    expect(engine.scene.getPages()).toEqual([second, third]);
    expect(engine.getActivePage()).toBe(second);
    expect(callback).not.toHaveBeenCalled();
  });

  it("restores recorded active-page removal navigation despite later switches", () => {
    const removed = engine.scene.addPage();
    const third = engine.scene.addPage();
    engine.scene.setActivePage(removed);
    engine.clearHistory();
    engine.scene.removePage(removed);
    engine.scene.setActivePage(third);

    engine.undo();
    expect(engine.getActivePage()).toBe(removed);
    engine.scene.setActivePage(third);
    engine.redo();
    expect(engine.getActivePage()).toBe(firstPage);
  });

  it("restores recorded creation navigation despite later switches", () => {
    const second = engine.scene.addPage();
    engine.clearHistory();
    const added = engine.scene.addPage();
    engine.scene.setActivePage(firstPage);

    engine.undo();
    expect(engine.getActivePage()).toBe(second);
    expect(engine.block.exists(added)).toBe(false);
    engine.scene.setActivePage(firstPage);
    engine.redo();
    expect(engine.getActivePage()).toBe(added);
  });
});
