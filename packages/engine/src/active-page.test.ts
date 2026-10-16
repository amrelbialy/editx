import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditxEngine } from "./editx-engine";

describe("active page validity after document commands", () => {
  let engine: EditxEngine;
  let firstPage: number;

  beforeEach(async () => {
    engine = new EditxEngine();
    await engine.scene.create();
    firstPage = engine.getActivePage()!;
  });

  it("reconciles a directly destroyed active page", () => {
    const removed = engine.scene.addPage();
    const callback = vi.fn();
    engine.onActivePageChanged(callback);

    engine.block.destroy(removed);

    expect(engine.getActivePage()).toBe(firstPage);
    expect(callback).toHaveBeenCalledExactlyOnceWith({
      pageId: firstPage,
      previousPageId: removed,
    });
  });

  it("reconciles an active page moved to another scene", () => {
    const moved = engine.scene.addPage();
    const otherScene = engine.block.create("scene");
    const callback = vi.fn();
    engine.onActivePageChanged(callback);

    engine.block.appendChild(otherScene, moved);

    expect(engine.getActivePage()).toBe(firstPage);
    expect(callback).toHaveBeenCalledExactlyOnceWith({
      pageId: firstPage,
      previousPageId: moved,
    });
  });

  it("keeps navigation valid when undo detaches a newly added active page", () => {
    const added = engine.scene.addPage();
    const callback = vi.fn();
    engine.onActivePageChanged(callback);

    engine.undo();

    expect(engine.scene.getPages()).toEqual([firstPage]);
    expect(engine.getActivePage()).toBe(firstPage);
    expect(callback).toHaveBeenCalledExactlyOnceWith({
      pageId: firstPage,
      previousPageId: added,
    });

    engine.redo();
    expect(engine.scene.getPages()).toEqual([firstPage, added]);
    expect(engine.scene.getPages()).toContain(engine.getActivePage());
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("keeps navigation valid when redo destroys the currently active page", () => {
    const removed = engine.scene.addPage();
    engine.block.destroy(removed);
    engine.undo();
    engine.setActivePage(removed);
    const callback = vi.fn();
    engine.onActivePageChanged(callback);

    engine.redo();

    expect(engine.getActivePage()).toBe(firstPage);
    expect(callback).toHaveBeenCalledExactlyOnceWith({
      pageId: firstPage,
      previousPageId: removed,
    });
  });

  it("publishes only the final navigation change after a document batch", () => {
    const previousPageId = engine.scene.addPage();
    const callback = vi.fn();
    engine.onActivePageChanged(callback);
    engine.beginBatch();
    engine.block.destroy(previousPageId);
    engine.block.destroy(firstPage);
    expect(callback).not.toHaveBeenCalled();

    engine.endBatch();

    expect(engine.getActivePage()).toBeNull();
    expect(callback).toHaveBeenCalledExactlyOnceWith({ pageId: null, previousPageId });
  });

  it("clears navigation when the active scene is destroyed", () => {
    const callback = vi.fn();
    engine.onActivePageChanged(callback);

    engine.block.destroy(engine.getActiveScene()!);

    expect(engine.getActiveScene()).toBeNull();
    expect(engine.getActivePage()).toBeNull();
    expect(callback).toHaveBeenCalledExactlyOnceWith({
      pageId: null,
      previousPageId: firstPage,
    });
  });
});
