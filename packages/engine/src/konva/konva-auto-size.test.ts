// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POSITION_X, POSITION_Y, SIZE_HEIGHT, SIZE_WIDTH } from "../block/property-keys";
import type { EditxEngine } from "../editx-engine";
import { createEngine, type KonvaRendererAdapter } from "./index";

/**
 * Regression coverage for the `onAutoSize` reroute (konva/index.ts):
 * the derived auto-height write is now command-routed through
 * `engine.block.setFloat` inside `beginSilent()/endSilent()` instead of
 * mutating the store directly. It must:
 *   (i)  converge (no infinite loop) even in the clamp case (computedHeight < 10),
 *        because the epsilon guard compares against the clamped `target`, and
 *   (ii) create NO separate undo-history entry (silent), so undo/redo only ever
 *        reflects genuine user-initiated commands.
 *
 * A non-text ("graphic") block is used so `syncBlock` does not itself recompute
 * an auto-height and re-enter `onAutoSize` — keeping the handler under a
 * deterministic, direct-invocation test.
 */
describe("konva onAutoSize reroute", () => {
  let container: HTMLElement;
  let engine: EditxEngine;
  let adapter: KonvaRendererAdapter;
  let id: number;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    engine = await createEngine({ container });
    adapter = engine.getRenderer() as KonvaRendererAdapter;
    id = engine.block.create("graphic");
    engine.clearHistory();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    engine.getRenderer()?.dispose?.();
    container.remove();
  });

  it("writes the auto-height back through the command pipeline", () => {
    engine.block.setFloat(id, SIZE_HEIGHT, 100);
    engine.clearHistory();

    adapter.onAutoSize?.(id, 50);
    expect(engine.block.getFloat(id, SIZE_HEIGHT)).toBe(50);
  });

  it("clamps a computedHeight below the 10px floor", () => {
    adapter.onAutoSize?.(id, 3);
    expect(engine.block.getFloat(id, SIZE_HEIGHT)).toBe(10);
  });

  it("converges in the clamp case — repeated calls do not loop or re-write", () => {
    // First call drives the height to the clamped floor (target = 10).
    adapter.onAutoSize?.(id, 3);
    expect(engine.block.getFloat(id, SIZE_HEIGHT)).toBe(10);

    // The epsilon guard compares against the clamped target (10), not the raw
    // computedHeight (3). With the pre-fix bug, |current(10) - raw(3)| = 7 > 0.5
    // would re-write on every call and never converge.
    const spy = vi.spyOn(engine.block, "setFloat");
    for (let i = 0; i < 20; i++) {
      adapter.onAutoSize?.(id, 3);
    }
    expect(spy).not.toHaveBeenCalled();
    expect(engine.block.getFloat(id, SIZE_HEIGHT)).toBe(10);
  });

  it("no-ops when the target is within the 0.5px epsilon of the current height", () => {
    engine.block.setFloat(id, SIZE_HEIGHT, 50);
    engine.clearHistory();

    const spy = vi.spyOn(engine.block, "setFloat");
    adapter.onAutoSize?.(id, 50.3);
    expect(spy).not.toHaveBeenCalled();
    expect(engine.block.getFloat(id, SIZE_HEIGHT)).toBe(50);
  });

  it("adds NO undo entry — undo/redo reflects only user commands", () => {
    // A genuine user command → exactly one undo step.
    engine.block.setFloat(id, POSITION_X, 5);
    expect(engine.canUndo()).toBe(true);

    // A derived auto-size adjustment (silent) must not push its own step.
    adapter.onAutoSize?.(id, 60);
    expect(engine.block.getFloat(id, SIZE_HEIGHT)).toBe(60);

    engine.undo(); // reverts the user command
    expect(engine.block.getFloat(id, POSITION_X)).toBe(0);
    // If onAutoSize had added a step, this would still be true.
    expect(engine.canUndo()).toBe(false);
  });

  it("atomically refits the direct parent group without adding history", () => {
    const groupId = engine.block.create("group");
    engine.block.setPosition(groupId, 100, 200);
    engine.block.setSize(groupId, 1, 1);
    engine.block.setPosition(id, 10, 20);
    engine.block.setSize(id, 30, 40);
    engine.block.appendChild(groupId, id);
    engine.clearHistory();

    adapter.onAutoSize?.(id, 60);

    expect(engine.block.getFloat(groupId, POSITION_X)).toBe(110);
    expect(engine.block.getFloat(groupId, POSITION_Y)).toBe(220);
    expect(engine.block.getFloat(groupId, SIZE_WIDTH)).toBe(30);
    expect(engine.block.getFloat(groupId, SIZE_HEIGHT)).toBe(60);
    expect(engine.block.getFloat(id, POSITION_X)).toBe(0);
    expect(engine.block.getFloat(id, POSITION_Y)).toBe(0);
    expect(engine.canUndo()).toBe(false);
  });
});
