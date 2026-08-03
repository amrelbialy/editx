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
  return { engine, adapter };
}

describe("createEngine onBlockClick — marquee selection", () => {
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
});
