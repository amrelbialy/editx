// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SIZE_HEIGHT,
  SIZE_WIDTH,
  TEXT_AUTO_HEIGHT,
  TEXT_AUTO_WIDTH,
  TEXT_BACKGROUND_PADDING_RIGHT,
  TEXT_PADDING,
} from "../block/property-keys";
import type { EditxEngine } from "../editx-engine";
import { createEngine, type KonvaRendererAdapter } from "./index";

describe("konva text transform-end geometry scaling", () => {
  let container: HTMLElement;
  let engine: EditxEngine;
  let adapter: KonvaRendererAdapter;
  let id: number;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    engine = await createEngine({ container });
    adapter = engine.getRenderer() as KonvaRendererAdapter;
    id = engine.block.create("text");
    engine.block.setSize(id, 100, 50);
    engine.block.setFloat(id, TEXT_PADDING, 3);
    engine.block.setProperty(id, "text/runs", [
      {
        text: "Hi",
        style: {
          fontSize: 20,
          backgroundColor: "#ff0",
          backgroundPadding: { top: 2, left: -3 },
          backgroundCornerRadius: 4,
        },
      },
      { text: "!", style: { fontSize: 10 } },
    ]);
    engine.block.setTextBackground(id, {
      enabled: true,
      cornerRadius: 5,
      padding: { top: 1, left: -2 },
    });
    engine.block.setBool(id, TEXT_AUTO_HEIGHT, true);
    engine.block.setBool(id, TEXT_AUTO_WIDTH, true);
    engine.clearHistory();
  });

  afterEach(() => {
    engine.getRenderer()?.dispose?.();
    container.remove();
  });

  it("scales proportional text geometry and commits the resize as one undo entry", () => {
    adapter.onBlockTransformEnd?.(
      id,
      { x: 12, y: 14, width: 800, height: 25, rotation: 15 },
      "bottom-right",
    );

    const runs = engine.block.getTextRuns(id);
    expect(runs[0].style).toMatchObject({
      fontSize: 40,
      backgroundPadding: { top: 4, left: -6 },
      backgroundCornerRadius: 8,
    });
    expect(runs[0].style.backgroundPadding).not.toHaveProperty("right");
    expect(runs[1].style).toEqual({ fontSize: 20 });
    expect(engine.block.getFloat(id, TEXT_PADDING)).toBe(6);
    expect(engine.block.getTextBackground(id)).toMatchObject({
      cornerRadius: 10,
      padding: { top: 2, left: -4 },
    });
    expect(engine.block.getProperty(id, TEXT_BACKGROUND_PADDING_RIGHT)).toBeUndefined();
    expect(engine.block.getFloat(id, SIZE_WIDTH)).toBe(800);
    expect(engine.block.getFloat(id, SIZE_HEIGHT)).toBe(25);
    expect(engine.block.getBool(id, TEXT_AUTO_HEIGHT)).toBe(false);
    expect(engine.block.getBool(id, TEXT_AUTO_WIDTH)).toBe(false);

    expect(engine.canUndo()).toBe(true);
    engine.undo();
    expect(engine.canUndo()).toBe(false);
    expect(engine.block.getFloat(id, SIZE_WIDTH)).toBe(100);
    expect(engine.block.getFloat(id, SIZE_HEIGHT)).toBe(50);
    expect(engine.block.getTextRuns(id)[0].style.fontSize).toBe(20);
    expect(engine.block.getTextRuns(id)[0].style.backgroundPadding).toEqual({ top: 2, left: -3 });
    expect(engine.block.getFloat(id, TEXT_PADDING)).toBe(3);
    expect(engine.block.getTextBackground(id)).toMatchObject({
      cornerRadius: 5,
      padding: { top: 1, left: -2 },
    });
    expect(engine.block.getBool(id, TEXT_AUTO_HEIGHT)).toBe(true);
    expect(engine.block.getBool(id, TEXT_AUTO_WIDTH)).toBe(true);
  });

  it("keeps pill-anchor resizing container-only", () => {
    adapter.onBlockTransformEnd?.(
      id,
      { x: 0, y: 0, width: 200, height: 50, rotation: 0 },
      "middle-right",
    );

    expect(engine.block.getTextRuns(id)[0].style.fontSize).toBe(20);
    expect(engine.block.getTextRuns(id)[0].style.backgroundPadding).toEqual({ top: 2, left: -3 });
    expect(engine.block.getFloat(id, TEXT_PADDING)).toBe(3);
    expect(engine.block.getTextBackground(id).cornerRadius).toBe(5);
    expect(engine.block.getFloat(id, SIZE_WIDTH)).toBe(200);
  });
});
