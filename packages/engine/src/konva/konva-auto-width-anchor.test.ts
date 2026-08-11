// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POSITION_X, SIZE_WIDTH, TEXT_ALIGN } from "../block/property-keys";
import type { EditxEngine } from "../editx-engine";
import { createEngine, type KonvaRendererAdapter } from "./index";

/**
 * Auto-width re-anchor (konva/index.ts `onAutoWidth`): an auto-width text box
 * grows from its LEFT edge, so centre/right aligned text would visually drift
 * as its content changes. The handler shifts `x` by the width delta, gated on
 * the block's own `text/align`, and writes position + size inside the SAME
 * silent block so they move atomically and add no undo entry.
 */
describe("konva onAutoWidth re-anchor", () => {
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
    engine.block.setFloat(id, POSITION_X, 100);
    engine.block.setFloat(id, SIZE_WIDTH, 200);
    engine.clearHistory();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    engine.getRenderer()?.dispose?.();
    container.remove();
  });

  it("leaves x unchanged for left-aligned text (the default)", () => {
    adapter.onAutoWidth?.(id, 120);

    expect(engine.block.getFloat(id, SIZE_WIDTH)).toBe(120);
    expect(engine.block.getFloat(id, POSITION_X)).toBe(100);
  });

  it("leaves x unchanged when text/align is explicitly left", () => {
    engine.block.setString(id, TEXT_ALIGN, "left");
    adapter.onAutoWidth?.(id, 120);

    expect(engine.block.getFloat(id, POSITION_X)).toBe(100);
  });

  it("keeps the centre fixed for centre-aligned text", () => {
    engine.block.setString(id, TEXT_ALIGN, "center");
    adapter.onAutoWidth?.(id, 120);

    // x += (200 - 120) / 2
    expect(engine.block.getFloat(id, POSITION_X)).toBe(140);
    expect(engine.block.getFloat(id, SIZE_WIDTH)).toBe(120);
  });

  it("keeps the right edge fixed for right-aligned text", () => {
    engine.block.setString(id, TEXT_ALIGN, "right");
    adapter.onAutoWidth?.(id, 120);

    // x += 200 - 120; right edge stays at 300.
    expect(engine.block.getFloat(id, POSITION_X)).toBe(180);
    expect(engine.block.getFloat(id, SIZE_WIDTH)).toBe(120);
  });

  it("shifts the other way when the box grows", () => {
    engine.block.setString(id, TEXT_ALIGN, "center");
    adapter.onAutoWidth?.(id, 300);

    expect(engine.block.getFloat(id, POSITION_X)).toBe(50);
  });

  it("does not move a loaded scene whose stored width already matches", () => {
    engine.block.setString(id, TEXT_ALIGN, "center");

    adapter.onAutoWidth?.(id, 200.3);

    expect(engine.block.getFloat(id, POSITION_X)).toBe(100);
    expect(engine.block.getFloat(id, SIZE_WIDTH)).toBe(200);
  });

  it("adds NO undo entry — position and size move together, silently", () => {
    engine.block.setString(id, TEXT_ALIGN, "center");
    engine.clearHistory();

    engine.block.setFloat(id, POSITION_X, 100);
    expect(engine.canUndo()).toBe(true);

    adapter.onAutoWidth?.(id, 120);
    expect(engine.block.getFloat(id, POSITION_X)).toBe(140);

    engine.undo();
    expect(engine.canUndo()).toBe(false);
  });
});
