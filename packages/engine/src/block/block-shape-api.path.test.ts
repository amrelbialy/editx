import { beforeEach, describe, expect, it } from "vitest";
import { EditxEngine } from "../editx-engine";
import { BlockAPI } from "./block-api";
import {
  SHAPE_PATH_DATA,
  SHAPE_PATH_PRESERVE_ASPECT,
  SHAPE_PATH_VIEWBOX_HEIGHT,
  SHAPE_PATH_VIEWBOX_WIDTH,
  SHAPE_POLYGON_SIDES,
} from "./property-keys";

/**
 * Feature 01 — SVG "path" shape support on addShape, plus the `d`-string
 * security allowlist (the single validation/write boundary for path data).
 */
describe("BlockShapeAPI — path shapes", () => {
  let engine: EditxEngine;
  let block: BlockAPI;
  let pageId: number;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: undefined });
    block = new BlockAPI(engine);
    pageId = block.create("page");
  });

  it("creates a path graphic with data + viewBox and returns its id", () => {
    const id = block.addShape(pageId, "path", "color", 10, 20, 200, 100, {
      pathData: "M0 0 L10 10 Z",
      viewBox: { width: 10, height: 10 },
    });

    expect(typeof id).toBe("number");
    expect(block.exists(id)).toBe(true);

    const shapeId = block.getShape(id);
    expect(shapeId).not.toBeNull();
    expect(block.getString(shapeId as number, SHAPE_PATH_DATA)).toBe("M0 0 L10 10 Z");
    expect(block.getFloat(shapeId as number, SHAPE_PATH_VIEWBOX_WIDTH)).toBe(10);
    expect(block.getFloat(shapeId as number, SHAPE_PATH_VIEWBOX_HEIGHT)).toBe(10);
  });

  it("falls back to block-default viewBox (100×100) + preserveAspect when omitted", () => {
    const id = block.addShape(pageId, "path", "color", 0, 0, 50, 50, {
      pathData: "M0 0 L50 50",
    });
    const shapeId = block.getShape(id) as number;

    expect(block.getFloat(shapeId, SHAPE_PATH_VIEWBOX_WIDTH)).toBe(100);
    expect(block.getFloat(shapeId, SHAPE_PATH_VIEWBOX_HEIGHT)).toBe(100);
    expect(block.getBool(shapeId, SHAPE_PATH_PRESERVE_ASPECT)).toBe(true);
  });

  it("is a single undo step (undo removes the whole path graphic)", () => {
    const id = block.addShape(pageId, "path", "color", 0, 0, 100, 100, {
      pathData: "M0 0 L10 10 Z",
      viewBox: { width: 10, height: 10 },
    });
    expect(block.exists(id)).toBe(true);

    engine.undo();
    expect(block.exists(id)).toBe(false);

    engine.redo();
    expect(block.exists(id)).toBe(true);
  });

  it("ignores pathData/viewBox for non-path kinds; polygon still honors sides", () => {
    const rectId = block.addShape(pageId, "rect", "color", 0, 0, 100, 100, {
      pathData: "M0 0 L10 10 Z",
      viewBox: { width: 10, height: 10 },
    });
    const rectShape = block.getShape(rectId) as number;
    // rect shape sub-block never receives path data
    expect(block.getString(rectShape, SHAPE_PATH_DATA)).toBe("");

    const polyId = block.addShape(pageId, "polygon", "color", 0, 0, 100, 100, {
      sides: 6,
      pathData: "M0 0 L10 10 Z",
    });
    const polyShape = block.getShape(polyId) as number;
    expect(block.getFloat(polyShape, SHAPE_POLYGON_SIDES)).toBe(6);
    expect(block.getString(polyShape, SHAPE_PATH_DATA)).toBe("");
  });

  it("existing back-compat callers (no opts) are unaffected", () => {
    const id = block.addShape(pageId, "ellipse", "color", 5, 5, 60, 40);
    expect(block.exists(id)).toBe(true);
    expect(block.getShape(id)).not.toBeNull();
  });

  describe("d-string allowlist validation", () => {
    const valid = [
      "",
      "M0 0 L10 10 Z",
      "M0 0 C10 10 20 20 30 30",
      "M0 0 A5 5 0 0 1 10 10",
      "M1.5 2.5 l-3.25 4.75",
      "M0 0 L1e3 -2E2",
    ];
    for (const d of valid) {
      it(`accepts valid d = "${d}"`, () => {
        const id = block.addShape(pageId, "path", "color", 0, 0, 10, 10, {
          pathData: d,
          viewBox: { width: 10, height: 10 },
        });
        expect(block.getString(block.getShape(id) as number, SHAPE_PATH_DATA)).toBe(d);
      });
    }

    const invalid = ["M0 0<script>", "M0 0 L10 10 url(#x)", "javascript:alert(1)", "M0 0#hash"];
    for (const d of invalid) {
      it(`throws on invalid d = "${d}"`, () => {
        expect(() =>
          block.addShape(pageId, "path", "color", 0, 0, 10, 10, {
            pathData: d,
            viewBox: { width: 10, height: 10 },
          }),
        ).toThrow("Invalid SVG path data");
      });
    }

    it("rejects fail-fast: no partial block is created and no batch is left open", () => {
      const before = block.getSnapshot(pageId)?.children.length ?? 0;
      expect(() =>
        block.addShape(pageId, "path", "color", 0, 0, 10, 10, { pathData: "M0 0<bad>" }),
      ).toThrow("Invalid SVG path data");
      const after = block.getSnapshot(pageId)?.children.length ?? 0;
      expect(after).toBe(before);

      // History is still usable — a subsequent valid op commits cleanly.
      const id = block.addShape(pageId, "rect", "color", 0, 0, 10, 10);
      expect(block.exists(id)).toBe(true);
      engine.undo();
      expect(block.exists(id)).toBe(false);
    });
  });
});
