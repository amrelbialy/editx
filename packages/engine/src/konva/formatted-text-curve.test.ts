/**
 * @vitest-environment happy-dom
 *
 * Curved-text geometry. Canvas text metrics are unavailable in the test
 * environment, so `getDummyContext` is mocked with a deterministic measurer
 * (10px advance per character) — this keeps the arc math assertions stable.
 */

import { describe, expect, it, vi } from "vitest";
import type { TextRun } from "../block/block.types";

const { fakeCtx } = vi.hoisted(() => ({
  fakeCtx: {
    font: "",
    measureText: (t: string) => ({ width: t.length * 10 }),
  } as unknown as CanvasRenderingContext2D,
}));

vi.mock("./formatted-text-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./formatted-text-utils")>();
  return { ...actual, getDummyContext: () => fakeCtx };
});

import { FormattedText } from "./formatted-text";
import { computeCurvedLayout } from "./formatted-text-curve";

const runs = (text: string, fontSize = 16): TextRun[] => [{ text, style: { fontSize } }];

describe("computeCurvedLayout", () => {
  it("emits one (x, y, rotation) per glyph and skips newlines", () => {
    const layout = computeCurvedLayout(runs("Hello\nWorld"), {
      radius: 120,
      direction: "up",
      padding: 0,
    });
    // 10 letters (the \n is skipped, not wrapped).
    expect(layout.glyphs).toHaveLength(10);
    for (const g of layout.glyphs) {
      expect(typeof g.x).toBe("number");
      expect(typeof g.y).toBe("number");
      expect(typeof g.rotation).toBe("number");
    }
    // Glyphs advance along the arc (x strictly increases across the row).
    for (let i = 1; i < layout.glyphs.length; i++) {
      expect(layout.glyphs[i].x).toBeGreaterThan(layout.glyphs[i - 1].x);
    }
  });

  it("bbox grows beyond the flat glyph height and changes with radius", () => {
    const tight = computeCurvedLayout(runs("CURVED TEXT"), {
      radius: 60,
      direction: "up",
      padding: 0,
    });
    const wide = computeCurvedLayout(runs("CURVED TEXT"), {
      radius: 240,
      direction: "up",
      padding: 0,
    });

    // Arc bbox is taller than a single flat glyph (adds the arc sagitta).
    expect(tight.bbox.height).toBeGreaterThan(16);
    // Smaller radius bows harder → taller box. Radius genuinely changes bounds.
    expect(tight.bbox.height).toBeGreaterThan(wide.bbox.height);
    expect(tight.bbox).not.toEqual(wide.bbox);
  });

  it("word wrap is disabled — a long string stays a single continuous arc", () => {
    const long = "This string is definitely long enough to wrap when laid out flat";
    const layout = computeCurvedLayout(runs(long), { radius: 300, direction: "up", padding: 0 });
    // Every non-newline char maps to exactly one glyph — no line breaks.
    expect(layout.glyphs).toHaveLength(long.length);
  });

  it("direction up vs down mirrors the rotation sign", () => {
    const up = computeCurvedLayout(runs("Hello"), { radius: 100, direction: "up", padding: 0 });
    const down = computeCurvedLayout(runs("Hello"), { radius: 100, direction: "down", padding: 0 });

    // First glyph sits off-apex, so its rotation is non-zero and mirrored.
    expect(up.glyphs[0].rotation).not.toBe(0);
    expect(down.glyphs[0].rotation).toBeCloseTo(-up.glyphs[0].rotation, 10);
  });

  it("applies padding to the bbox and glyph anchors", () => {
    const noPad = computeCurvedLayout(runs("AB"), { radius: 100, direction: "up", padding: 0 });
    const pad = computeCurvedLayout(runs("AB"), { radius: 100, direction: "up", padding: 8 });
    expect(pad.bbox.width).toBeCloseTo(noPad.bbox.width + 16, 6);
    expect(pad.bbox.height).toBeCloseTo(noPad.bbox.height + 16, 6);
  });
});

describe("FormattedText getSelfRect", () => {
  // Konva.Shape's constructor needs a real canvas (absent in the test env), so
  // exercise the getSelfRect branch via the prototype with a stubbed `this`.
  function stubNode(radius: number, width = 200, height = 40): FormattedText {
    const node = Object.create(FormattedText.prototype) as FormattedText & {
      _curvedLayout: null;
    };
    node._curvedLayout = null;
    Object.assign(node, {
      curveRadius: () => radius,
      curveDirection: () => "up",
      padding: () => 0,
      textRuns: () => runs("CURVED"),
      width: () => width,
      height: () => height,
    });
    return node;
  }

  it("returns the arc bbox when curved and grows with radius", () => {
    const small = stubNode(50).getSelfRect();
    const large = stubNode(150).getSelfRect();

    expect(small.height).toBeGreaterThan(16); // taller than flat glyph
    expect(small.height).toBeGreaterThan(large.height); // tighter radius → bigger box
    expect(small).not.toEqual(large);
  });

  it("flat path is unchanged — getSelfRect is the plain width/height box", () => {
    // radius 0 → identical to Konva's default self rect, no arc math.
    expect(stubNode(0).getSelfRect()).toEqual({ x: 0, y: 0, width: 200, height: 40 });
  });
});
