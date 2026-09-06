import { beforeEach, describe, expect, it } from "vitest";
import { EditxEngine } from "../editx-engine";
import type { FillType } from "./block.types";
import { BlockAPI } from "./block-api";
import { FILL_GRADIENT_STOPS } from "./property-keys";

/** Create a graphic block with an attached fill sub-block of the given kind. */
function makeGraphicWithFill(block: BlockAPI, kind: FillType): { gid: number; fid: number } {
  const gid = block.create("graphic");
  const fid = block.createFill(kind);
  block.setFill(gid, fid);
  return { gid, fid };
}

describe("BlockFillAPI gradient fills and kind changes", () => {
  let engine: EditxEngine;
  let block: BlockAPI;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: undefined });
    block = new BlockAPI(engine);
  });

  // ── Gradient ─────────────────────────────────────

  it("setFillGradient / getFillGradient round-trips", () => {
    const { gid } = makeGraphicWithFill(block, "gradient");
    const stops = [
      { offset: 0, color: "#ff0000" },
      { offset: 0.5, color: "#00ff00" },
      { offset: 1, color: "#0000ff" },
    ];
    block.setFillGradient(gid, { type: "radial", stops, angle: 45 });

    const g = block.getFillGradient(gid);
    expect(g).not.toBeNull();
    expect(g!.type).toBe("radial");
    expect(g!.angle).toBe(45);
    expect(g!.stops).toEqual(stops);
  });

  it("setFillGradient defaults angle to 0 when omitted", () => {
    const { gid } = makeGraphicWithFill(block, "gradient");
    block.setFillGradient(gid, {
      type: "linear",
      stops: [{ offset: 0, color: "#000" }],
    });
    expect(block.getFillGradient(gid)!.angle).toBe(0);
  });

  it("getFillGradient returns null when fill kind is not gradient", () => {
    const { gid } = makeGraphicWithFill(block, "color");
    expect(block.getFillGradient(gid)).toBeNull();
  });

  it("setFillGradient is a no-op when fill kind is not gradient", () => {
    const { gid } = makeGraphicWithFill(block, "color");
    block.setFillGradient(gid, { type: "linear", stops: [{ offset: 0, color: "#fff" }] });
    expect(block.getFillGradient(gid)).toBeNull();
  });

  it("setFillGradient is a single undoable entry", () => {
    const { gid } = makeGraphicWithFill(block, "gradient");
    const defaults = block.getFillGradient(gid)!;
    const stops = [
      { offset: 0, color: "#111111" },
      { offset: 1, color: "#222222" },
    ];
    block.setFillGradient(gid, { type: "linear", stops, angle: 90 });
    expect(block.getFillGradient(gid)!.stops).toEqual(stops);

    engine.undo();
    const reverted = block.getFillGradient(gid)!;
    expect(reverted.stops).toEqual(defaults.stops);
    expect(reverted.angle).toBe(defaults.angle);

    engine.redo();
    expect(block.getFillGradient(gid)!.stops).toEqual(stops);
    expect(block.getFillGradient(gid)!.angle).toBe(90);
  });

  // ── changeFillKind ───────────────────────────────

  it("changeFillKind replaces the fill sub-block with a fresh one of the kind", () => {
    const { gid, fid } = makeGraphicWithFill(block, "color");
    block.changeFillKind(gid, "gradient");

    const newFid = block.getFill(gid)!;
    expect(newFid).not.toBe(fid);
    expect(block.getKind(newFid)).toBe("gradient");
    expect(block.exists(fid)).toBe(false); // old fill destroyed (no leak)
    expect(block.getFillGradient(gid)).not.toBeNull();
  });

  it("changeFillKind color→gradient→image, one undo reverts each transition", () => {
    const store = engine._getBlockStore();
    const { gid } = makeGraphicWithFill(block, "color");
    const baseline = store.getAllBlockIds().length;

    block.changeFillKind(gid, "gradient");
    expect(block.getKind(block.getFill(gid)!)).toBe("gradient");
    expect(store.getAllBlockIds().length).toBe(baseline); // no orphan

    block.changeFillKind(gid, "image");
    expect(block.getKind(block.getFill(gid)!)).toBe("image");
    expect(store.getAllBlockIds().length).toBe(baseline);

    engine.undo(); // image → gradient
    expect(block.getKind(block.getFill(gid)!)).toBe("gradient");
    expect(store.getAllBlockIds().length).toBe(baseline);

    engine.undo(); // gradient → color
    expect(block.getKind(block.getFill(gid)!)).toBe("color");
    expect(store.getAllBlockIds().length).toBe(baseline);
  });

  it("changeFillKind undo restores the previous fill wholesale", () => {
    const { gid, fid } = makeGraphicWithFill(block, "gradient");
    const stops = [
      { offset: 0, color: "#abcdef" },
      { offset: 1, color: "#123456" },
    ];
    block.setFillGradient(gid, { type: "linear", stops, angle: 30 });

    block.changeFillKind(gid, "image");
    expect(block.getFillGradient(gid)).toBeNull();

    engine.undo(); // change-kind
    expect(block.getFill(gid)).toBe(fid); // original fill restored
    const g = block.getFillGradient(gid)!;
    expect(g.stops).toEqual(stops);
    expect(g.angle).toBe(30);
  });

  it("changeFillKind does not leak orphan fill blocks after undo", () => {
    const store = engine._getBlockStore();
    const { gid } = makeGraphicWithFill(block, "color");
    const baseline = store.getAllBlockIds().length;

    block.changeFillKind(gid, "gradient");
    block.changeFillKind(gid, "image");
    engine.undo();
    engine.undo();

    expect(store.getAllBlockIds().length).toBe(baseline);
    expect(block.getKind(block.getFill(gid)!)).toBe("color");
  });

  // ── Snapshot round-trip of GradientStop[] ────────

  it("snapshot/restore round-trips GradientStop[] deep-equal", () => {
    const store = engine._getBlockStore();
    const { gid } = makeGraphicWithFill(block, "gradient");
    const stops = [
      { offset: 0, color: "#010203" },
      { offset: 0.7, color: "#040506" },
      { offset: 1, color: "#070809" },
    ];
    block.setFillGradient(gid, { type: "linear", stops, angle: 15 });
    const fid = block.getFill(gid)!;

    const snap = store.snapshot(fid)!;
    // Snapshot must be a deep copy, not corrupted into TextRun shape.
    expect(snap.properties[FILL_GRADIENT_STOPS]).toEqual(stops);

    // Mutate live, then restore from the snapshot.
    block.setFillGradient(gid, {
      type: "linear",
      stops: [{ offset: 0, color: "#ffffff" }],
    });
    store.restore(snap);
    expect(block.getFillGradient(gid)!.stops).toEqual(stops);
  });
});
