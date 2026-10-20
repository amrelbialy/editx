import { describe, expect, it, vi } from "vitest";
import type { KonvaRendererAdapter } from "./index";
import { createEngine } from "./index";

/**
 * WI-4: marquee selection must be *additive*, never toggling. These tests drive
 * the real `onBlockClick` wiring installed by {@link createEngine} (index.ts),
 * stubbing only the Konva-dependent transformer rendering so the pure selection
 * behaviour can be asserted through the public block API.
 */
async function makeEngineWithStubbedTransformer() {
  // `init()` only stashes the root element — no DOM/Konva stage is created until
  // `createScene`, which we never call, so a bare object is a safe container.
  const engine = await createEngine({ container: {} as unknown as HTMLElement });
  const adapter = engine.getRenderer() as unknown as KonvaRendererAdapter;
  // Selection changes call showTransformer/hideTransformer, which touch Konva
  // internals only initialised by createScene; stub them out.
  vi.spyOn(adapter, "showTransformer").mockImplementation(() => {});
  vi.spyOn(adapter, "hideTransformer").mockImplementation(() => {});
  vi.spyOn(adapter, "setGroupContext").mockImplementation(() => {});
  return { engine, adapter };
}

describe("createEngine onBlockClick — marquee selection", () => {
  it("activates a renderer-contacted page once without fitting or panning", async () => {
    const { engine, adapter } = await makeEngineWithStubbedTransformer();
    const scene = engine.block.create("scene");
    const first = engine.block.create("page");
    const second = engine.block.create("page");
    engine.block.appendChild(scene, first);
    engine.block.appendChild(scene, second);
    engine._setActiveSceneAndPage(scene, first);
    const pan = vi.spyOn(adapter, "panTo");
    const fit = vi.spyOn(adapter, "fitToRect");

    const changed = vi.fn();
    engine.onActivePageChanged(changed);
    adapter.onPagePointerDown?.(second);
    adapter.onPagePointerDown?.(second);

    expect(engine.getActivePage()).toBe(second);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(pan).not.toHaveBeenCalled();
    expect(fit).not.toHaveBeenCalled();
  });

  it("additive click keeps an already-selected block selected (never deselects)", async () => {
    const { engine, adapter } = await makeEngineWithStubbedTransformer();

    adapter.onBlockClick?.(1, { additive: true, shiftKey: false });
    expect(engine.block.isSelected(1)).toBe(true);

    // A second additive hit on the same block must NOT toggle it off.
    adapter.onBlockClick?.(1, { additive: true, shiftKey: false });
    expect(engine.block.isSelected(1)).toBe(true);
    expect(engine.block.findAllSelected()).toEqual([1]);
  });

  it("additive click adds unselected blocks to the current selection", async () => {
    const { engine, adapter } = await makeEngineWithStubbedTransformer();

    adapter.onBlockClick?.(1, { additive: true, shiftKey: false });
    adapter.onBlockClick?.(2, { additive: true, shiftKey: false });
    adapter.onBlockClick?.(3, { additive: true, shiftKey: false });

    expect(engine.block.findAllSelected().sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });

  it("shift-click (non-additive) still toggles a block's membership", async () => {
    const { engine, adapter } = await makeEngineWithStubbedTransformer();

    adapter.onBlockClick?.(1, { additive: false, shiftKey: true });
    expect(engine.block.isSelected(1)).toBe(true);

    // Toggling the same block off.
    adapter.onBlockClick?.(1, { additive: false, shiftKey: true });
    expect(engine.block.isSelected(1)).toBe(false);
    expect(engine.block.findAllSelected()).toEqual([]);
  });

  it("plain click replaces the selection with the clicked block", async () => {
    const { engine, adapter } = await makeEngineWithStubbedTransformer();

    adapter.onBlockClick?.(1, { additive: true, shiftKey: false });
    adapter.onBlockClick?.(2, { additive: true, shiftKey: false });

    // A plain (non-additive, non-shift) click selects only the clicked block.
    adapter.onBlockClick?.(3, { additive: false, shiftKey: false });
    expect(engine.block.findAllSelected()).toEqual([3]);
  });

  it("page click is exclusive, exits group context, and does not mutate history", async () => {
    const { engine, adapter } = await makeEngineWithStubbedTransformer();
    const page = engine.block.create("page");
    const group = engine.block.create("group");
    const artwork = engine.block.create("graphic");
    engine.clearHistory();
    engine.block.enterGroup(group);
    engine.block.select(artwork);
    const pan = vi.spyOn(adapter, "panTo");
    const fit = vi.spyOn(adapter, "fitToRect");

    adapter.onBlockClick?.(page, { additive: true, shiftKey: true, insideContext: false });

    expect(engine.block.findAllSelected()).toEqual([page]);
    expect(engine.block.getGroupContext()).toEqual([]);
    expect(engine.canUndo()).toBe(false);
    expect(pan).not.toHaveBeenCalled();
    expect(fit).not.toHaveBeenCalled();
  });

  it("shift-click artwork cannot mix it with a selected page", async () => {
    const { engine, adapter } = await makeEngineWithStubbedTransformer();
    const page = engine.block.create("page");
    const artwork = engine.block.create("graphic");
    engine.block.select(page);

    adapter.onBlockClick?.(artwork, { additive: false, shiftKey: true });

    expect(engine.block.findAllSelected()).toEqual([artwork]);
  });

  it("marquee drops page selection before accumulating artwork", async () => {
    const { engine, adapter } = await makeEngineWithStubbedTransformer();
    const page = engine.block.create("page");
    const first = engine.block.create("graphic");
    const second = engine.block.create("text");
    engine.block.select(page);

    adapter.onBlockClick?.(first, { additive: true, shiftKey: true });
    adapter.onBlockClick?.(second, { additive: true, shiftKey: true });

    expect(engine.block.findAllSelected()).toEqual([first, second]);
  });
});
