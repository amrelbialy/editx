import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditxEngine } from "../editx-engine";
import type { Color } from "./block.types";
import { BlockAPI } from "./block-api";
import {
  TEXT_BACKGROUND_COLOR,
  TEXT_BACKGROUND_CORNER_RADIUS,
  TEXT_BACKGROUND_ENABLED,
  TEXT_BACKGROUND_PADDING_LEFT,
  TEXT_BACKGROUND_PADDING_TOP,
  TEXT_PADDING,
} from "./property-keys";

const RED: Color = { r: 1, g: 0, b: 0, a: 1 };
const BLACK: Color = { r: 0, g: 0, b: 0, a: 1 };

describe("BlockTextAPI text background box", () => {
  let engine: EditxEngine;
  let block: BlockAPI;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: undefined });
    block = new BlockAPI(engine);
  });

  const backgroundKeys = (id: number) =>
    engine
      ._getBlockStore()
      .findAllProperties(id)
      .filter((key) => key.startsWith("text/background/"));

  it("getTextBackground on an untouched text block returns resolved defaults", () => {
    const id = block.create("text");
    expect(block.getTextBackground(id)).toEqual({
      enabled: false,
      color: BLACK,
      geometry: "text-union",
      cornerRadius: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    expect(backgroundKeys(id)).toEqual([]);
  });

  it("partial update leaves omitted fields untouched", () => {
    const id = block.create("text");
    block.setTextBackground(id, { enabled: true, color: RED, cornerRadius: 8, padding: 4 });

    block.setTextBackground(id, { cornerRadius: 12 });

    const bg = block.getTextBackground(id);
    expect(bg.cornerRadius).toBe(12);
    expect(bg.enabled).toBe(true);
    expect(bg.color).toEqual(RED);
    expect(bg.padding).toEqual({ top: 4, right: 4, bottom: 4, left: 4 });
  });

  it("an explicit undefined value is not written", () => {
    const id = block.create("text");
    block.setTextBackground(id, { enabled: undefined, color: undefined });
    expect(backgroundKeys(id)).toEqual([]);
  });

  it("empty opts is a no-op — no command, no emission, no undo entry", () => {
    const id = block.create("text");
    block.setTextBackgroundEnabled(id, true);
    engine.clearHistory();

    const onChanged = vi.fn();
    engine.on("block:stateChanged", onChanged);

    block.setTextBackground(id, {});

    expect(onChanged).not.toHaveBeenCalled();
    expect(engine.canUndo()).toBe(false);
    expect(block.isTextBackgroundEnabled(id)).toBe(true);
  });

  it("padding as a number writes all four sides", () => {
    const id = block.create("text");
    block.setTextBackground(id, { padding: 6 });
    expect(block.getTextBackground(id).padding).toEqual({
      top: 6,
      right: 6,
      bottom: 6,
      left: 6,
    });
  });

  it("padding as an object merges only the supplied sides", () => {
    const id = block.create("text");
    block.setTextBackground(id, { padding: 6 });
    block.setTextBackground(id, { padding: { left: 20 } });

    expect(block.getTextBackground(id).padding).toEqual({
      top: 6,
      right: 6,
      bottom: 6,
      left: 20,
    });
  });

  it("preserves the text inset when frame geometry is enabled without authored padding", () => {
    const id = block.create("text");
    block.setFloat(id, TEXT_PADDING, 4);

    block.setTextBackground(id, { enabled: true, geometry: "frame" });

    expect(block.getTextBackground(id).padding).toEqual({
      top: 4,
      right: 4,
      bottom: 4,
      left: 4,
    });
  });

  it("a multi-field setTextBackground is one undo entry that restores every field", () => {
    const id = block.create("text");
    engine.clearHistory();

    block.setTextBackground(id, { enabled: true, color: RED, cornerRadius: 10, padding: 5 });
    expect(engine.canUndo()).toBe(true);

    engine.undo();

    expect(engine.canUndo()).toBe(false);
    expect(block.getTextBackground(id)).toEqual({
      enabled: false,
      color: BLACK,
      geometry: "text-union",
      cornerRadius: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  });

  it("setTextBackgroundEnabled is one undo entry and mirrors isTextBackgroundEnabled", () => {
    const id = block.create("text");
    engine.clearHistory();

    block.setTextBackgroundEnabled(id, true);
    expect(block.isTextBackgroundEnabled(id)).toBe(true);

    engine.undo();
    expect(block.isTextBackgroundEnabled(id)).toBe(false);
    expect(engine.canUndo()).toBe(false);
  });

  it("coerces non-finite numbers to 0 and clamps negative cornerRadius", () => {
    const id = block.create("text");
    block.setTextBackground(id, {
      cornerRadius: Number.NaN,
      padding: { top: Number.POSITIVE_INFINITY, right: Number.NEGATIVE_INFINITY },
    });
    expect(block.getTextBackground(id).cornerRadius).toBe(0);
    expect(block.getTextBackground(id).padding.top).toBe(0);
    expect(block.getTextBackground(id).padding.right).toBe(0);

    block.setTextBackground(id, { cornerRadius: -8, padding: Number.NaN });
    expect(block.getTextBackground(id).cornerRadius).toBe(0);
    expect(block.getTextBackground(id).padding.left).toBe(0);
  });

  it("stores negative padding as given", () => {
    const id = block.create("text");
    block.setTextBackground(id, { padding: -10 });
    expect(block.getTextBackground(id).padding).toEqual({
      top: -10,
      right: -10,
      bottom: -10,
      left: -10,
    });
  });

  it("supportsTextBackground is true for text and false for other block types", () => {
    expect(block.supportsTextBackground(block.create("text"))).toBe(true);
    expect(block.supportsTextBackground(block.create("graphic"))).toBe(false);
    expect(block.supportsTextBackground(block.create("image"))).toBe(false);
    expect(block.supportsTextBackground(block.create("page"))).toBe(false);
  });

  it("setTextBackground on a non-text block is a silent no-op", () => {
    const id = block.create("graphic");
    engine.clearHistory();

    expect(() => block.setTextBackground(id, { enabled: true, padding: 4 })).not.toThrow();
    expect(engine.canUndo()).toBe(false);
    expect(backgroundKeys(id)).toEqual([]);
    expect(block.getTextBackground(id)).toEqual({
      enabled: false,
      color: BLACK,
      geometry: "text-union",
      cornerRadius: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  });

  it("writes the frozen property keys", () => {
    const id = block.create("text");
    block.setTextBackground(id, {
      enabled: true,
      color: RED,
      cornerRadius: 4,
      padding: { top: 1, left: 2 },
    });

    const store = engine._getBlockStore();
    expect(store.getBool(id, TEXT_BACKGROUND_ENABLED)).toBe(true);
    expect(store.getColor(id, TEXT_BACKGROUND_COLOR)).toEqual(RED);
    expect(store.getFloat(id, TEXT_BACKGROUND_CORNER_RADIUS)).toBe(4);
    expect(store.getFloat(id, TEXT_BACKGROUND_PADDING_TOP)).toBe(1);
    expect(store.getFloat(id, TEXT_BACKGROUND_PADDING_LEFT)).toBe(2);
  });
});
