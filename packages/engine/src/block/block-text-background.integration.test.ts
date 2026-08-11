/**
 * Text background box across real engine lifecycles: undo/redo round-trips,
 * coalesced drags, curve/un-curve data retention, an explicit resize (which
 * turns `text/autoHeight`/`text/autoWidth` off), grouping, and a save/load
 * round-trip that carries the box's shadow and stroke.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { createMockRenderer } from "../__tests__/mocks/mock-renderer";
import { EditxEngine } from "../editx-engine";
import { SceneAPI } from "../scene";
import type { Color } from "./block.types";
import { BlockAPI } from "./block-api";
import {
  TEXT_ALIGN,
  TEXT_AUTO_HEIGHT,
  TEXT_AUTO_WIDTH,
  TEXT_BACKGROUND_ENABLED,
  TEXT_BACKGROUND_PADDING_TOP,
} from "./property-keys";

const RED: Color = { r: 1, g: 0, b: 0, a: 1 };
const BLUE: Color = { r: 0, g: 0, b: 1, a: 1 };

describe("text background box — undo/redo round-trips", () => {
  let engine: EditxEngine;
  let block: BlockAPI;
  let id: number;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: undefined });
    block = new BlockAPI(engine);
    id = block.create("text");
    engine.clearHistory();
  });

  it("walks back and forward through an off → on → off → on sequence", () => {
    block.setTextBackgroundEnabled(id, true);
    block.setTextBackgroundEnabled(id, false);
    block.setTextBackgroundEnabled(id, true);

    expect(block.isTextBackgroundEnabled(id)).toBe(true);

    const backwards: boolean[] = [];
    for (let i = 0; i < 3; i++) {
      engine.undo();
      backwards.push(block.isTextBackgroundEnabled(id));
    }
    expect(backwards).toEqual([false, true, false]);
    expect(engine.canUndo()).toBe(false);

    const forwards: boolean[] = [];
    for (let i = 0; i < 3; i++) {
      engine.redo();
      forwards.push(block.isTextBackgroundEnabled(id));
    }
    expect(forwards).toEqual([true, false, true]);
  });

  it("collapses a coalesced padding drag into one undo entry", () => {
    block.setTextBackground(id, { enabled: true, padding: 4 });
    engine.clearHistory();

    // What `useCoalescedHistory` does: one batch around the whole burst.
    engine.beginBatch();
    for (const value of [6, 8, 10, 12, 14]) block.setTextBackground(id, { padding: value });
    engine.endBatch();

    expect(block.getTextBackground(id).padding.top).toBe(14);

    engine.undo();
    expect(block.getTextBackground(id).padding.top).toBe(4);
    expect(engine.canUndo()).toBe(false);

    engine.redo();
    expect(block.getTextBackground(id).padding.top).toBe(14);
  });

  it("redoes a multi-field write as one entry", () => {
    block.setTextBackground(id, { enabled: true, color: RED, cornerRadius: 10, padding: 5 });
    const applied = block.getTextBackground(id);

    engine.undo();
    engine.redo();

    expect(block.getTextBackground(id)).toEqual(applied);
    expect(engine.canRedo()).toBe(false);
  });

  it("keeps unrelated text edits out of the box's undo entry", () => {
    block.setTextBackground(id, { enabled: true, padding: 12 });
    block.setTextAlign(id, "center");

    engine.undo();

    expect(block.getString(id, TEXT_ALIGN)).toBe("left");
    expect(block.getTextBackground(id).padding.top).toBe(12);
  });
});

describe("text background box — survives other block operations", () => {
  let engine: EditxEngine;
  let block: BlockAPI;
  let id: number;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: undefined });
    block = new BlockAPI(engine);
    id = block.create("text");
    block.setTextBackground(id, { enabled: true, color: RED, cornerRadius: 8, padding: 16 });
  });

  it("is untouched by an explicit resize turning auto-height/width off", () => {
    const before = block.getTextBackground(id);

    // What `adapter.onTransformEnd` writes for a text block.
    engine.beginBatch();
    block.setPosition(id, 40, 60);
    block.setSize(id, 320, 180);
    block.setRotation(id, 30);
    block.setBool(id, TEXT_AUTO_HEIGHT, false);
    block.setBool(id, TEXT_AUTO_WIDTH, false);
    engine.endBatch();

    expect(block.getTextBackground(id)).toEqual(before);
    expect(block.getRotation(id)).toBe(30);
  });

  it("is untouched by opacity and rotation writes", () => {
    const before = block.getTextBackground(id);

    block.setOpacity(id, 0.4);
    block.setRotation(id, -15);

    expect(block.getTextBackground(id)).toEqual(before);
  });

  it("survives grouping and ungrouping", () => {
    const other = block.create("text");
    const before = block.getTextBackground(id);

    const groupId = block.group([id, other]);
    expect(block.getTextBackground(id)).toEqual(before);

    block.ungroup(groupId);
    expect(block.getTextBackground(id)).toEqual(before);
  });

  it("keeps the box data through curve → un-curve with no loss", () => {
    const before = block.getTextBackground(id);

    block.setTextCurve(id, 240, "up");
    // Curved text suppresses the PAINT only: the data stays readable/writable.
    expect(block.getTextBackground(id)).toEqual(before);
    block.setTextBackground(id, { color: BLUE });
    expect(block.getTextBackground(id).color).toEqual(BLUE);
    expect(block.isTextBackgroundEnabled(id)).toBe(true);

    block.setTextCurve(id, 0, "up");

    expect(block.getTextCurve(id)).toBeNull();
    expect(block.getTextBackground(id)).toEqual({ ...before, color: BLUE });
  });
});

describe("text background box — save/load with shadow and stroke", () => {
  it("round-trips the box together with its shadow and stroke", async () => {
    const engine = new EditxEngine({ renderer: createMockRenderer() });
    const block = new BlockAPI(engine);
    const scene = new SceneAPI(engine, block);
    await scene.create();
    const pageId = scene.getCurrentPage()!;
    const id = block.create("text");
    block.appendChild(pageId, id);

    block.setTextBackground(id, { enabled: true, color: RED, cornerRadius: 12, padding: 20 });
    block.setShadowEnabled(id, true);
    block.setShadowColor(id, BLUE);
    block.setShadowBlur(id, 0);
    block.setShadowOffsetX(id, 14);
    block.setShadowOffsetY(id, 14);
    block.setStrokeEnabled(id, true);
    block.setStrokeColor(id, BLUE);
    block.setStrokeWidth(id, 3);

    const json = scene.saveToString();

    const engine2 = new EditxEngine({ renderer: createMockRenderer() });
    const block2 = new BlockAPI(engine2);
    const scene2 = new SceneAPI(engine2, block2);
    await scene2.loadFromString(json);
    const pageId2 = scene2.getCurrentPage()!;
    const id2 = block2.getChildren(pageId2).find((b) => block2.getType(b) === "text")!;

    expect(block2.getTextBackground(id2)).toEqual(block.getTextBackground(id));
    expect(block2.isShadowEnabled(id2)).toBe(true);
    expect(block2.getShadowColor(id2)).toEqual(BLUE);
    expect(block2.getShadowBlur(id2)).toBe(0);
    expect(block2.getShadowOffsetX(id2)).toBe(14);
    expect(block2.getShadowOffsetY(id2)).toBe(14);
    expect(block2.isStrokeEnabled(id2)).toBe(true);
    expect(block2.getStrokeColor(id2)).toEqual(BLUE);
    expect(block2.getStrokeWidth(id2)).toBe(3);
  });

  it("serializes a curved boxed block's keys so un-curving restores it", async () => {
    const engine = new EditxEngine({ renderer: createMockRenderer() });
    const block = new BlockAPI(engine);
    const scene = new SceneAPI(engine, block);
    await scene.create();
    const pageId = scene.getCurrentPage()!;
    const id = block.create("text");
    block.appendChild(pageId, id);
    block.setTextBackground(id, { enabled: true, color: RED, padding: 10 });
    block.setTextCurve(id, 300, "down");

    const payload = JSON.parse(scene.saveToString());
    const entry = payload.blocks.find(
      (b: { properties?: Record<string, unknown> }) =>
        b.properties?.[TEXT_BACKGROUND_ENABLED] === true,
    );

    expect(entry.properties[TEXT_BACKGROUND_PADDING_TOP]).toBe(10);
  });
});
