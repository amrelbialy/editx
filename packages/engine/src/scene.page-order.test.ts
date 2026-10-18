import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import type { BlockData } from "./block/block.types";
import { MoveChildCommand } from "./controller/commands/move-child-command";
import { EditxEngine } from "./editx-engine";

function snapshot(engine: EditxEngine) {
  const scene = JSON.parse(engine.scene.saveToString()) as { blocks: BlockData[] };
  scene.blocks.sort((a, b) => a.id - b.id);
  return scene;
}

describe("page ordering", () => {
  let engine: EditxEngine;
  let pages: number[];
  let renderer: ReturnType<typeof createMockRenderer>;

  beforeEach(async () => {
    renderer = createMockRenderer();
    renderer.syncChildOrder = vi.fn();
    engine = new EditxEngine({ renderer });
    await engine.scene.create({ width: 800, height: 600 });
    pages = [
      engine.getActivePage()!,
      engine.scene.addPage({ width: 300, height: 700 }),
      engine.scene.addPage({ width: 400, height: 500 }),
    ];
    engine.scene.setActivePage(pages[1]);
    engine.clearHistory();
  });

  it("moves in one history entry and replays exact content, selection and root node order", () => {
    const text = engine.block.create("text");
    engine.block.appendChild(pages[1], text);
    engine.block.setName(text, "Selected text");
    engine.block.select(text);
    engine.clearHistory();
    const before = snapshot(engine);
    const history = vi.fn();
    const navigation = vi.fn();
    engine.onHistoryChanged(history);
    engine.onActivePageChanged(navigation);
    vi.mocked(renderer.syncChildOrder!).mockClear();
    vi.mocked(renderer.renderFrame).mockClear();
    vi.mocked(renderer.panTo).mockClear();
    vi.mocked(renderer.setZoom).mockClear();

    engine.scene.movePage(pages[0], 2);
    const expected = [pages[1], pages[2], pages[0]];
    const after = snapshot(engine);
    expect(engine.scene.getPages()).toEqual(expected);
    expect(after.blocks.filter((block) => block.type !== "scene")).toEqual(
      before.blocks.filter((block) => block.type !== "scene"),
    );
    expect(history).toHaveBeenCalledTimes(1);
    expect(renderer.syncChildOrder).toHaveBeenLastCalledWith(expected);
    expect(renderer.renderFrame).toHaveBeenCalledTimes(1);

    for (let cycle = 0; cycle < 3; cycle++) {
      engine.undo();
      expect(snapshot(engine)).toEqual(before);
      expect(renderer.syncChildOrder).toHaveBeenLastCalledWith(pages);
      expect(engine.canUndo()).toBe(false);
      engine.redo();
      expect(snapshot(engine)).toEqual(after);
      expect(renderer.syncChildOrder).toHaveBeenLastCalledWith(expected);
      expect(engine.canRedo()).toBe(false);
    }
    expect(engine.getActivePage()).toBe(pages[1]);
    expect(engine.block.findAllSelected()).toEqual([text]);
    expect(navigation).not.toHaveBeenCalled();
    expect(renderer.panTo).not.toHaveBeenCalled();
    expect(renderer.setZoom).not.toHaveBeenCalled();
  });

  it.each([
    [2, 0, [2, 0, 1]],
    [1, 0, [1, 0, 2]],
    [1, 2, [0, 2, 1]],
    [0, 1, [1, 0, 2]],
  ] as const)("moves page %i to its final page-relative index %i", (source, index, order) => {
    engine.scene.movePage(pages[source], index);
    expect(engine.scene.getPages()).toEqual(order.map((position) => pages[position]));
  });

  it("clamps integral indices to the first and last page", () => {
    engine.scene.movePage(pages[1], -100);
    expect(engine.scene.getPages()).toEqual([pages[1], pages[0], pages[2]]);
    engine.scene.movePage(pages[1], 100);
    expect(engine.scene.getPages()).toEqual([pages[0], pages[2], pages[1]]);
  });

  it("never overwrites later valid navigation on undo or redo", () => {
    engine.scene.movePage(pages[0], 2);
    engine.scene.setActivePage(pages[0]);
    engine.undo();
    expect(engine.getActivePage()).toBe(pages[0]);
    engine.scene.setActivePage(pages[2]);
    engine.redo();
    expect(engine.getActivePage()).toBe(pages[2]);
  });

  it("permutes page slots while keeping all non-page scene children in place", () => {
    const sceneId = engine.getActiveScene()!;
    const extras: number[] = [];
    for (const index of [0, 2, 4, 6]) {
      const text = engine.block.create("text");
      extras.push(text);
      engine.block.appendChild(sceneId, text);
      engine.exec(new MoveChildCommand(engine._getBlockStore(), sceneId, text, index));
    }
    engine.clearHistory();
    const before = engine.block.getChildren(sceneId);
    engine.scene.movePage(pages[2], 0);
    const expected = [extras[0], pages[2], extras[1], pages[0], extras[2], pages[1], extras[3]];
    expect(engine.block.getChildren(sceneId)).toEqual(expected);
    expect(renderer.syncChildOrder).toHaveBeenLastCalledWith(expected);
    expect(engine.scene.getPages()).toEqual([pages[2], pages[0], pages[1]]);
    engine.undo();
    expect(engine.block.getChildren(sceneId)).toEqual(before);
    engine.redo();
    expect(engine.block.getChildren(sceneId)).toEqual(expected);
  });

  it("restores mixed scene-child order after all renderer nodes are loaded", async () => {
    const sceneId = engine.getActiveScene()!;
    const text = engine.block.create("text");
    engine.block.appendChild(sceneId, text);
    engine.exec(new MoveChildCommand(engine._getBlockStore(), sceneId, text, 1));
    engine.scene.movePage(pages[2], 0);
    const restoredRenderer = createMockRenderer();
    restoredRenderer.syncChildOrder = vi.fn();
    const restored = new EditxEngine({ renderer: restoredRenderer });
    await restored.scene.loadFromString(engine.scene.saveToString());
    expect(snapshot(restored)).toEqual(snapshot(engine));
    expect(restored.scene.getPages()).toEqual([pages[2], pages[0], pages[1]]);
    const expected = [pages[2], text, pages[0], pages[1]];
    expect(restored.block.getChildren(sceneId)).toEqual(expected);
    expect(restoredRenderer.syncChildOrder).toHaveBeenCalledExactlyOnceWith(expected);
    expect(vi.mocked(restoredRenderer.syncBlock).mock.invocationCallOrder.at(-1)).toBeLessThan(
      vi.mocked(restoredRenderer.syncChildOrder).mock.invocationCallOrder[0],
    );
  });
});
