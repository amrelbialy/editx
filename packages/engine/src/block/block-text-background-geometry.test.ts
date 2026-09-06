import { beforeEach, describe, expect, it } from "vitest";
import {
  EditxEngine,
  TEXT_BACKGROUND_GEOMETRY,
  type TextBackground,
  type TextBackgroundGeometry,
} from "../index";

describe("BlockTextAPI text background geometry", () => {
  let engine: EditxEngine;
  let id: number;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: undefined });
    id = engine.block.create("text");
  });

  it("keeps pre-geometry descriptors source-compatible without weakening getter results", () => {
    const legacy: TextBackground = {
      enabled: false,
      color: { r: 0, g: 0, b: 0, a: 0 },
      cornerRadius: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    };
    const resolvedGeometry: TextBackgroundGeometry = engine.block.getTextBackground(id).geometry;

    expect(legacy.geometry).toBeUndefined();
    expect(resolvedGeometry).toBe("text-union");
  });

  it("exports the frozen key and resolves absent or unknown values to text-union", () => {
    const defaultGeometry: TextBackgroundGeometry = "text-union";
    expect(TEXT_BACKGROUND_GEOMETRY).toBe("text/background/geometry");
    expect(engine.block.getTextBackground(id).geometry).toBe(defaultGeometry);

    engine.block.setString(id, TEXT_BACKGROUND_GEOMETRY, "future-geometry");

    expect(engine.block.getTextBackground(id).geometry).toBe("text-union");
  });

  it("stores signed padding for text-union geometry", () => {
    engine.block.setTextBackground(id, { geometry: "text-union", padding: -10 });

    expect(engine.block.getTextBackground(id)).toMatchObject({
      geometry: "text-union",
      padding: { top: -10, right: -10, bottom: -10, left: -10 },
    });
  });

  it("normalizes frame padding to nonnegative content insets at the API boundary", () => {
    engine.block.setTextBackground(id, {
      geometry: "frame",
      padding: { top: -2, right: 3, bottom: Number.NaN, left: -4 },
    });

    expect(engine.block.getTextBackground(id)).toMatchObject({
      geometry: "frame",
      padding: { top: 0, right: 3, bottom: 0, left: 0 },
    });
  });

  it("switches legacy signed padding to frame in one undoable batch", () => {
    engine.block.setTextBackground(id, {
      geometry: "text-union",
      padding: { top: -1, right: 2, bottom: -3, left: 4 },
    });
    engine.clearHistory();

    engine.block.setTextBackground(id, { geometry: "frame", padding: { right: 6 } });

    expect(engine.block.getTextBackground(id)).toMatchObject({
      geometry: "frame",
      padding: { top: 0, right: 6, bottom: 0, left: 4 },
    });
    engine.undo();
    expect(engine.canUndo()).toBe(false);
    expect(engine.block.getTextBackground(id)).toMatchObject({
      geometry: "text-union",
      padding: { top: -1, right: 2, bottom: -3, left: 4 },
    });
  });

  it("keeps setTextBackgroundEnabled narrow", () => {
    engine.block.setTextBackground(id, { geometry: "frame", padding: 5 });
    engine.clearHistory();

    engine.block.setTextBackgroundEnabled(id, true);
    engine.undo();

    expect(engine.block.getTextBackground(id)).toMatchObject({
      enabled: false,
      geometry: "frame",
      padding: { top: 5, right: 5, bottom: 5, left: 5 },
    });
    expect(engine.canUndo()).toBe(false);
  });
});
